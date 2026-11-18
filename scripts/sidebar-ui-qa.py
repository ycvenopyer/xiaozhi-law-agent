"""Sidebar/project flows against synthetic, account-scoped cloud storage."""
import json
from pathlib import Path
from qa_catalog import PUBLIC_CATALOG
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'.qa-artifacts'
OUT.mkdir(exist_ok=True)
SDK = """
export default {init(){return {auth:()=>({
 async getLoginState(){return {user:{uid:'synthetic'}}},
 async getAccessToken(){return {accessToken:'synthetic-token'}},
 async signOut(){}
})}}};
"""

records = {owner:{('settings','privacy'):dict(kind='settings',id='privacy',revision=1,payload=dict(id='privacy',externalModels=True))} for owner in ('account-a','account-b')}
errors = []

def configure(page, owner):
    page.on('pageerror',lambda error: errors.append(str(error)))
    page.route('**/node_modules/.vite/deps/@cloudbase_js-sdk.js*',lambda route:route.fulfill(content_type='application/javascript',body=SDK))
    page.route('**/api/auth/me',lambda route:route.fulfill(json={'id':owner,'email':owner+'@example.test'}))
    page.route('**/api/agent/models',lambda route:route.fulfill(json=[dict(id='zhipu-glm',label='测试模型',available=True,free=True)]))
    def gateway(route):
        if '/rpc/read_public_knowledge' in route.request.url:
            route.fulfill(json=PUBLIC_CATALOG)
            return
        rows = records[owner]
        if '/rpc/put_user_record' in route.request.url:
            body=route.request.post_data_json
            key=(body['p_kind'],body['p_id'])
            old=rows.get(key)
            if body['p_revision'] != (old['revision'] if old else 0):
                route.fulfill(status=409,json={'code':'40001'}); return
            row=dict(kind=key[0],id=key[1],revision=body['p_revision']+1,payload=body['p_payload'])
            rows[key]=row
            route.fulfill(json=row)
        elif '/rpc/delete_user_record' in route.request.url:
            body=route.request.post_data_json
            key=(body['p_kind'],body['p_id'])
            assert rows[key]['revision']==body['p_revision']
            del rows[key]
            route.fulfill(status=204)
        else:
            query=parse_qs(urlparse(route.request.url).query)
            result=list(rows.values())
            for field in ('kind','id'):
                value=query.get(field,[''])[0]
                if value.startswith('eq.'): result=[row for row in result if row[field]==value[3:]]
            route.fulfill(json=result)
    page.route('https://*.api.tcloudbasegateway.com/**',gateway)
    def chat(route):
        body=route.request.post_data_json
        row=records[owner][('sessions',body['conversationId'])]
        message=next(message for message in row['payload']['messages'] if message['id']==body['assistantMessageId'])
        message.update(content='已完成证据分析。',status='complete')
        row['revision']+=1
        events=[dict(type='token',content=message['content']),dict(type='saved',record=row),dict(type='done')]
        route.fulfill(content_type='text/event-stream',body=''.join('data: '+json.dumps(event,ensure_ascii=False)+'\n\n' for event in events))
    page.route('**/api/agent/chat',chat)

def synced(page):
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('button',name='账号菜单',exact=True)).to_be_visible()

def conversation(owner,title):
    return next(row['payload'] for row in records[owner].values() if row['kind']=='sessions' and row['payload']['title']==title)

def project_list(owner):
    return records[owner][('settings','sidebar-projects')]['payload']['projects']

def chat_menu(page,title):
    page.get_by_role('button',name=f'对话“{title}”操作',exact=True).first.click()

def rename_chat(page,old,new):
    chat_menu(page,old)
    page.get_by_role('menuitem',name='重命名',exact=True).click()
    page.get_by_role('dialog').get_by_label('名称',exact=True).fill(new)
    page.get_by_role('dialog').get_by_role('button',name='保存',exact=True).click()
    synced(page)

