import assert from 'node:assert/strict'
import { test } from 'node:test'
import request from 'supertest'

process.env.NODE_ENV = 'test'
process.env.API_PREFIX = '/api'
process.env.ZHIPU_API_KEY = 'synthetic-model-key'
process.env.CLOUDBASE_PUBLISHABLE_KEY = 'synthetic-publishable-key'
process.env.XIAOZHI_LOGIN_LOOKUP_KEY = 'test-only-lookup-key'
process.env.LOG_LEVEL = 'silent'

const { default: app } = await import('../cloud-functions/api/[[default]].ts')
const { executeTool, TOOLS, availableTools } = await import('../backend/src/modules/agent/tools.ts')
const { getProviderChain, MODEL_REGISTRY } = await import('../backend/src/modules/agent/providers.ts')
const originalFetch = globalThis.fetch
const auth = { Authorization: 'Bearer user-a-token' }
const input = { messages: [{ role: 'user', content: 'sample' }], model: 'zhipu-glm',
  conversationId: 'conversation-a', assistantMessageId: 'assistant-a' }
let consent = true
let modelCalls: string[] = []
let failModel = false
let blockModel = false
let streamError = false
let newsCalls = 0
let newsStatus = 200
let savedStatus = ''
let record = makeRecord()
function makeRecord() {
  return { kind: 'sessions', id: 'conversation-a', revision: 1, payload: {
    id: 'conversation-a', title: 'sample', messages: [
      { id: 'user-message-a', role: 'user', content: 'sample', createdAt: Date.now() },
      { id: 'assistant-a', role: 'assistant', content: '', status: 'generating', createdAt: Date.now() },
    ], createdAt: Date.now(), updatedAt: Date.now(),
  } }
}

function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } }) }

