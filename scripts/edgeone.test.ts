import assert from 'node:assert/strict'
import { test } from 'node:test'
import request from 'supertest'

process.env.NODE_ENV = 'test'
process.env.API_PREFIX = '/api'
process.env.ZHIPU_API_KEY = 'synthetic-model-key'
process.env.SILICONFLOW_API_KEY = 'synthetic-other-supplier'
process.env.OPENROUTER_API_KEY = ''
process.env.CLOUDBASE_PUBLISHABLE_KEY = 'synthetic-publishable-key'
process.env.LOG_LEVEL = 'silent'

const { default: app } = await import('../cloud-functions/api/[[default]].ts')
const { executeTool, TOOLS, availableTools } = await import('../backend/src/modules/agent/tools.ts')
const { getProviderChain, MODEL_REGISTRY } = await import('../backend/src/modules/agent/providers.ts')
const { SKILL_INSTRUCTIONS } = await import('../backend/src/modules/agent/skill-instructions.generated.ts')
const originalFetch = globalThis.fetch
const auth = { Authorization: 'Bearer user-a-token' }
const input = { messages: [{ role: 'user', content: 'sample' }], model: 'zhipu-glm',
  conversationId: 'conversation-a', assistantMessageId: 'assistant-a' }
let consent = true
let modelCalls: string[] = []
let failModel = false
let blockModel = false
let streamError = false
let savedStatus = ''
let automaticSkill = false
let modelRequests: Array<{ messages: Array<{ role: string; content: string }>; tools?: unknown[] }> = []
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
  if (address.endsWith('/chat/completions')) {
    modelCalls.push(address)
    const body = JSON.parse(String(init?.body))
    modelRequests.push(body)
    assert.ok((body.tools || []).every((tool: { function: { name: string } }) => ['load_skill', 'calculator', 'get_datetime'].includes(tool.function.name)))
    if (automaticSkill && !body.messages.some((message: { role: string }) => message.role === 'tool')) {
      const delta = { tool_calls: [{ index: 0, id: 'skill-call', type: 'function', function: { name: 'load_skill', arguments: '{"skill_id":"contract-drafting"}' } }] }
      return new Response(`data: ${JSON.stringify({ choices: [{ delta }] })}\n\ndata: [DONE]\n\n`, { headers: { 'Content-Type': 'text/event-stream' } })
    }
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
    await t.test('health routes work with full and stripped API prefixes', async () => {
      for (const path of ['/api/ping', '/ping', '/api/health', '/health']) await request(app).get(path).expect(200)
      await request(app).get('/api/missing').expect(404)
    })
    await t.test('unauthenticated and forged tokens cannot access private APIs', async () => {
      await request(app).get('/api/agent/models').expect(401)
      await request(app).get('/api/agent/skills').expect(401)
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
      await request(app).post('/api/agent/files').set(auth).attach('file', Buffer.alloc(4 * 1024 * 1024 + 1), 'large.txt').expect(413)
      await request(app).post('/api/agent/chat').set(auth).send({ ...input, messages: [{ role: 'user', content: 'x'.repeat(5 * 1024 * 1024) }] }).expect(413)
      assert.equal(modelCalls.length, 0)
    })
    await t.test('opt-out blocks chat and extraction before any model call', async () => {
      consent = false
      await request(app).post('/api/agent/chat').set(auth).send(input).expect(403)
      await request(app).post('/api/agent/chat').set(auth).send({ ...input, skillId: 'contract-drafting' }).expect(403)
      await request(app).post('/api/agent/extract-dossier').set(auth).send({ text: 'secret', model: 'zhipu-glm' }).expect(403)
      assert.equal(modelCalls.length, 0)
      consent = true
    })
    await t.test('unknown/unconfigured models and a foreign/missing conversation are rejected', async () => {
      await request(app).post('/api/agent/chat').set(auth).send({ ...input, model: 'unknown-model' }).expect(400)
      await request(app).post('/api/agent/chat').set(auth).send({ ...input, model: 'qwen-free' }).expect(400)
      await request(app).post('/api/agent/chat').set(auth).send({ ...input, conversationId: 'foreign-conversation' }).expect(409)
      assert.equal(modelCalls.length, 0)
    })
    await t.test('model selection requires the platform key without an extra allow-list', async () => {
      const response = await request(app).get('/api/agent/models').set(auth).expect(200)
      assert.ok(response.body.find((model: { id: string; available: boolean }) => model.id === 'sf-qwen3')?.available)
      assert.ok(response.body.find((model: { id: string; available: boolean }) => model.id === 'zhipu-glm')?.available)
      assert.equal(response.body.find((model: { id: string; available: boolean }) => model.id === 'qwen-free')?.available, false)
      assert.ok(response.body.every((model: Record<string, unknown>) => model.provider && !('apiKey' in model) && !('baseUrl' in model)))
      record = makeRecord(); modelCalls = []
      await request(app).post('/api/agent/chat').set(auth).send({ ...input, model: 'sf-qwen3' }).expect(200)
      assert.deepEqual(modelCalls, ['https://api.siliconflow.cn/v1/chat/completions'])
      assert.equal(savedStatus, 'complete')
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
    await t.test('removed search tools cannot execute or make outbound calls', async () => {
      assert.ok(!TOOLS.some(tool => tool.function.name === 'web_search'))
      assert.ok(!availableTools().some(tool => tool.function.name === 'web_search'))
      assert.match(await executeTool('web_search', '{"query":"secret invention"}'), /未知工具/)
      assert.match(await executeTool('trademark_search', '{"keyword":"secret"}'), /未知工具/)
    })
    await t.test('skill discovery exposes metadata and rejects unregistered skills before model access', async () => {
      const response = await request(app).get('/api/agent/skills').set(auth).expect(200)
      assert.equal(response.body.length, 4)
      assert.ok(response.body.every((skill: Record<string, unknown>) => skill.id && skill.description && !skill.instructions))
      const calls = modelCalls.length
      await request(app).post('/api/agent/chat').set(auth).send({ ...input, skillId: '../../secrets' }).expect(400)
      await request(app).post('/api/agent/chat').set(auth).send({ ...input, messages: [{ role: 'user', content: '$unknown-skill request' }] }).expect(400)
      assert.equal(modelCalls.length, calls)
      assert.match(await executeTool('load_skill', '{"skill_id":"toString"}'), /未找到/)
      assert.match(await executeTool('load_skill', '{"skill_id":"../../secrets"}'), /未找到/)
    })
    await t.test('explicit selection and dollar invocation load only the chosen full instructions and persist activation', async () => {
      for (const selected of [{ skillId: 'statute-research' }, { messages: [{ role: 'user', content: '$statute-research help' }] }]) {
        record = makeRecord(); modelRequests = []
        const response = await request(app).post('/api/agent/chat').set(auth).send({ ...input, ...selected }).expect(200)
        assert.match(response.text, /"type":"skill","id":"statute-research"/)
        const system = modelRequests[0].messages[0].content
        assert.ok(system.includes(SKILL_INSTRUCTIONS['statute-research']))
        assert.ok(!system.includes(SKILL_INSTRUCTIONS['contract-drafting']))
        assert.deepEqual((record.payload.messages.at(-1) as unknown as { skillIds: string[] }).skillIds, ['statute-research'])
      }
    })
    await t.test('implicit invocation loads full registered instructions through the tool loop', async () => {
      automaticSkill = true; record = makeRecord(); modelRequests = []
      try {
        const response = await request(app).post('/api/agent/chat').set(auth).send(input).expect(200)
        assert.equal(modelRequests.length, 2)
        assert.ok(!modelRequests[0].messages[0].content.includes(SKILL_INSTRUCTIONS['contract-drafting']))
        assert.ok(modelRequests[1].messages.some(message => message.role === 'tool' && message.content.includes(SKILL_INSTRUCTIONS['contract-drafting'])))
        assert.match(response.text, /"type":"skill","id":"contract-drafting"/)
        assert.deepEqual((record.payload.messages.at(-1) as unknown as { skillIds: string[] }).skillIds, ['contract-drafting'])
        assert.equal(record.payload.messages.at(-1)?.content, 'hello')
      } finally { automaticSkill = false }
    })
  } finally { globalThis.fetch = originalFetch }
})
