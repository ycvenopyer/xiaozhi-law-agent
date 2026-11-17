"""Exercise the Skills UI with synthetic auth, storage and model responses."""
import json
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[1] / '.qa-artifacts'
OUT.mkdir(exist_ok=True)
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
    page.get_by_role('button',name='Skills',exact=True).click()
    dialog = page.get_by_role('dialog')
    dialog.get_by_role('heading',name='为这次任务，选一项专长').wait_for()
    assert dialog.get_by_role('button').count() == 5  # four skills + accessible close
    dialog.evaluate('(element) => Promise.all(element.getAnimations({subtree:true}).map(animation => animation.finished))')
    page.screenshot(path=str(OUT/'skills-picker-desktop.png'),full_page=True)
    dialog.get_by_role('button',name='知产新闻').click()
    editor = page.locator('main textarea')
    assert editor.input_value().startswith('$ip-news ')
    page.get_by_role('button',name='取消本次技能').click()
    assert not editor.input_value().startswith('$')
    page.get_by_role('button',name='Skills',exact=True).click()
    page.get_by_role('dialog').get_by_role('button',name='合同起草').click()
    assert editor.input_value().startswith('$contract-drafting ')
    page.get_by_role('button',name='发送',exact=True).click()
    assert not requests, 'Skill bypassed disabled model consent'
    assert editor.input_value().startswith('$contract-drafting '), 'Opt-out lost the draft'
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
