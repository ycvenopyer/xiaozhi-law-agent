"""Exercise the Skills UI with synthetic auth, storage and model responses."""
import json
import re
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.qa-artifacts'
OUT.mkdir(exist_ok=True)
catalog_text = (ROOT/'shared/skill-catalog.generated.ts').read_text(encoding='utf-8')
catalog = json.loads(re.search(r'export const SKILL_CATALOG = (\[[\s\S]*?\]) as const;',catalog_text).group(1))
prepared = {}
for skill in catalog:
    directory = ROOT/'agent-skills'/skill['id']
    resources = json.loads((directory/'resources.json').read_text(encoding='utf-8'))
    prompt = (directory/'SKILL.md').read_text(encoding='utf-8').split('---',2)[2].strip()
    prompt += '\n\n' + '\n\n'.join(resource['path']+'\n'+(directory/resource['path']).read_text(encoding='utf-8') for resource in resources if resource['load']=='on-activation')
    prepared[skill['id']] = dict(id=skill['id'],name=skill['name'],version=skill['version'],prompt=prompt,resources=resources)
SDK = """
export default {init(){return {auth:()=>({
  async getLoginState(){return {user:{uid:'qa-user'}}},
  async getAccessToken(){return {accessToken:'qa-token'}},
  async signOut(){}
})}}};
"""

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    context = browser.new_context(viewport={'width':1440,'height':1000})
    page = context.new_page()
    errors, requests, records = [], [], {}
    held_chats = []
    hold_chat = False
    model_loads = []
    skill_preparations = []
    models = [
        dict(id='zhipu-glm',label='智谱 GLM-4.7',provider='智谱 AI',available=True,free=True,vision=False),
        dict(id='zhipu-vision',label='智谱 GLM-4.6V-Flash',provider='智谱 AI',available=True,free=True,vision=True),
        dict(id='sf-qwen3',label='硅基流动 Qwen3-8B',provider='SiliconFlow',available=True,free=True,vision=False),
        dict(id='qwen-free',label='Qwen 27B',provider='OpenRouter',available=False,free=True,vision=True),
    ]
    page.on('pageerror', lambda error: errors.append(str(error)))

    def gateway(route):
        if '/rpc/put_user_record' in route.request.url:
            body = route.request.post_data_json
            key = (body['p_kind'], body['p_id'])
            row = dict(kind=body['p_kind'],id=body['p_id'],payload=body['p_payload'],revision=body['p_revision']+1)
            records[key] = row
            route.fulfill(json=row)
        elif '/rpc/delete_user_record' in route.request.url:
            body = route.request.post_data_json
            records.pop((body['p_kind'],body['p_id']),None)
            route.fulfill(status=204)
        else:
            query = parse_qs(urlparse(route.request.url).query)
            rows = list(records.values())
            for field in ('kind','id'):
                if field in query and query[field][0].startswith('eq.'):
                    rows = [row for row in rows if row[field] == query[field][0][3:]]
            route.fulfill(json=rows)

    def chat(route):
        if hold_chat:
            held_chats.append(route)
            return
        body = route.request.post_data_json
        requests.append(body)
        row = records[('sessions', body['conversationId'])]
        assistant = next(message for message in row['payload']['messages'] if message['id'] == body['assistantMessageId'])
        assistant.update(content='合同草稿测试内容', status='complete', skillIds=[body['skillId']])
        row['revision'] += 1
        events = [dict(type='skill',id=body['skillId'],name='合同起草'),dict(type='token',content=assistant['content']),dict(type='saved',record=row),dict(type='done')]
        route.fulfill(content_type='text/event-stream',body=''.join('data: '+json.dumps(event,ensure_ascii=False)+'\n\n' for event in events))

    page.route('**/node_modules/.vite/deps/@cloudbase_js-sdk.js*',lambda route: route.fulfill(content_type='application/javascript',body=SDK))
    page.route('https://*.api.tcloudbasegateway.com/**',gateway)
    page.route('**/api/auth/me',lambda route: route.fulfill(json={'id':'qa-user','email':'qa@example.test'}))
    def list_models(route):
        model_loads.append(route.request.url)
        if len(model_loads) == 1:
            route.fulfill(status=503,json={'message':'synthetic temporary failure'})
        else:
            route.fulfill(json=models)

    page.route('**/api/agent/models',list_models)
    def prepare_prompt(route):
        skill_id = urlparse(route.request.url).path.split('/')[-2]
        skill_preparations.append(skill_id)
        if skill_id == 'ip-news' and skill_preparations.count(skill_id) == 1:
            route.fulfill(status=503,json={'message':'synthetic prompt load failure'})
        else:
            assert parse_qs(urlparse(route.request.url).query)['version'][0] == prepared[skill_id]['version']
            route.fulfill(json=prepared[skill_id])

    page.route('**/api/agent/skills/*/prompt?*',prepare_prompt)
    page.route('**/api/agent/chat',chat)
    page.goto('http://127.0.0.1:5173')
    try:
        page.get_by_text('私人云端空间',exact=True).wait_for(timeout=10000)
    except Exception:
        print('Initial page:',page.locator('body').inner_text()[:1000], 'Errors:',errors)
        page.screenshot(path=str(OUT/'model-picker-initial-error.png'),full_page=True)
        raise
    page.wait_for_load_state('networkidle')
    print('Rendered controls:', page.get_by_role('button').all_text_contents())
    for title in ('检索案例','合同起草','知产新闻','检索法条'):
        assert not page.locator('main').get_by_role('button',name=re.compile('^'+title)).count(), 'Removed home Skill cards remain'
    assert page.locator('main select').count() == 0, 'Old header model select remains'
    page.get_by_role('button',name='切换模型：选择模型',exact=True).click()
    page.get_by_role('menu').get_by_role('alert').wait_for()
    page.get_by_role('menuitem',name='重新加载').click()
    page.get_by_role('button',name='切换模型：智谱 GLM-4.7',exact=True).wait_for()
    assert len(model_loads) == 2
    page.get_by_role('button',name='切换模型：智谱 GLM-4.7',exact=True).click()
    menu = page.get_by_role('menu')
    assert menu.get_by_role('menuitemradio',name='Qwen 27B').get_attribute('aria-disabled') == 'true'
    assert menu.get_by_text('图片',exact=True).count() == 1
    menu.evaluate('(element) => Promise.all(element.getAnimations({subtree:true}).map(animation => animation.finished))')
    page.screenshot(path=str(OUT/'model-picker-desktop.png'),full_page=True)
    menu.get_by_role('menuitemradio',name='硅基流动 Qwen3-8B',exact=True).click()
    page.get_by_role('button',name='切换模型：硅基流动 Qwen3-8B',exact=True).wait_for()
    assert page.evaluate("localStorage.getItem('agent-model')") == 'sf-qwen3'
    page.screenshot(path=str(OUT/'skills-home-desktop.png'),full_page=True)
    editor = page.locator('main textarea')
    draft = '请分析我提供的材料，并列出还需补充的信息。'
    editor.fill(draft)
    page.get_by_role('button',name='Skills',exact=True).click()
    dialog = page.get_by_role('dialog')
    dialog.get_by_role('heading',name='为这次任务，选一项专长').wait_for()
    assert dialog.get_by_role('button').count() == 5  # four skills + accessible close
    dialog.evaluate('(element) => Promise.all(element.getAnimations({subtree:true}).map(animation => animation.finished))')
    page.screenshot(path=str(OUT/'skills-picker-desktop.png'),full_page=True)
    dialog.get_by_role('button',name='知产新闻').click()
    page.get_by_role('button',name='重试加载',exact=True).wait_for()
    assert page.get_by_role('button',name='发送',exact=True).is_disabled()
    assert editor.input_value() == draft
    page.get_by_role('button',name='重试加载',exact=True).click()
    page.get_by_text('已加载 · 知产新闻',exact=False).wait_for()
    assert skill_preparations.count('ip-news') == 2
    assert not requests, 'Selecting a Skill called a model'
    page.locator('summary').filter(has_text='查看已加载提示词').click()
    prompt = page.get_by_label('已加载的技能提示词')
    assert '资讯核验与分类' in prompt.inner_text() and '知产简报模板' in prompt.inner_text()
    assert editor.input_value() == draft
    page.screenshot(path=str(OUT/'skill-prompt-preview-desktop.png'),full_page=True)
    page.get_by_role('button',name='取消本次技能').click()
    assert not page.get_by_label('已加载的技能提示词').count()
    assert editor.input_value() == draft
    page.get_by_role('button',name='Skills',exact=True).click()
    page.get_by_role('dialog').get_by_role('button',name='合同起草').click()
    page.get_by_text('已加载 · 合同起草',exact=False).wait_for()
    assert editor.input_value() == draft
    page.locator('summary').filter(has_text='查看已加载提示词').click()
    assert '合同工作底稿' in page.get_by_label('已加载的技能提示词').inner_text()
    page.locator('summary').filter(has_text='查看已加载提示词').click()
    page.get_by_role('button',name='发送',exact=True).click()
    assert not requests, 'Skill bypassed disabled model consent'
    assert editor.input_value() == draft, 'Opt-out lost the draft'
    page.get_by_role('button',name='云端已同步 · 账号').click()
    page.get_by_label('我允许第三方模型处理工作资料').check()
    page.get_by_role('button',name='关闭',exact=True).click()
    page.wait_for_load_state('networkidle')
    editor.fill('请起草保密协议，甲方为披露方，其他事项待补充。')
    hold_chat = True
    page.get_by_role('button',name='发送',exact=True).click()
    page.get_by_role('button',name='停止生成').wait_for()
    assert page.get_by_role('button',name='切换模型：硅基流动 Qwen3-8B',exact=True).is_disabled()
    page.wait_for_function("() => document.querySelector('button[title=\"停止生成\"]') !== null")
    # Let the browser dispatch the request while the mocked response is held.
    page.wait_for_timeout(100)
    assert held_chats
    hold_chat = False
    chat(held_chats.pop())
    page.get_by_text('合同草稿测试内容',exact=True).wait_for()
    assert requests[-1]['model'] == 'sf-qwen3'
    assert requests[-1]['skillId'] == 'contract-drafting'
    assert requests[-1]['skillVersion'] == prepared['contract-drafting']['version']
    assert 'skillPrompt' not in requests[-1], 'Client-authored instructions should not be trusted'
    assert any(message.get('skillIds') == ['contract-drafting'] for row in records.values() if row['kind']=='sessions' for message in row['payload']['messages'])
    assert not page.get_by_role('button',name='取消本次技能').count(), 'Selection leaked into next turn'
    page.screenshot(path=str(OUT/'skills-answer-desktop.png'),full_page=True)
    editor.fill('/skills')
    editor.press('Enter')
    page.get_by_role('dialog').wait_for()
    page.keyboard.press('Escape')
    page.set_viewport_size({'width':390,'height':844})
    page.get_by_role('button',name='切换模型：硅基流动 Qwen3-8B',exact=True).click()
    menu = page.get_by_role('menu')
    menu.evaluate('(element) => Promise.all(element.getAnimations({subtree:true}).map(animation => animation.finished))')
    page.screenshot(path=str(OUT/'model-picker-mobile.png'),full_page=True)
    bounds = menu.bounding_box()
    assert bounds and bounds['x'] >= 0 and bounds['x'] + bounds['width'] <= 390
    page.keyboard.press('Escape')
    page.get_by_role('button',name='Skills',exact=True).click()
    page.get_by_role('dialog').wait_for()
    page.get_by_role('dialog').evaluate('(element) => Promise.all(element.getAnimations({subtree:true}).map(animation => animation.finished))')
    page.screenshot(path=str(OUT/'skills-picker-mobile.png'),full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    page.keyboard.press('Escape')
    assert not errors, errors
    print('PASS: model picker/retry/switch/disabled state, Skills, opt-out, chat/persistence, desktop/mobile; mocked services only')
    browser.close()
