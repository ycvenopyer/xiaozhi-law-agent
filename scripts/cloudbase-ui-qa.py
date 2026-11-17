"""Local UI smoke test with a mocked SDK and gateway; no real credentials/data."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[1] / '.qa-artifacts'
OUT.mkdir(exist_ok=True)

SDK = r"""
const auth = {
  async getLoginState() { return sessionStorage.getItem('qa-login') ? {user:{uid:'qa-user'}} : null; },
  async getAccessToken() { return {accessToken:'qa-token'}; },
  async signInWithOtp() { return {error:null,data:{verifyOtp:async ({token}) => {
    if(token !== '123456') return {error:{message:'验证码错误'},data:{}};
    sessionStorage.setItem('qa-login','1');return {error:null,data:{user:{id:'qa-user'}}};
  }}}; },
  async signOut() { sessionStorage.removeItem('qa-login'); }
};
export default {init(){return {auth:()=>auth,storage:{from(){throw new Error('Not used in this test')}}}}};
"""

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 1000})
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    records = {}
    model_requests = []

    def gateway(route):
        request = route.request
        if '/rpc/put_user_record' in request.url:
            body = request.post_data_json
            key = (body['p_kind'], body['p_id'])
            old = records.get(key)
            if body['p_revision'] != (old['revision'] if old else 0):
                route.fulfill(status=409, json={'code':'40001'})
                return
            row = dict(kind=body['p_kind'], id=body['p_id'], payload=body['p_payload'], revision=body['p_revision']+1)
            records[key] = row
            route.fulfill(json=row)
        elif '/rpc/delete_user_record' in request.url:
            body = request.post_data_json
            records.pop((body['p_kind'], body['p_id']), None)
            route.fulfill(status=204)
        else:
            route.fulfill(json=list(records.values()))

    page.route('**/node_modules/.vite/deps/@cloudbase_js-sdk.js*', lambda route: route.fulfill(content_type='application/javascript', body=SDK))
    page.route('https://*.api.tcloudbasegateway.com/**', gateway)
    page.route('**/api/auth/me', lambda route: route.fulfill(json={'id':'qa-user','email':'qa@example.test'}))
    page.route('**/api/agent/models', lambda route: route.fulfill(json=[{'id':'zhipu-glm','label':'测试模型','available':True,'free':True}]))
    page.route('**/api/agent/chat', lambda route: (model_requests.append(route.request.url), route.fulfill(status=403,json={'message':'blocked'})))
    page.add_init_script("""localStorage.setItem('agent_sessions_v1', JSON.stringify([{id:'old-session',title:'旧对话测试',createdAt:1,updatedAt:1,messages:[{id:'old-message',role:'user',content:'旧记录测试内容',createdAt:1}]}]));""")
    page.goto('http://127.0.0.1:5173')
    page.wait_for_load_state('networkidle')
    print('Initial buttons:', page.get_by_role('button').all_text_contents())
    page.screenshot(path=str(OUT/'login-desktop.png'), full_page=True)
    page.get_by_label('邮箱', exact=True).fill('qa@example.test')
    page.get_by_role('button', name='发送邮箱验证码').click()
    page.get_by_label('邮箱验证码', exact=True).fill('111111')
    page.get_by_role('button', name='验证并进入').click()
    page.get_by_role('alert').filter(has_text='验证码错误').wait_for()
    page.get_by_label('邮箱验证码', exact=True).fill('123456')
    page.get_by_role('button', name='验证并进入').click()
    page.get_by_text('私人云端空间', exact=True).wait_for()
    page.wait_for_load_state('networkidle')
    assert ('sessions','old-session') not in records, 'Legacy data was auto-imported'
    page.get_by_role('button', name='云端已同步 · 账号').click()
    page.get_by_role('dialog').wait_for()
    print('Account text:', page.get_by_role('dialog').inner_text()[:500])
    assert not page.get_by_label('我允许第三方模型处理工作资料').is_checked()
    page.screenshot(path=str(OUT/'account-desktop.png'), full_page=True)
    page.get_by_label('我确认这些本地资料属于当前账号，并同意上传至该账号。').check()
    with page.expect_navigation(wait_until='networkidle'):
        page.get_by_role('button', name='导入当前账号').click()
    page.get_by_text('私人云端空间', exact=True).wait_for()
    page.wait_for_load_state('networkidle')
    assert ('sessions','old-session') in records
    assert records[('sessions','old-session')]['payload']['messages'][0]['content'] == '旧记录测试内容'
    assert page.evaluate("localStorage.getItem('agent_sessions_v1')") is not None
    page.get_by_role('button', name='云端已同步 · 账号').click()
    page.get_by_role('button', name='清除本地旧记录').wait_for()
    page.get_by_label('我允许第三方模型处理工作资料').check()
    page.wait_for_load_state('networkidle')
    assert records[('settings','privacy')]['payload']['externalModels'] is True
    page.get_by_label('我允许第三方模型处理工作资料').uncheck()
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='退出登录').click()
    page.get_by_role('heading', name='登录后，继续你的工作').wait_for()
    assert not page.get_by_text('旧记录测试内容', exact=True).count()
    assert not model_requests
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path=str(OUT/'login-mobile.png'), full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    assert not errors, errors
    print('PASS: login, OTP error, opt-in privacy, explicit legacy import, logout, mobile layout; no model calls')
    browser.close()