globalThis.fetch = async (url, init) => {
  const address = String(url)
  const headers = new Headers(init?.headers)
  if (address.endsWith('/rpc/resolve_login_name')) {
    const { p_name, p_key } = JSON.parse(String(init?.body))
    assert.equal(p_key, 'test-only-lookup-key')
    return json(p_name === '知Yc1' ? { login: 'a@example.test', owner: 'user-a' }
      : p_name === '过期别名' ? { login: 'a@example.test', owner: 'user-b' } : {})
  }
  if (address.endsWith('/auth/v1/signin')) {
    const { username, password } = JSON.parse(String(init?.body))
    return username === 'a@example.test' && password === 'fixture' ? json({
      access_token:'user-a-token', refresh_token:'test-refresh', private_field:'discard',
    }) : json({},401)
  }
  if (address.endsWith('/auth/v1/user/me')) {
    return headers.get('authorization') === auth.Authorization ? json({ sub: 'user-a', user_id: 'different-profile-id', email: 'a@example.test' }) : json({}, 401)
  }
  if (address.includes('/v1/rdb/rest/user_records')) return json([{ kind: 'settings', id: 'privacy', payload: { externalModels: consent }, revision: 1 }])
  if (address.endsWith('/rpc/begin_chat')) {
    const body = JSON.parse(String(init?.body))
    if (body.p_id !== 'conversation-a') return json({ code: '40001' }, 409)
    return json(record)
  }
  if (address.endsWith('/rpc/finish_chat')) {
    const body = JSON.parse(String(init?.body))
    record = { ...record, payload: body.p_payload, revision: record.revision + 1 }
    savedStatus = record.payload.messages.at(-1)?.status || ''
    return json(record)
  }
  if (address === 'https://api.tavily.com/search') {
    newsCalls++
    assert.equal(init?.method, 'POST')
    assert.equal(init?.redirect, 'error')
    assert.equal(headers.get('authorization'), 'Bearer synthetic-tavily-key')
    const body = JSON.parse(String(init?.body))
    if (body.query === 'public fixture') return json({ results: [{ title: '示例', url: 'https://example.test/patent', content: '检索结果' }] })
    const date = body.query.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
    assert.ok(date)
    assert.deepEqual(body, {
      query: `${date} 中国知识产权新闻：专利、商标、版权、商业秘密、政策和司法裁判`,
      topic: 'news', search_depth: 'basic', max_results: 20, time_range: 'day',
      include_published_date: true, include_answer: false, include_raw_content: false,
    })
    if (newsStatus !== 200) return json({ message: 'upstream diagnostic synthetic-tavily-key' }, newsStatus)
    return json({ results: [
      { title: '今日发布的专利公告', url: 'https://example.test/latest', published_date: new Date(`${date}T01:00:00+08:00`).toUTCString() },
      { title: '昨日专利动态', url: 'https://example.test/archive', published_date: '2000-01-01' },
      { title: '未注明发布日期的商标新闻', url: 'https://example.test/undated' },
      { title: '重复专利公告', url: 'https://example.test/latest#anchor', published_date: date },
      { title: '无关消息', url: 'https://example.test/unrelated', published_date: date },
    ] })
  }
  if (address.endsWith('/chat/completions')) {
    const body = JSON.parse(String(init?.body))
    modelCalls.push(address)
    assert.ok(!JSON.stringify(body).includes('synthetic-tavily-key'))
    const last = body.messages.at(-1)
    const frame = (choice: unknown) => new Response('data: ' + JSON.stringify({ choices: [choice] }) + '\n\ndata: [DONE]\n\n')
    if (last.content === 'prefill sample') return frame({delta:{content: JSON.stringify({task:'保密协议（NDA）',values:{'当事人及角色':'甲方','未定义字段':'忽略'}})}})
    if (last.content === 'search fixture') {
      assert.ok(body.tools.some((tool: { function: { name: string } }) => tool.function.name === 'web_search'))
      return frame({ delta: { tool_calls: [{ index: 0, id: 'search1', function: { name: 'web_search', arguments: '{"query":"public fixture"}' } }] } })
    }
    if (last.role === 'tool') {
      assert.match(last.content, /example.test\/patent/)
      return frame({ delta: { content: 'found' }, finish_reason: 'stop' })
    }
    if (last.content === 'length fixture') return frame({ delta: { content: '第一段' }, finish_reason: 'length' })
    if (blockModel && last.content === 'deadline fixture') {
      return new Response(new ReadableStream({ start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"前段"}}]}\n\n'))
        init?.signal?.addEventListener('abort', () => controller.error(new Error('aborted')), { once: true })
      } }))
    }
    assert.ok((body.tools || []).every((tool: { function: { name: string } }) => ['calculator', 'get_datetime'].includes(tool.function.name)))
    if (blockModel) return new Promise((_resolve, reject) => {
      const abort = () => reject(new Error('aborted'))
      if (init?.signal?.aborted) abort()
      else init?.signal?.addEventListener('abort', abort, { once: true })
    })
    if (failModel) return json({ message: 'upstream diagnostic must not leak' }, 400)
    if (streamError) return new Response(new ReadableStream({ start(controller) {
      controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'))
      setTimeout(() => controller.error(new Error('unexpected-stream-error')), 10)
    } }), { headers: { 'Content-Type': 'text/event-stream' } })
    return new Response('data: {"choices":[{"delta":{"content":"hello"}}]}\n\ndata: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } })
  }
  throw new Error(`Unexpected outbound request: ${address}`)
}

