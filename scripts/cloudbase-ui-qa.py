"""Local UI smoke test with a mocked SDK and gateway; no real credentials/data."""
import json
from pathlib import Path
from qa_catalog import PUBLIC_CATALOG
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[1] / '.qa-artifacts'
OUT.mkdir(exist_ok=True)

SDK = r"""
const service = async payload => (await fetch('/qa-auth', {method:'POST',body:JSON.stringify(payload)})).json();
const auth = {
  async getLoginState() { return sessionStorage.getItem('qa-login') ? {user:{uid:'qa-user'}} : null; },
  async getAccessToken() { return {accessToken:sessionStorage.getItem('qa-login') === 'new-user' ? 'new-session-token' : 'qa-token'}; },
  async getVerification({email,target}) {if(target!=='ANY')throw Error('registration target');return {verification_id:'fixture',is_user:email==='qa@example.test'};},
  async verify({verification_id,verification_code}) {if(verification_id!=='fixture'||verification_code!=='123456')throw Error('验证码错误');return {verification_token:'proof'};},
  async updateUser({email}) {return {data:{verifyOtp:async args => {
    if(args.email!==email || args.token!=='222222')return {error:{message:'invalid'}};
    return service({op:'email', email});
  }}};},
  async signInWithOtp({email,options}) { if(options.shouldCreateUser!==false || email!=='qa@example.test') return {error:{message:'unregistered'}};
    return {error:null,data:{verifyOtp:async ({token}) => {
    if(token !== '123456') return {error:{message:'验证码错误'},data:{}};
    sessionStorage.setItem('qa-login','1');return {error:null,data:{user:{id:'qa-user'}}};
  }}}; },
  async signInWithPassword(credentials) {
    const result = await service({op:'signin', ...credentials});
    if (!result.error) sessionStorage.setItem('qa-login',result.data.user.id);
    return result;
  },
  async getUser() {return service({op:'profile'});},
  async setSession({access_token, refresh_token}) {
    if (access_token !== 'qa-token' || refresh_token !== 'qa-refresh') return {error:{message:'Invalid token'}};
    sessionStorage.setItem('qa-login','1');
    return {error:null};
  },
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
    conversation = dict(id='saved-session', title='云端对话测试', createdAt=1, updatedAt=1, messages=[])
    records = {('sessions', conversation['id']): dict(kind='sessions', id=conversation['id'], payload=conversation, revision=1)}
    records[('settings','welcome-v1')] = dict(kind='settings', id='welcome-v1', revision=1, payload=dict(id='welcome-v1', completed=True))
    new_records = {('settings','welcome-v1'): records[('settings','welcome-v1')]}
    model_requests = []
    profile = {'email':'qa@example.test','username': '', 'password': None}
    new_profile = {}
    username_attempts = []

    def authentication(route):
        args = route.request.post_data_json
        op = args['op']
        error = None
        user_id = 'qa-user'
        if op == 'password':
            if args['nonce'] == '654321':
                profile['password'] = args['password']
            else:
                error = {'message': 'Invalid code'}
        elif op == 'email':
            profile['email'] = args['email']
        elif op == 'signin':
            signing_up = bool(new_profile) and args.get('email') == new_profile['email']
            account = new_profile if signing_up else profile
            user_id = 'new-user' if signing_up else 'qa-user'
            if args.get('email') != account['email'] or args['password'] != account['password']:
                error = {'category': 'INVALID_CREDENTIALS'}
        current = new_profile if user_id == 'new-user' else profile
        route.fulfill(json={'error':error, 'data':{'user':{'id':user_id,'email':current['email'],'user_metadata':{'username':current['username']}}}})

    def gateway(route):
        if '/rpc/read_public_knowledge' in route.request.url:
            route.fulfill(json=PUBLIC_CATALOG)
            return
        request = route.request
        if '/auth/v1/signup' in request.url:
            assert request.post_data_json == {'email':'new@example.test','password':'New-Example-2026','verification_token':'proof'}
            assert not new_profile, 'A name retry created a second identity'
            new_profile.update(email=request.post_data_json['email'], password=request.post_data_json['password'], username='')
            route.fulfill(json={'access_token':'new-token'})
            return
        if '/rpc/set_login_name' in request.url and request.headers.get('authorization') == 'Bearer new-token':
            if request.post_data_json['p_name'] == '已占用':
                route.fulfill(status=409,json={'code':'23505'})
            else:
                assert request.post_data_json['p_name'] == '新用户'
                new_profile['username'] = '新用户'
                route.fulfill(json='新用户')
            return
        new_session = request.headers.get('authorization') == 'Bearer new-session-token'
        account_records = new_records if new_session else records
        if '/rpc/my_login_name' in request.url:
            route.fulfill(json=(new_profile if new_session else profile)['username'])
            return
        if '/rpc/set_login_name' in request.url:
            name = request.post_data_json['p_name']
            username_attempts.append(name)
            if name == '已占用':
                route.fulfill(status=409, json={'code':'23505'})
            else:
                profile['username'] = name
                route.fulfill(json=name)
            return
        if '/rpc/put_user_record' in request.url:
            body = request.post_data_json
            key = (body['p_kind'], body['p_id'])
            old = account_records.get(key)
            if body['p_revision'] != (old['revision'] if old else 0):
                route.fulfill(status=409, json={'code':'40001'})
                return
            row = dict(kind=body['p_kind'], id=body['p_id'], payload=body['p_payload'], revision=body['p_revision']+1)
            account_records[key] = row
            route.fulfill(json=row)
        elif '/rpc/delete_user_record' in request.url:
            body = request.post_data_json
            account_records.pop((body['p_kind'], body['p_id']), None)
            route.fulfill(status=204)
        else:
            route.fulfill(json=list(account_records.values()))

    page.route('**/node_modules/.vite/deps/@cloudbase_js-sdk.js*', lambda route: route.fulfill(content_type='application/javascript', body=SDK))
    def alias_login(route):
        credentials = route.request.post_data_json
        if credentials == {'username': profile['username'], 'password': profile['password']}:
            route.fulfill(json={'access_token':'qa-token','refresh_token':'qa-refresh'})
        else:
            route.fulfill(status=401,json={'message':'密码登录失败，请核对用户名和密码。'})

    page.route('**/api/auth/password', alias_login)
    page.route('**/qa-auth', authentication)
    page.route('https://*.api.tcloudbasegateway.com/**', gateway)
    def identity(route):
        if route.request.headers.get('authorization') == 'Bearer new-session-token':
            route.fulfill(json={'id':'new-user','email':new_profile['email']})
        else:
            route.fulfill(json={'id':'qa-user','email':profile['email']})
    page.route('**/api/auth/me', identity)
    page.route('**/api/agent/models', lambda route: route.fulfill(json=[{'id':'zhipu-glm','label':'测试模型','available':True,'free':True}]))
    page.route('**/api/agent/chat', lambda route: (model_requests.append(route.request.url), route.fulfill(status=403,json={'message':'blocked'})))
    page.add_init_script("""localStorage.setItem('agent_sessions_v1', JSON.stringify([{id:'old-session',title:'旧对话测试',createdAt:1,updatedAt:1,messages:[{id:'old-message',role:'user',content:'旧记录测试内容',createdAt:1}]}]));""")
    page.goto('http://127.0.0.1:5173')
    page.wait_for_load_state('networkidle')
    print('Initial buttons:', page.get_by_role('button').all_text_contents())
    page.screenshot(path=str(OUT/'login-desktop.png'), full_page=True)
    page.get_by_label('邮箱', exact=True).fill('new@example.test')
    page.get_by_role('button', name='发送邮箱验证码').click()
    page.get_by_role('alert').filter(has_text='请确认邮箱已注册').wait_for()
    page.get_by_role('button', name='注册账号').click()
    dialog = page.get_by_role('dialog',name='注册小知账号')
    assert dialog.get_by_label('邮箱',exact=True).input_value() == 'new@example.test'
    dialog.get_by_label('账号名称').fill('已占用')
    dialog.get_by_label('邮箱',exact=True).fill('qa@example.test')
    dialog.get_by_label('密码',exact=True).fill('New-Example-2026')
    dialog.get_by_role('button',name='发送注册验证码').click()
    dialog.get_by_text('该邮箱已注册，请返回登录。').wait_for()
    dialog.get_by_label('邮箱',exact=True).fill('new@example.test')
    dialog.get_by_role('button',name='发送注册验证码').click()
    dialog.get_by_label('注册验证码').fill('123456')
    dialog.get_by_role('button',name='完成注册').click()
    dialog.get_by_text('这个用户名已被占用，请换一个。').wait_for()
    dialog.get_by_label('账号名称').fill('新用户')
    dialog.get_by_role('button',name='保存账号名称').click()
    page.get_by_text('注册成功，请登录。').wait_for()
    assert page.get_by_label('邮箱或用户名').input_value() == 'new@example.test'
    assert not page.evaluate("sessionStorage.getItem('qa-login')")
    assert profile['username']=='' and profile['password'] is None
    page.get_by_label('密码',exact=True).fill('New-Example-2026')
    page.get_by_role('button',name='登录',exact=True).click()
    page.get_by_role('button',name='账号菜单').get_by_text('新用户',exact=True).wait_for()
    assert not page.get_by_text('云端对话测试',exact=True).count()
    page.get_by_role('button',name='账号菜单').click()
    page.get_by_role('menuitem',name='退出登录').click()
    page.get_by_role('button',name='验证码登录',exact=True).click()
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
    account_menu = page.get_by_role('button', name='账号菜单')
    assert 'qa@example.test' in account_menu.inner_text()
    page.get_by_role('button', name='账号菜单').click()
    page.get_by_role('menuitem', name='设置', exact=True).click()
    page.get_by_role('dialog').wait_for()
    print('Account text:', page.get_by_role('dialog').inner_text()[:500])
    assert not page.get_by_label('我允许第三方模型处理工作资料').is_checked()
    page.screenshot(path=str(OUT/'account-desktop.png'), full_page=True)
    assert not page.get_by_text('导入旧浏览器资料',exact=True).count()
    assert ('sessions','old-session') not in records
    assert page.evaluate("localStorage.getItem('agent_sessions_v1')") is not None
    page.get_by_role('button', name='登录账号', exact=True).click()
    user_field = page.get_by_label('登录用户名')
    save_name = page.get_by_role('button', name='保存用户名')
    for invalid in ('_bad', 'a b', '🙂', '知' * 257):
        user_field.fill(invalid)
        assert save_name.is_disabled() and user_field.get_attribute('aria-invalid') == 'true'
    assert not username_attempts
    for valid in ('yc','知','𠀀' * 256, '小知QA1'):
        user_field.fill(valid)
        save_name.click()
        page.get_by_text('用户名已保存。', exact=True).wait_for()
        assert profile['username'] == valid
        assert valid in page.get_by_role('dialog').inner_text()
    user_field.fill('已占用')
    save_name.click()
    page.get_by_text('这个用户名已被占用，请换一个。').wait_for()
    assert profile['username'] == '小知QA1'
    page.get_by_label('新邮箱',exact=True).fill('updated@example.test')
    page.get_by_role('button',name='验证新邮箱').click()
    page.get_by_label('新邮箱验证码').fill('000000')
    page.get_by_role('button',name='确认更换邮箱').click()
    page.get_by_role('alert').filter(has_text='邮箱换绑未确认').wait_for()
    assert profile['email']=='qa@example.test'
    page.get_by_label('新邮箱验证码').fill('222222')
    page.get_by_role('button',name='确认更换邮箱').click()
    page.get_by_text('当前绑定邮箱：updated@example.test').wait_for()
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
    account_menu.get_by_text('小知QA1', exact=True).wait_for()
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
    for identifier in ('updated@example.test', '小知QA1'):
        page.get_by_role('button', name='密码登录', exact=True).click()
        page.get_by_label('邮箱或用户名').fill(identifier)
        page.get_by_label('密码', exact=True).fill('wrong-password')
        page.get_by_role('button', name='登录', exact=True).click()
        page.get_by_role('alert').filter(has_text='密码登录失败').wait_for()
        if identifier == '小知QA1':
            page.get_by_label('邮箱或用户名').fill('小知qa1')
            page.get_by_label('密码', exact=True).fill('Fixture-Test-2026')
            with page.expect_response('**/api/auth/password') as rejected:
                page.get_by_role('button', name='登录', exact=True).click()
            assert rejected.value.status == 401
            page.get_by_label('邮箱或用户名').fill(identifier)
        page.get_by_label('密码', exact=True).fill('Fixture-Test-2026')
        page.get_by_role('button', name='登录', exact=True).click()
        page.get_by_text('私人云端空间', exact=True).wait_for()
        assert ('sessions','saved-session') in records
        assert page.evaluate("!JSON.stringify([localStorage,sessionStorage]).includes('Fixture-Test-2026')")
        page.get_by_role('button', name='展开侧边栏', exact=True).click()
        page.get_by_text('云端对话测试', exact=True).first.wait_for()
        page.get_by_role('button', name='账号菜单').click()
        page.get_by_role('menuitem', name='退出登录').click()
        page.get_by_role('heading', name='登录后，继续你的工作').wait_for()
    assert not errors, errors
    print('PASS: OTP, username and email/password, verified password setup, privacy, no legacy import, logout and mobile layout')
    browser.close()