with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    context=browser.new_context(viewport={'width':1440,'height':1000})
    page=context.new_page();configure(page,'account-a')
    page.goto('http://127.0.0.1:5173')
    page.get_by_text('私人云端空间',exact=True).wait_for();synced(page)
    print('Sidebar controls:',page.get_by_role('complementary').get_by_role('button').all_text_contents())

    page.get_by_role('button',name='知识库',exact=True).click()
    page.get_by_text('公共知识库 158 条 · 我的条目 0 条',exact=False).wait_for()
    assert not page.get_by_title('编辑',exact=True).count()
    page.get_by_role('button',name='新增',exact=True).click()
    page.get_by_placeholder('标题，如：商标法 第五十七条').fill('模拟私有案例')
    page.get_by_label('条目类型').select_option('case')
    page.get_by_placeholder('法条或案例正文……').fill('仅测试账号 A 可见的模拟材料')
    page.get_by_role('button',name='保存',exact=True).click()
    page.get_by_text('公共知识库 158 条 · 我的条目 1 条',exact=False).wait_for()
    page.get_by_role('button',name='关闭知识库',exact=True).click()
    synced(page)
    assert len([row for row in records['account-a'].values() if row['kind']=='knowledge']) == 1
    page.reload(wait_until='networkidle')
    page.get_by_role('button',name='知识库',exact=True).click()
    page.get_by_label('搜索知识库').fill('模拟私有案例')
    page.get_by_text('模拟私有案例',exact=True).wait_for()
    page.get_by_role('button',name='关闭知识库',exact=True).click()

    rename_chat(page,'新对话','欢迎咨询')
    welcome_id=conversation('account-a','欢迎咨询')['id']
    chat_menu(page,'欢迎咨询');page.get_by_role('menuitem',name='置顶',exact=True).click();synced(page)
    expect(page.get_by_role('region',name='置顶对话').get_by_role('button',name='打开对话：欢迎咨询',exact=True)).to_be_visible()
    assert conversation('account-a','欢迎咨询')['pinnedAt']>0
    page.reload();page.get_by_text('私人云端空间',exact=True).wait_for();synced(page)
    expect(page.get_by_role('region',name='置顶对话').get_by_role('button',name='打开对话：欢迎咨询',exact=True)).to_be_visible()
    chat_menu(page,'欢迎咨询');page.get_by_role('menuitem',name='取消置顶',exact=True).click();synced(page)
    assert not conversation('account-a','欢迎咨询').get('pinnedAt')

    page.get_by_role('button',name='新建项目',exact=True).click()
    page.get_by_role('dialog').get_by_label('名称',exact=True).fill('专利侵权')
    page.get_by_role('dialog').get_by_role('button',name='创建项目',exact=True).click();synced(page)
    patent_id=project_list('account-a')[0]['id']
    page.get_by_role('heading',name='专利侵权',exact=True).wait_for()
    page.get_by_role('button',name='在项目中新建对话',exact=True).click();synced(page)
    rename_chat(page,'新对话','证据分析')
    evidence_id=conversation('account-a','证据分析')['id']
    assert conversation('account-a','证据分析')['projectId']==patent_id
    page.locator('main textarea').fill('帮我分析已提供的证据。')
    page.get_by_role('button',name='发送',exact=True).click()
    page.get_by_text('已完成证据分析。',exact=True).wait_for();synced(page)
    assert conversation('account-a','证据分析')['titleEdited'] is True
    assert conversation('account-a','证据分析')['messages'][-1]['content']=='已完成证据分析。'

    chat_menu(page,'欢迎咨询')
    page.get_by_role('menuitem',name='移至项目',exact=True).hover()
    page.get_by_role('menuitem',name='专利侵权',exact=True).click();synced(page)
    assert conversation('account-a','欢迎咨询')['projectId']==patent_id
    page.get_by_role('button',name='打开项目：专利侵权',exact=True).click();synced(page)
    page.get_by_role('heading',name='专利侵权',exact=True).wait_for()
    page.screenshot(path=str(OUT/'projects-overview-desktop.png'),full_page=True)

    page.get_by_role('button',name='项目“专利侵权”操作',exact=True).click()
    page.get_by_role('menuitem',name='重命名项目',exact=True).click()
    page.get_by_role('dialog').get_by_label('名称',exact=True).fill('专利项目')
    page.get_by_role('dialog').get_by_role('button',name='保存',exact=True).click();synced(page)
    assert project_list('account-a')[0]['name']=='专利项目'
    chat_menu(page,'证据分析');page.get_by_role('menuitem',name='置顶',exact=True).click();synced(page)
    chat_menu(page,'欢迎咨询');page.get_by_role('menuitem',name='移至项目',exact=True).hover()
    page.get_by_role('menuitem',name='普通对话',exact=True).click();synced(page)
    assert not conversation('account-a','欢迎咨询').get('projectId')

    chat_menu(page,'欢迎咨询');page.get_by_role('menuitem',name='移至项目',exact=True).hover()
    page.get_by_role('menuitem',name='新建项目…',exact=True).click()
    page.get_by_role('dialog').get_by_label('名称',exact=True).fill('商标项目')
    page.get_by_role('dialog').get_by_role('button',name='创建项目',exact=True).click();synced(page)
    trademark_id=next(project['id'] for project in project_list('account-a') if project['name']=='商标项目')
    assert conversation('account-a','欢迎咨询')['projectId']==trademark_id
    page.reload();page.get_by_role('heading',name='商标项目',exact=True).wait_for();synced(page)
    assert records['account-a'][('settings','privacy')]['payload']['externalModels'] is True
    page.get_by_role('button',name='打开对话：证据分析',exact=True).first.click();synced(page)
    chat_menu(page,'证据分析')
    menu=page.get_by_role('menu').first
    assert set(menu.get_by_role('menuitem').all_text_contents())=={'重命名','取消置顶','移至项目','删除'}
    menu.evaluate('(element)=>Promise.all(element.getAnimations({subtree:true}).map(animation=>animation.finished))')
    page.screenshot(path=str(OUT/'conversation-menu-desktop.png'),full_page=True)
    page.keyboard.press('Escape')

    # A clean browser gets the same account's projects from the cloud, not localStorage.
    fresh_context=browser.new_context(viewport={'width':1200,'height':900})
    fresh=fresh_context.new_page();configure(fresh,'account-a')
    fresh.goto('http://127.0.0.1:5173');fresh.get_by_text('私人云端空间',exact=True).wait_for();synced(fresh)
    expect(fresh.get_by_role('button',name='打开项目：专利项目',exact=True)).to_be_visible()
    expect(fresh.get_by_role('region',name='置顶对话').get_by_role('button',name='打开对话：证据分析',exact=True)).to_be_visible()
    fresh_context.close()

    page.get_by_role('button',name='项目“专利项目”操作',exact=True).click()
    page.get_by_role('menuitem',name='删除项目',exact=True).click()
    page.get_by_role('dialog').get_by_text('项目中的对话会移回普通对话列表，内容保留。',exact=True).wait_for()
    page.get_by_role('dialog').get_by_role('button',name='确认删除',exact=True).click();synced(page)
    assert not conversation('account-a','证据分析').get('projectId')
    assert conversation('account-a','证据分析')['messages'][-1]['content']=='已完成证据分析。'
    chat_menu(page,'欢迎咨询');page.get_by_role('menuitem',name='删除',exact=True).click()
    page.get_by_role('dialog').get_by_role('button',name='取消',exact=True).click()
    assert ('sessions',welcome_id) in records['account-a']
    chat_menu(page,'欢迎咨询');page.get_by_role('menuitem',name='删除',exact=True).click()
    page.get_by_role('dialog').get_by_role('button',name='确认删除',exact=True).click();synced(page)
    assert ('sessions',welcome_id) not in records['account-a']

    # Separate account: no projects from account A; deleting the last chat stays deleted.
    other_context=browser.new_context(viewport={'width':1200,'height':900})
    other=other_context.new_page();configure(other,'account-b')
    other.goto('http://127.0.0.1:5173');other.get_by_text('私人云端空间',exact=True).wait_for();synced(other)
    other.get_by_role('button',name='知识库',exact=True).click()
    other.get_by_text('公共知识库 158 条 · 我的条目 0 条',exact=False).wait_for()
    other.get_by_label('搜索知识库').fill('模拟私有案例')
    assert not other.get_by_text('模拟私有案例',exact=True).count()
    other.get_by_role('button',name='关闭知识库',exact=True).click()
    assert not other.get_by_role('button',name='打开项目：商标项目',exact=True).count()
    old_ids={row['id'] for row in records['account-b'].values() if row['kind']=='sessions'}
    chat_menu(other,'新对话');other.get_by_role('menuitem',name='删除',exact=True).click()
    other.get_by_role('dialog').get_by_role('button',name='确认删除',exact=True).click();synced(other)
    assert not any(('sessions',id) in records['account-b'] for id in old_ids)
    other.reload();other.get_by_text('私人云端空间',exact=True).wait_for();synced(other)
    assert not any(('sessions',id) in records['account-b'] for id in old_ids)
    assert ('sessions',evidence_id) in records['account-a']
    other_context.close()

    page.set_viewport_size({'width':390,'height':844})
    expect(page.get_by_role('complementary')).not_to_be_visible()
    page.get_by_role('button',name='展开侧边栏',exact=True).click()
    expect(page.get_by_role('complementary')).to_be_visible()
    page.screenshot(path=str(OUT/'sidebar-mobile.png'),full_page=True)
    page.get_by_role('button',name='打开项目：商标项目',exact=True).click()
    expect(page.get_by_role('complementary')).not_to_be_visible()
    page.get_by_role('heading',name='商标项目',exact=True).wait_for()
    assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
    page.screenshot(path=str(OUT/'project-mobile.png'),full_page=True)
    assert not errors,errors
    print('PASS: rename/pin/delete/move, project creation/rename/removal/new chats, cloud reload, fresh browser, account separation, last deletion, mobile; synthetic services only')
    browser.close()
