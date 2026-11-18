"""Local UI smoke test with a mocked SDK and gateway; no real credentials/data."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[1] / '.qa-artifacts'
OUT.mkdir(exist_ok=True)

SDK = r"""
const service = async payload => (await fetch('/qa-auth', {method:'POST',body:JSON.stringify(payload)})).json();
const auth = {
  async getLoginState() { return sessionStorage.getItem('qa-login') ? {user:{uid:'qa-user'}} : null; },
  async getAccessToken() { return {accessToken:'qa-token'}; },
  async signInWithOtp() { return {error:null,data:{verifyOtp:async ({token}) => {
    if(token !== '123456') return {error:{message:'验证码错误'},data:{}};
    sessionStorage.setItem('qa-login','1');return {error:null,data:{user:{id:'qa-user'}}};
  }}}; },
  async signInWithPassword(credentials) {
    const result = await service({op:'signin', ...credentials});
    if (!result.error) sessionStorage.setItem('qa-login','1');
    return result;
  },
  async getUser() {return service({op:'profile'});},
  async updateUser({username}) {return service({op:'username', username});},
  async reauthenticate() {return {error:null,data:{updateUser:({nonce,password}) => service({op:'password',nonce,password})}};},
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
    profile = {'username': '', 'password': None}

    def authentication(route):
        args = route.request.post_data_json
        op = args['op']
        error = None
        if op == 'username':
            profile['username'] = args['username']
        elif op == 'password':
            if args['nonce'] == '654321':
                profile['password'] = args['password']
            else:
                error = {'message': 'Invalid code'}
        elif op == 'signin':
            valid = (args.get('email') == 'qa@example.test' or args.get('username') == profile['username'])
            if not valid or args['password'] != profile['password']:
                error = {'category': 'INVALID_CREDENTIALS'}
        route.fulfill(json={'error':error, 'data':{'user':{'id':'qa-user','user_metadata':{'username':profile['username']}}}})

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
    page.route('**/qa-auth', authentication)
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
    page.get_by_role('button', name='账号菜单').click()
    page.get_by_role('menuitem', name='设置', exact=True).click()
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
    page.get_by_role('button', name='账号菜单').click()
    page.get_by_role('menuitem', name='设置', exact=True).click()
    page.get_by_role('button', name='清除本地旧记录').wait_for()
    page.get_by_role('button', name='登录账号', exact=True).click()
    page.get_by_label('登录用户名').fill('xiaozhi_qa')
    page.get_by_role('button', name='保存用户名').click()
    page.get_by_text('用户名已保存。', exact=True).wait_for()
    page.get_by_role('button', name='发送安全验证码').click()
    page.get_by_label('安全验证码', exact=True).fill('111111')
    page.get_by_label('新密码', exact=True).fill('Fixture-Test-2026')
    page.get_by_label('确认新密码').fill('Different')
    page.get_by_role('button', name='保存密码').click()
    page.get_by_role('alert').filter(has_text='两次输入的密码不一致').wait_for()
    page.get_by_label('确认新密码').fill('Fixture-Test-2026')
    page.get_by_role('button', name='保存密码').click()
    page.get_by_role('alert').filter(has_text='密码设置失败').wait_for()
    assert profile['password'] is None
    page.get_by_label('安全验证码', exact=True).fill('654321')
    page.get_by_role('button', name='保存密码').click()
    page.get_by_text('密码已保存，下次可使用密码登录。').wait_for()
    page.get_by_role('button', name='账号与隐私').click()
    page.get_by_label('我允许第三方模型处理工作资料').check()
    page.wait_for_load_state('networkidle')
    assert records[('settings','privacy')]['payload']['externalModels'] is True
    page.get_by_label('我允许第三方模型处理工作资料').uncheck()
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='联网搜索', exact=True).click()
    page.get_by_label('Tavily API Key', exact=True).fill('synthetic-tavily-key')
    page.get_by_role('button', name='保存 Key', exact=True).click()
    assert page.evaluate("sessionStorage.getItem('xiaozhi-tavily-key:qa-user')") == 'synthetic-tavily-key'
    page.get_by_role('button', name='关闭', exact=True).click()
    page.reload(wait_until='networkidle')
    assert page.evaluate("sessionStorage.getItem('xiaozhi-tavily-key:qa-user')") == 'synthetic-tavily-key'
    page.get_by_role('button', name='账号菜单').click()
    page.get_by_role('menuitem', name='退出登录').click()
    page.get_by_role('heading', name='登录后，继续你的工作').wait_for()
    assert page.evaluate("sessionStorage.getItem('xiaozhi-tavily-key:qa-user')") is None
    assert not page.get_by_text('旧记录测试内容', exact=True).count()
    assert not model_requests
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path=str(OUT/'login-mobile.png'), full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    for identifier in ('qa@example.test', 'xiaozhi_qa'):
        page.get_by_role('button', name='密码登录', exact=True).click()
        page.get_by_label('邮箱或用户名').fill(identifier)
        page.get_by_label('密码', exact=True).fill('wrong-password')
        page.get_by_role('button', name='登录', exact=True).click()
        page.get_by_role('alert').filter(has_text='密码登录失败').wait_for()
        page.get_by_label('密码', exact=True).fill('Fixture-Test-2026')
        page.get_by_role('button', name='登录', exact=True).click()
        page.get_by_text('私人云端空间', exact=True).wait_for()
        assert ('sessions','old-session') in records
        assert page.evaluate("!JSON.stringify([localStorage,sessionStorage]).includes('Fixture-Test-2026')")
        page.get_by_role('button', name='展开侧边栏', exact=True).click()
        page.get_by_text('旧对话测试', exact=True).first.wait_for()
        page.get_by_role('button', name='账号菜单').click()
        page.get_by_role('menuitem', name='退出登录').click()
        page.get_by_role('heading', name='登录后，继续你的工作').wait_for()
    assert not errors, errors
    print('PASS: OTP, username and email/password, verified password setup, privacy, import, logout and mobile layout')
    browser.close()