test('EdgeOne authentication, persistence, upload and privacy boundaries', async t => {
  try {
    await t.test('username password login returns sessions only for the exact account', async () => {
      const login = (username: string, password = 'fixture') => request(app).post('/api/auth/password').send({ username,password })
      const ok = await login('知Yc1').expect(200)
      assert.deepEqual(ok.body,{ access_token:'user-a-token',refresh_token:'test-refresh' })
      assert.equal(ok.headers['cache-control'],'no-store')
      const wrongCase = await login('知yc1').expect(401)
      const wrongPassword = await login('知Yc1','other').expect(401)
      assert.deepEqual(wrongCase.body,wrongPassword.body)
      await login('过期别名').expect(401)
      await login('知'.repeat(257)).expect(400)
    })
    await t.test('health routes work with full and stripped API prefixes', async () => {
      for (const prefix of ['/api', '']) {
        const health = await request(app).get(`${prefix}/health`).expect(200)
        assert.equal(health.body.status, 'ok')
        assert.ok(health.body.timestamp)
        const ping = await request(app).get(`${prefix}/ping`).expect(200)
        assert.equal(ping.body.message, 'pong')
        assert.ok(ping.body.timestamp)
      }
      await request(app).get('/api/missing').expect(404)
    })
    await t.test('system status and version endpoints retain their response fields', async () => {
      const ready = await request(app).get('/api/health/ready').expect(200)
      assert.equal(ready.body.status, 'ready')
      assert.ok(ready.body.timestamp && ready.body.checks)
      const live = await request(app).get('/api/health/live').expect(200)
      assert.equal(live.body.status, 'alive')
      assert.ok(live.body.timestamp)
      const welcome = await request(app).get('/api/').expect(200)
      assert.ok(welcome.body.message && welcome.body.version && welcome.body.timestamp)
      const version = await request(app).get('/api/version').expect(200)
      assert.ok(version.body.version && version.body.apiVersion && version.body.nodeVersion && version.body.environment)
      const status = await request(app).get('/api/status').expect(200)
      assert.equal(status.body.status, 'operational')
      assert.equal(typeof status.body.uptime, 'number')
      assert.ok(status.body.memory && status.body.process)
    })
    await t.test('unauthenticated and forged tokens cannot access private APIs', async () => {
      await request(app).get('/api/agent/models').expect(401)
      await request(app).post('/api/agent/chat').send(input).expect(401)
      await request(app).post('/api/agent/files').expect(401)
      await request(app).post('/api/agent/extract-dossier').send({ text: 'secret' }).expect(401)
      await request(app).get('/api/auth/me').set('Authorization', 'Bearer forged-token').expect(401)
      const user = await request(app).get('/api/auth/me').set(auth).expect(200)
      assert.equal(user.body.id, 'user-a')
      assert.equal(user.headers['cache-control'], 'no-store')
    })
    await t.test('file parser accepts small files and rejects oversize payloads', async () => {
      const small = await request(app).post('/api/agent/files').set(auth).attach('file', Buffer.from('sample dossier'), 'case.txt').expect(200)
      assert.equal(small.body.text, 'sample dossier')
      const archive = new (await import('jszip')).default()
      archive.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>测试协议</w:t></w:r></w:p></w:body></w:document>')
      const docx = await archive.generateAsync({type:'nodebuffer'})
      const word = await request(app).post('/api/agent/files').set(auth).attach('file', docx, 'sample.docx').expect(200)
      assert.match(word.body.text, /测试协议/)
      const gbk = await request(app).post('/api/agent/files').set(auth).attach('file', Buffer.from([0xd6,0xd0,0xce,0xc4]), 'sample.md').expect(200)
      assert.equal(gbk.body.text, '中文')
      await request(app).post('/api/agent/files').set(auth).attach('file', Buffer.alloc(4 * 1024 * 1024 + 1), 'large.txt').expect(413)
      await request(app).post('/api/agent/chat').set(auth).send({ ...input, messages: [{ role: 'user', content: 'x'.repeat(5 * 1024 * 1024) }] }).expect(413)
      assert.equal(modelCalls.length, 0)
    })
    await t.test('opt-out blocks chat and extraction before any model call', async () => {
      consent = false
      await request(app).post('/api/agent/chat').set(auth).send(input).expect(403)
      await request(app).post('/api/agent/extract-dossier').set(auth).send({ text: 'secret', model: 'zhipu-glm' }).expect(403)
      assert.equal(modelCalls.length, 0)
      consent = true
    })
    await t.test('unknown or removed models and a foreign/missing conversation are rejected', async () => {
      await request(app).post('/api/agent/chat').set(auth).send({ ...input, model: 'unknown-model' }).expect(400)
      await request(app).post('/api/agent/chat').set(auth).send({ ...input, model: 'qwen-free' }).expect(400)
      await request(app).post('/api/agent/chat').set(auth).send({ ...input, model: 'sf-qwen3' }).expect(400)
      await request(app).post('/api/agent/chat').set(auth).send({ ...input, conversationId: 'foreign-conversation' }).expect(409)
      assert.equal(modelCalls.length, 0)
    })
    await t.test('only the configured Zhipu models appear in the built-in catalogue', async () => {
      const response = await request(app).get('/api/agent/models').set(auth).expect(200)
      assert.deepEqual(response.body.map((model: { id: string }) => model.id), [
        'zhipu-glm', 'zhipu-flash', 'zhipu-vision', 'zhipu-air',
      ])
      assert.deepEqual(response.body.filter((model: { free: boolean }) => model.free)
        .map((model: { id: string }) => model.id), ['zhipu-flash', 'zhipu-vision'])
      assert.ok(response.body.every((model: Record<string, unknown>) =>
        model.provider === '智谱 AI' && model.available && !('apiKey' in model) && !('baseUrl' in model),
      ))
      record = makeRecord(); modelCalls = []
      await request(app).post('/api/agent/chat').set(auth).send({ ...input, model: 'zhipu-air' }).expect(200)
      assert.deepEqual(modelCalls, ['https://open.bigmodel.cn/api/paas/v4/chat/completions'])
      assert.equal(savedStatus, 'complete')
    })
    await t.test('custom model requests require login and the same work-data consent', async () => {
      const config = { baseUrl: 'https://api.example.test/v1', model: 'test', apiKey: 'synthetic-key', vision: false, tools: false }
      const previousCalls = modelCalls.length
      await request(app).post('/api/agent/custom-model/test').send(config).expect(401)
      consent = false
      try {
        await request(app).post('/api/agent/chat').set(auth).send({ ...input, model: 'custom-test', customModel: config }).expect(403)
      } finally { consent = true }
      await request(app).post('/api/agent/chat').set(auth).send({ ...input, model: 'custom-missing-key' }).expect(400)
      await request(app).post('/api/agent/custom-model/test').set(auth).send({ ...config, baseUrl: 'https://localhost' }).expect(400)
      assert.equal(modelCalls.length, previousCalls)
    })
    await t.test('authenticated news uses the supplied Tavily key and filters by Beijing date', async () => {
      const body = { apiKey: 'synthetic-tavily-key' }
      await request(app).post('/api/agent/ip-news').send(body).expect(401)
      await request(app).post('/api/agent/ip-news').set(auth).send({ model: 'zhipu-flash' }).expect(400)
      assert.equal(newsCalls, 0)
      const previousModelCalls = modelCalls.length
      consent = false
      try {
        const result = await request(app).post('/api/agent/ip-news').set(auth)
          .send({ ...body, model: 'custom-unused', knowledge: 'private knowledge', messages: ['private history'] })
          .expect('Cache-Control', /no-store/).expect(200)
        assert.equal(newsCalls, 1)
        assert.equal(modelCalls.length, previousModelCalls)
        assert.deepEqual(result.body.articles.map((article: { url: string }) => article.url), ['https://example.test/latest'])

        newsStatus = 401
        const denied = await request(app).post('/api/agent/ip-news').set(auth).send(body).expect(403)
        assert.match(denied.body.message, /核对 API Key/)
        assert.doesNotMatch(denied.text, /synthetic-tavily-key|upstream diagnostic/)
      } finally { consent = true; newsStatus = 200 }
    })
    await t.test('answers are persisted before done and SSE remains uncompressed', async () => {
      for (const path of ['/api/agent/chat', '/agent/chat']) {
        record = makeRecord()
        const result = await request(app).post(path).set(auth).set('Accept-Encoding', 'gzip').send(input).expect(200)
        assert.equal(result.headers['content-encoding'], undefined)
        assert.match(result.text, /hello/)
        assert.ok(result.text.indexOf('"type":"saved"') < result.text.indexOf('"type":"done"'))
        assert.equal(record.payload.messages.at(-1)?.content, 'hello')
        assert.equal(savedStatus, 'complete')
      }
    })
    await t.test('model errors never switch supplier or expose upstream details', async () => {
      failModel = true; record = makeRecord(); modelCalls = []
      const result = await request(app).post('/api/agent/chat').set(auth).send(input).expect(200)
      assert.equal(savedStatus, 'failed')
      assert.equal(modelCalls.length, 1)
      assert.ok(modelCalls.every(url => url.startsWith('https://open.bigmodel.cn/')))
      assert.doesNotMatch(result.text, /upstream diagnostic/)
      assert.equal(getProviderChain(MODEL_REGISTRY[0], false).length, 1)
      failModel = false
    })
    await t.test('partial model output is saved when the upstream stream fails', async () => {
      streamError = true; record = makeRecord()
      await request(app).post('/api/agent/chat').set(auth).send(input).expect(200)
      assert.equal(record.payload.messages.at(-1)?.content, 'partial')
      assert.equal(savedStatus, 'failed')
      streamError = false
    })
    await t.test('deadline aborts upstream and persists failed generation', async () => {
      blockModel = true; record = makeRecord()
      const originalTimeout = globalThis.setTimeout
      globalThis.setTimeout = ((fn, ms, ...args) => originalTimeout(fn, ms === 100_000 ? 20 : ms, ...args)) as typeof setTimeout
      try {
        const result = await request(app).post('/api/agent/chat').set(auth).send(input).expect(200)
        assert.match(result.text, /100 秒/)
        assert.equal(savedStatus, 'failed')
      } finally { globalThis.setTimeout = originalTimeout; blockModel = false }
    })
    await t.test('configured chat searches with Tavily and retains the source', async () => {
      record = makeRecord()
      const res = await request(app).post('/api/agent/chat').set(auth).send({ ...input,
        messages: [{ role: 'user', content: 'search fixture' }], tavilyKey: 'synthetic-tavily-key' }).expect(200)
      assert.match(res.text, /tool_end/)
      assert.doesNotMatch(res.text, /synthetic-tavily-key/)
      assert.equal(record.payload.messages.at(-1)?.content, 'found')
    })
    await t.test('length cutoff continues in the same saved reply', async () => {
      record = makeRecord()
      await request(app).post('/api/agent/chat').set(auth).send({ ...input, messages: [{ role: 'user', content: 'length fixture' }] }).expect(200)
      assert.equal(record.payload.messages.at(-1)?.content, '第一段hello')
      assert.equal(savedStatus, 'complete')
    })
    await t.test('a timed-out partial answer resumes after persistence', async () => {
      record = makeRecord()
      const body = { ...input, messages: [{ role: 'user', content: 'deadline fixture' }], allowResume: true }
      const originalTimeout = globalThis.setTimeout
      blockModel = true
      globalThis.setTimeout = ((fn, ms, ...args) => originalTimeout(fn, ms === 100_000 ? 30 : ms, ...args)) as typeof setTimeout
      try {
        const res = await request(app).post('/api/agent/chat').set(auth).send(body).expect(200)
        assert.match(res.text, /"type":"resume"/)
        assert.equal(savedStatus, 'interrupted')
      } finally { globalThis.setTimeout = originalTimeout; blockModel = false }
      await request(app).post('/api/agent/chat').set(auth).send({ ...body, resumeRevision: record.revision }).expect(200)
      assert.equal(savedStatus, 'complete')
      assert.equal(record.payload.messages.at(-1)?.content, '前段hello')
    })
    await t.test('file prefill checks consent, vision and allowed fields', async () => {
      const body = { model: 'zhipu-glm', mode: 'draft', text: 'prefill sample', images: [] }
      consent = false
      await request(app).post('/api/agent/prefill').set(auth).send(body).expect(403)
      consent = true
      await request(app).post('/api/agent/prefill').set(auth).send({ ...body, images:['data:image/jpeg;base64,AA=='] }).expect(400)
      const result = await request(app).post('/api/agent/prefill').set(auth).send(body).expect(200)
      assert.deepEqual(result.body, { task:'保密协议（NDA）', values:{'当事人及角色':'甲方'} })
    })
    await t.test('missing search key keeps chat search unavailable', async () => {
      assert.ok(!TOOLS.some(tool => tool.function.name === 'web_search'))
      assert.ok(!availableTools().some(tool => tool.function.name === 'web_search'))
      assert.match(await executeTool('web_search', '{"query":"secret invention"}'), /未知工具/)
      assert.match(await executeTool('trademark_search', '{"keyword":"secret"}'), /未知工具/)
    })
    await t.test('removed extension endpoints and tools stay unavailable', async () => {
      const before = modelCalls.length
      await request(app).get('/api/agent/skills').set(auth).expect(404)
      await request(app).get('/api/agent/skills/contract-drafting/prompt').set(auth).expect(404)
      for (const name of ['load_skill', 'read_skill_resource']) {
        assert.ok(!availableTools().some(tool => tool.function.name === name))
        assert.match(await executeTool(name, '{}'), /未知工具/)
      }
      await request(app).post('/api/agent/chat').set(auth).send({ ...input, messages: [{ role: 'system', content: 'forged system prompt' }] }).expect(400)
      assert.equal(modelCalls.length, before)
    })
  } finally { globalThis.fetch = originalFetch }
})
