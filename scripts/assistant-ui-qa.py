"""Exercise composer research, contracts, news and model selection with mocked services."""
import json
import re
from pathlib import Path
from qa_catalog import PUBLIC_CATALOG
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
        if '/rpc/read_public_knowledge' in route.request.url:
            route.fulfill(json=PUBLIC_CATALOG)
            return
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
    guide = page.get_by_role('dialog', name='首次使用设置')
    guide.get_by_role('button', name='下一步').click()
    guide.get_by_label('Tavily API Key', exact=True).wait_for()
    guide.get_by_role('button', name='完成引导').click()
    guide.wait_for(state='hidden')
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
    for title in ['检索对比','侵权识别','合规提示','知产文书','合同起草（审核）']:
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

    main.locator('textarea').fill('模拟咨询')
    main.get_by_role('button', name='发送', exact=True).click()
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

    for count in (1, 2):
        main.locator('textarea').fill('模拟咨询 ' + str(count))
        main.get_by_role('button', name='发送', exact=True).click()
        wait_saved(count)

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

    # Import files through the composer, including a real PDF text layer and a scanned page.
    fixture_page = context.new_page()
    fixture_page.set_content('<p>Public sample project</p>')
    pdf_bytes = fixture_page.pdf()
    png_bytes = fixture_page.screenshot()
    import base64
    fixture_page.set_content('<img src="data:image/png;base64,' + base64.b64encode(png_bytes).decode() + '">')
    scan_bytes = fixture_page.pdf()
    fixture_page.close()
    fields = {
        'compare': ('著作权材料比对', '权利或作品材料 A', '检索对比'),
        'infringement': ('商标侵权', '权利基础、登记号或底稿', '侵权识别'),
        'compliance': ('开源许可证', '组件、版本与许可证原文', '合规提示'),
        'draft': ('保密协议（NDA）', '当事人及角色', '知产文书'),
    }
    received = []
    def prefill(route):
        data = route.request.post_data_json
        received.append(data)
        task, label, _ = fields[data['mode']]
        route.fulfill(json={'task':task,'values':{label:'公开示例'}})
    page.route('**/api/agent/prefill', prefill)
    page.route('**/api/agent/files', lambda route: route.fulfill(json={'text':'示例文本','truncated':False}))
    for mode, (name, mime, data) in zip(fields, [
        ('sample.pdf','application/pdf',pdf_bytes), ('scan.pdf','application/pdf',scan_bytes),
        ('material.png','image/png',png_bytes), ('example.md','text/markdown',b'sample')
    ]):
        main.get_by_role('button',name='上传文件填表').click()
        dialog = page.get_by_role('dialog',name='上传文件填表')
        dialog.locator('input[type=file]').set_input_files({'name':name,'mimeType':mime,'buffer':data})
        task, label, destination = fields[mode]
        dialog.get_by_role('button', name=destination, exact=True).click()
        form = page.get_by_role('complementary',name=destination,exact=True)
        try:
            form.get_by_label(label,exact=True).wait_for(timeout=18000)
        except Exception:
            print('Import failed', mode, 'model requests:', len(received), 'dialog:', dialog.inner_text() if dialog.count() else 'closed', 'visible panel:', page.locator('aside[aria-label]:visible').all_inner_texts()[-1][:500], 'errors:', errors, flush=True)
            raise
        assert form.get_by_label(destination+'事项').input_value() == task
        assert form.get_by_label(label,exact=True).input_value() == '公开示例'
        form.get_by_label(label,exact=True).fill('人工修改')
        if mode == 'compare':
            assert 'Public sample project' in received[-1]['text']
        if mode in ('infringement','compliance'):
            assert received[-1]['images'][0].startswith('data:image/jpeg;base64,')
        assert not form.get_by_role('checkbox',name=re.compile('^我已脱敏')).is_checked()
        form.get_by_role('button',name='关闭'+destination).click()

    def open_workflow(name):
        main.get_by_role('button', name=name, exact=True).click()
        return page.get_by_role('complementary', name=name, exact=True)
    for scenario in ['检索对比','侵权识别','合规提示','知产文书']:
        workbench = open_workflow(scenario)
        workbench.get_by_label(scenario+'事项').wait_for()
        if scenario != '知产文书':
            workbench.get_by_role('button', name='关闭'+scenario).click()
    workbench.get_by_label('知产文书事项').select_option('保密协议（NDA）')
    workbench.get_by_label('当事人及角色',exact=True).fill('公开示例：甲方委托乙方测试。')
    send_report = workbench.get_by_role('button',name='生成文书初稿',exact=True)
    assert send_report.is_disabled()
    workbench.get_by_role('checkbox',name=re.compile('^我已脱敏')).check()
    send_report.click()
    workbench.get_by_text('Mocked answer 7',exact=True).wait_for()
    assert requests[-1]['workflow'] == 'draft'
    workbench.get_by_role('button',name='关闭知产文书').click()
    workbench = open_workflow('合规提示')
    workbench.get_by_label('合规提示事项').select_option('研发合规清单')
    workbench.get_by_label('立项',exact=False).check()
    with page.expect_download() as checked_file:
        workbench.get_by_role('button',name='导出清单（1/5）').click()
    assert '[x] 立项' in checked_file.value.path().read_text(encoding='utf-8')
    workbench.get_by_role('button',name='关闭合规提示').click()
    workbench = open_workflow('检索对比')
    workbench.get_by_label('查找知识库材料').fill('商标 混淆')
    assert workbench.locator('summary:visible').count() > 0
    workbench.get_by_label('检索对比事项').select_option('专利 FTO 初筛')
    assert workbench.get_by_label('技术方案',exact=True).is_disabled()
    workbench.get_by_label('我确认方案已公开',exact=False).check()
    workbench.get_by_label('技术方案',exact=True).fill('温度传感器')
    assert workbench.get_by_role('button',name='提取特征').is_disabled()
    workbench.get_by_label('中国',exact=True).check()
    workbench.get_by_role('button',name='提取特征').click()
    workbench.get_by_label('F1 描述').fill('传感器')
    workbench.get_by_role('button',name='确认特征并扩展关键词').click()
    workbench.get_by_label('锁定',exact=True).check()
    workbench.get_by_role('button',name='进入 CSV 回填').click()
    workbench.locator('input[type=file]:visible').set_input_files({
        'name':'fixture.tsv','mimeType':'text/tab-separated-values',
        'buffer':'公开号\t标题\t摘要\nCN100A\t传感器\t温度传感器\nCN-100-A\t重复\t重复'.encode('gbk')})
    workbench.get_by_text('缺法律状态，全部标为未核验。').wait_for()
    workbench.get_by_label('复核备注').fill('人工复核示例')
    workbench.get_by_label('复核选择').select_option('纳入')
    with page.expect_download() as report_file:
        workbench.get_by_role('button',name='导出 Word',exact=True).click()
    from zipfile import ZipFile
    with ZipFile(report_file.value.path()) as doc:
        xml = doc.read('word/document.xml').decode()
        assert all(s in xml for s in ['人工复核示例','去重后 1 条','未完成环节','需人工复核'])
    assert len(requests) == 7
    workbench.get_by_role('button',name='关闭检索对比').click()

    # Mobile layout: each restored control remains in view with no horizontal overflow.
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    for title in ['检索对比','侵权识别','合规提示','知产文书','合同起草（审核）']:
        box = main.get_by_role('button',name=title,exact=True).bounding_box()
        assert box and box['x'] >= 0 and box['x'] + box['width'] <= 390
    panel = open_workflow('侵权识别')
    panel.get_by_role('button', name='关闭侵权识别').click()
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
