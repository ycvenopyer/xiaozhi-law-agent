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
    context.add_init_script("if (!localStorage.getItem('agent-model:qa-user')) localStorage.setItem('agent-model:qa-user', 'sf-qwen3')")
    page = context.new_page()
    page.set_default_timeout(8000)
    errors, requests, records = [], [], {}
    held_chats = []
    hold_chat = False
    model_loads = []
    models = [
        dict(id='zhipu-glm',label='智谱 GLM-4.7',provider='智谱 AI',available=True,free=True,vision=False),
        dict(id='zhipu-vision',label='智谱 GLM-4.6V-Flash',provider='智谱 AI',available=True,free=True,vision=True),
        dict(id='zhipu-air',label='智谱 GLM-4.5-Air',provider='智谱 AI',available=True,free=True,vision=False),
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
        if len(requests) == 6:
            assistant['content'] += '\n\n' + '\n\n'.join(f'模拟长回答第 {line} 段' for line in range(60)) + '\n\n长对话末尾'
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

    # Retry the catalogue, replace the retired selection, and select another Zhipu model.
    page.get_by_role('button',name='切换模型：选择模型',exact=True).click()
    page.get_by_role('menuitem',name='重新加载').click()
    page.get_by_role('menu').wait_for(state='hidden')
    page.get_by_role('button',name='切换模型：智谱 GLM-4.7',exact=True).click()
    menu = page.get_by_role('menu')
    assert menu.get_by_role('menuitemradio').count() == len(models)
    menu.get_by_role('menuitemradio',name='智谱 GLM-4.5-Air',exact=True).click()
    page.screenshot(path=str(OUT/'assistant-home-desktop.png'),full_page=True)

    # The restored form still respects account opt-out, including article-only queries.
    main.get_by_role('button',name='检索法条',exact=True).click()
    page.get_by_placeholder('条文序号，如：第57条').fill('第57条')
    main.get_by_role('button',name='检索',exact=True).click()
    assert not requests
    page.get_by_role('button',name='账号菜单').click()
    page.get_by_role('menuitem', name='设置', exact=True).click()
    page.get_by_label('我允许第三方模型处理工作资料').check()
    page.get_by_role('button',name='关闭',exact=True).click()

    def wait_saved(count):
        page.wait_for_function('() => !document.querySelector(\'button[title="停止生成"]\')')
        page.get_by_role('button',name='切换模型：智谱 GLM-4.5-Air',exact=True).wait_for(state='visible')
        page.wait_for_function('() => [...document.querySelectorAll("button")].some(b => b.getAttribute("aria-label") === "切换模型：智谱 GLM-4.5-Air" && !b.disabled)')
        assert len(requests) == count
        assert requests[-1]['model'] == 'zhipu-air'
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
    assert not workbench.get_by_role('button',name='期限台账',exact=True).count()
    assert not workbench.get_by_role('button',name='利益冲突',exact=True).count()
    assert workbench.get_by_role('button',name='检索今日新闻',exact=True).is_disabled()
    workbench.get_by_role('button',name='关闭事务台').click()
    page.get_by_role('button',name='账号菜单').click()
    page.get_by_role('menuitem',name='设置',exact=True).click()
    page.get_by_role('button',name='联网搜索',exact=True).click()
    search_key = page.get_by_label('Tavily API Key',exact=True)
    assert search_key.get_attribute('type') == 'password'
    search_key.fill('synthetic-tavily-key')
    page.get_by_role('button',name='保存 Key',exact=True).click()
    page.get_by_role('status').filter(has_text='当前标签页已保存 API Key').wait_for()
    assert search_key.input_value() == ''
    assert 'synthetic-tavily-key' not in page.evaluate('JSON.stringify(localStorage)')
    assert 'synthetic-tavily-key' not in repr(records)
    page.screenshot(path=str(OUT/'search-settings-desktop.png'),animations='disabled')
    page.get_by_role('button',name='关闭',exact=True).click()
    page.get_by_role('button',name='事务台',exact=True).click()
    def news(route):
        assert route.request.post_data_json == {'apiKey': 'synthetic-tavily-key'}
        route.fulfill(json={'date':'2026-11-18','articles':[
            {'title':'今日专利公告','url':'https://example.test/latest','source':'示例来源','summary':'示例摘要'}
        ]})
    page.route('**/api/agent/ip-news', news)
    workbench.get_by_role('button',name='检索今日新闻',exact=True).click()
    article = workbench.get_by_role('link',name='今日专利公告')
    assert article.get_attribute('href') == 'https://example.test/latest'
    assert len(requests) == 4
    page.screenshot(path=str(OUT/'assistant-news-desktop.png'),full_page=True)
    workbench.get_by_role('button',name='文件起草',exact=True).click()
    workbench.locator('textarea:visible').fill('请发送本周商标案件的进展摘要。')
    workbench.get_by_role('button',name='生成邮件草稿',exact=True).click()
    wait_saved(5)
    workbench.get_by_role('button',name='关闭事务台').click()

    assert not main.get_by_role('button', name='卷宗', exact=True).count()
    assert not main.get_by_role('button', name='卷宗上传', exact=True).count()
    account = page.get_by_role('button', name='账号菜单')
    assert account.bounding_box()['y'] > 900
    account.click()
    page.screenshot(path=str(OUT/'account-menu-desktop.png'), animations='disabled')
    page.get_by_role('menuitem', name='帮助', exact=True).click()
    page.get_by_role('dialog', name='帮助').get_by_text('配置自己的模型', exact=True).wait_for()
    page.get_by_role('button', name='关闭', exact=True).click()
    account.click()
    page.get_by_role('menuitem', name='设置', exact=True).click()
    page.get_by_role('button', name='联网搜索', exact=True).click()
    page.get_by_role('button', name='移除 Key', exact=True).click()
    assert page.evaluate("sessionStorage.getItem('xiaozhi-tavily-key:qa-user')") is None
    page.get_by_role('button', name='界面外观', exact=True).click()
    page.get_by_role('dialog', name='设置').get_by_text('配色方案', exact=True).wait_for()
    page.get_by_role('button', name='关闭', exact=True).click()

    connections = []
    def test_connection(route):
        connections.append(route.request.post_data_json)
        route.fulfill(json={'ok': True})
    page.route('**/api/agent/custom-model/test', test_connection)

    def open_custom(label):
        picker = page.get_by_role('button', name='切换模型：'+label, exact=True)
        picker.click()
        page.get_by_role('menuitem', name='自定义模型', exact=True).click()
        return page.get_by_role('dialog', name=re.compile('^(添加模型|编辑模型|自定义模型)$'))

    custom = open_custom('智谱 GLM-4.5-Air')
    supplier = custom.get_by_label('供应商', exact=True)
    assert supplier.locator('option').all_text_contents() == [
        '智谱 AI','DeepSeek','月之暗面','腾讯混元','阿里千问','小米 MiMo','阶跃星辰','自定义供应商']
    page.screenshot(path=str(OUT/'custom-model-preset-desktop.png'), animations='disabled')
    page.set_viewport_size({'width':390,'height':844})
    model_bounds = custom.bounding_box()
    assert model_bounds and model_bounds['x'] >= 0 and model_bounds['x'] + model_bounds['width'] <= 390
    assert custom.get_by_role('button', name='保存', exact=True).is_visible()
    page.screenshot(path=str(OUT/'custom-model-preset-mobile.png'), animations='disabled')
    page.set_viewport_size({'width':1440,'height':1000})
    supplier.select_option('DeepSeek')
    assert custom.get_by_label('模型名称', exact=True).input_value() == 'deepseek-flash'
    custom.get_by_text('高级选项', exact=True).click()
    assert custom.get_by_label('Base URL').input_value() == 'https://api.deepseek.com'
    custom.get_by_label('模型名称', exact=True).select_option('')
    custom.get_by_label('模型 ID', exact=True).fill('manual-model')
    supplier.select_option('')
    custom.get_by_label('厂商名称').fill('测试厂商')
    custom.get_by_label('Base URL').fill('https://api.example.test/v1/chat/completions')
    custom.get_by_label('API Key', exact=True).fill('synthetic-user-key')
    custom.get_by_label('模型 ID').fill('test-model')
    custom.get_by_role('button', name='显示 API Key', exact=True).click()
    assert custom.get_by_label('API Key', exact=True).get_attribute('type') == 'text'
    custom.get_by_role('button', name='隐藏 API Key', exact=True).click()
    custom.get_by_text('高级选项', exact=True).click()
    custom.get_by_label('显示名称').fill('测试模型')
    custom.get_by_label('支持图片输入').check()
    page.screenshot(path=str(OUT/'custom-model-desktop.png'), animations='disabled')
    custom.get_by_role('button', name='测试连接').click()
    custom.get_by_role('status').filter(has_text='连通测试通过').wait_for()
    assert connections == [dict(baseUrl='https://api.example.test/v1', model='test-model',
                                apiKey='synthetic-user-key', vision=True, tools=False)]
    custom.get_by_role('button', name='保存', exact=True).click()
    page.keyboard.press('Escape')
    custom.wait_for(state='hidden')
    page.reload(wait_until='networkidle')
    page.get_by_role('button', name='切换模型：测试模型', exact=True).wait_for()
    main.locator('textarea').fill('使用自定义模型生成测试回答')
    main.get_by_role('button', name='发送', exact=True).click()
    page.get_by_text('Mocked answer 6', exact=True).wait_for()
    scroll_area = page.locator('[aria-label="对话消息"]')
    at_end = 'el => el.scrollHeight - el.clientHeight - el.scrollTop < 2'
    scroll_area.scroll_into_view_if_needed()
    scroll_area.evaluate('el => el.scrollTop = 0')
    page.get_by_role('button', name='跳到底部').click()
    assert scroll_area.evaluate(at_end)
    assert scroll_area.get_by_text('长对话末尾', exact=True).is_visible()
    page.get_by_role('button',name='搜索对话',exact=True).click()
    search = page.get_by_role('dialog',name='搜索对话')
    search.get_by_role('searchbox').fill('长对话末尾')
    search.get_by_role('status').filter(has_text='1 条匹配').wait_for()
    search.get_by_role('button', name=re.compile('长对话末尾')).click()
    search.wait_for(state='hidden')
    assert requests[-1]['model'].startswith('custom-')
    assert requests[-1]['customModel'] == connections[0]
    assert 'synthetic-user-key' not in json.dumps(list(records.values()))
    assert 'synthetic-user-key' not in page.evaluate('JSON.stringify(localStorage)')
    custom = open_custom('测试模型')
    custom.get_by_role('button', name='编辑 测试模型').click()
    custom.get_by_label('Base URL').fill('https://other.example.test/v1')
    custom.get_by_role('button', name='保存', exact=True).click()
    custom.get_by_role('alert').filter(has_text='重新填写 Key').wait_for()
    custom.get_by_role('button', name='返回模型列表').click()
    page.once('dialog', lambda dialog: dialog.accept())
    custom.get_by_role('button', name='删除 测试模型').click()
    custom.get_by_role('button', name='添加模型').wait_for()
    page.keyboard.press('Escape')
    custom.wait_for(state='hidden')

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
    page.get_by_role('button', name='关闭合同面板').click()
    page.get_by_role('button', name='展开侧边栏').click()
    account.click()
    page.get_by_role('menuitem', name='设置', exact=True).click()
    settings = page.get_by_role('dialog', name='设置')
    bounds = settings.bounding_box()
    assert bounds and bounds['x'] >= 0 and bounds['x'] + bounds['width'] <= 390
    settings.get_by_role('button', name='界面外观', exact=True).click()
    settings.get_by_text('配色方案', exact=True).wait_for()
    page.screenshot(path=str(OUT/'account-settings-mobile.png'), animations='disabled')
    assert not errors, errors
    browser.close()
    print('PASS: account menu and mobile settings, custom model configuration and sending, privacy, cloud persistence, research, contracts and news; all services mocked')
