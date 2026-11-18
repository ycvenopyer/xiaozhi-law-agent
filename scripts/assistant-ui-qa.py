"""Exercise composer research, contracts, news and model selection with mocked services."""
import json
import re
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.qa-artifacts'
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
        assistant.update(content='Mocked answer '+str(len(requests)), status='complete')
        row['revision'] += 1
        events = [dict(type='token',content=assistant['content']),dict(type='saved',record=row),dict(type='done')]
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
    main = page.locator('main')
    assert not page.get_by_role('button',name='Skills',exact=True).count()
    assert not main.get_by_role('button',name='知产新闻',exact=True).count()
    assert not main.locator('select').count(), 'Model picker should remain a button menu'
    for title in ['检索法条','检索案例','合同起草（审核）']:
        assert main.get_by_role('button',name=title,exact=True).count() == 1

    # Model menu, retry, disabled providers and explicit selection remain intact.
    page.get_by_role('button',name='切换模型：选择模型',exact=True).click()
    page.get_by_role('menuitem',name='重新加载').click()
    page.get_by_role('button',name='切换模型：智谱 GLM-4.7',exact=True).click()
    menu = page.get_by_role('menu')
    assert menu.get_by_role('menuitemradio',name='Qwen 27B').get_attribute('aria-disabled') == 'true'
    menu.get_by_role('menuitemradio',name='硅基流动 Qwen3-8B',exact=True).click()
    page.screenshot(path=str(OUT/'assistant-home-desktop.png'),full_page=True)

    # The restored form still respects account opt-out, including article-only queries.
    main.get_by_role('button',name='检索法条',exact=True).click()
    page.get_by_placeholder('条文序号，如：第57条').fill('第57条')
    main.get_by_role('button',name='检索',exact=True).click()
    assert not requests
    page.get_by_role('button',name='云端已同步 · 账号').click()
    page.get_by_label('我允许第三方模型处理工作资料').check()
    page.get_by_role('button',name='关闭',exact=True).click()

    def wait_saved(count):
        page.wait_for_function('() => !document.querySelector(\'button[title="停止生成"]\')')
        page.get_by_role('button',name='切换模型：硅基流动 Qwen3-8B',exact=True).wait_for(state='visible')
        page.wait_for_function('() => [...document.querySelectorAll("button")].some(b => b.getAttribute("aria-label") === "切换模型：硅基流动 Qwen3-8B" && !b.disabled)')
        assert len(requests) == count
        assert requests[-1]['model'] == 'sf-qwen3'
        assert 'skillId' not in requests[-1] and 'skillVersion' not in requests[-1]
        assert any(m.get('content') == 'Mocked answer '+str(count) for row in records.values() if row['kind']=='sessions' for m in row['payload']['messages'])

    main.get_by_role('button',name='检索法条',exact=True).click()
    page.get_by_placeholder('法典名称，如：商标法').fill('商标法')
    page.get_by_placeholder('条文序号，如：第57条').fill('第57条')
    main.get_by_role('button',name='深度',exact=True).click()
    page.screenshot(path=str(OUT/'assistant-statute-form.png'),full_page=True)
    main.get_by_role('button',name='检索',exact=True).click()
    wait_saved(1)
    prompt = requests[-1]['messages'][-1]['content']
    assert all(text in prompt for text in ['商标法','第57条','逐项分析','不提供网页搜索'])

    main.get_by_role('button',name='检索案例',exact=True).click()
    page.get_by_placeholder('案由，如：商标权纠纷').fill('商标权纠纷')
    selects = main.locator('select')
    selects.nth(0).select_option('民事案件')
    selects.nth(1).select_option('二审')
    selects.nth(2).select_option('中级人民法院')
    page.get_by_placeholder('裁判年份，如：2023（可选）').fill('2025')
    main.get_by_role('button',name='快速',exact=True).click()
    main.get_by_role('button',name='检索',exact=True).click()
    wait_saved(2)
    prompt = requests[-1]['messages'][-1]['content']
    assert all(text in prompt for text in ['商标权纠纷','民事案件','二审','中级人民法院','2025','简要说明理由'])

    main.get_by_role('button',name='合同起草（审核）',exact=True).click()
    panel = page.get_by_role('complementary',name='合同起草与审核')
    assert panel.get_by_role('button',name='生成技术开发合同',exact=True).is_disabled()
    panel.get_by_role('button',name='保密',exact=True).click()
    panel.get_by_placeholder('披露方',exact=True).fill('甲公司')
    panel.get_by_placeholder('接收方',exact=True).fill('乙公司')
    panel.get_by_placeholder('关键背景与条款：标的内容 / 地域与期限 / 费用与支付 / 特殊要求…').fill('双方讨论合作研发，技术文档仅用于评估合作。')
    page.screenshot(path=str(OUT/'assistant-contract-desktop.png'),full_page=True)
    panel.get_by_role('button',name='生成保密（不披露）协议',exact=True).click()
    wait_saved(3)
    assert '甲公司' in requests[-1]['messages'][-1]['content']
    panel.get_by_role('button',name='合同审核',exact=True).click()
    assert panel.get_by_role('button',name='开始审查',exact=True).is_disabled()
    panel.get_by_placeholder('将待审核的合同全文粘贴到这里，助理会给出风险与修改建议…（提交前请先手动脱敏）').fill('甲乙双方约定：乙方应对合作中的技术材料保密。')
    panel.get_by_role('button',name='开始审查',exact=True).click()
    wait_saved(4)
    assert '待审核合同文本' in requests[-1]['messages'][-1]['content']
    panel.get_by_role('button',name='关闭合同面板').click()

    page.get_by_role('button',name='事务台',exact=True).click()
    workbench = page.get_by_role('complementary',name='事务台')
    workbench.get_by_role('button',name='知产新闻',exact=True).click()
    assert workbench.get_by_role('button',name='整理知产新闻',exact=True).is_disabled()
    workbench.get_by_label('新闻或公告原文').fill('测试新闻：某机构发布知识产权公告。来源：测试发布平台。日期：2026-11-17。')
    page.screenshot(path=str(OUT/'assistant-news-desktop.png'),full_page=True)
    workbench.get_by_role('button',name='整理知产新闻',exact=True).click()
    wait_saved(5)
    assert '测试新闻' in requests[-1]['messages'][-1]['content']
    assert '不得宣称已获取今日最新新闻' in requests[-1]['messages'][-1]['content']
    workbench.get_by_role('button',name='关闭事务台').click()

    # Mobile layout: each restored control remains in view with no horizontal overflow.
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    for title in ['检索法条','检索案例','合同起草（审核）']:
        box = main.get_by_role('button',name=title,exact=True).bounding_box()
        assert box and box['x'] >= 0 and box['x'] + box['width'] <= 390
    main.get_by_role('button',name='检索案例',exact=True).click()
    page.screenshot(path=str(OUT/'assistant-case-mobile.png'),full_page=True)
    main.get_by_role('button',name='取消',exact=True).click()
    main.get_by_role('button',name='合同起草（审核）',exact=True).click()
    page.screenshot(path=str(OUT/'assistant-contract-mobile.png'),full_page=True)
    assert not errors, errors
    browser.close()
    print('PASS: restored law/case filters, contract draft/review, Workbench news, privacy, cloud persistence, model menu and desktop/mobile; all services mocked')
