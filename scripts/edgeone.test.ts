import assert from 'node:assert/strict'
import { test } from 'node:test'
import request from 'supertest'

// Test credentials are deliberately synthetic; never call a real model here.
process.env.NODE_ENV = 'test'
process.env.API_PREFIX = '/api'
process.env.ZHIPU_API_KEY = 'test-only'
process.env.SILICONFLOW_API_KEY = ''
process.env.OPENROUTER_API_KEY = ''
process.env.LOG_LEVEL = 'silent'

const { default: app } = await import('../cloud-functions/api/[[default]].ts')
const client = await import('../frontend/src/lib/agent-client.ts')

test('Cloud Functions API and payload boundaries', async (t) => {
  await t.test('full and stripped API paths reach the same Express routes', async () => {
    for (const path of ['/api/ping', '/ping', '/api/health', '/health', '/api/agent/models']) {
      await request(app).get(path).expect(200).expect('Content-Type', /json/)
    }
    await request(app).get('/api/missing').expect(404)
  })

  await t.test('small text uploads parse; oversized uploads return a useful 413', async () => {
    const small = await request(app).post('/api/agent/files')
      .attach('file', Buffer.from('sample dossier'), 'case.txt').expect(200)
    assert.equal(small.body.text, 'sample dossier')
    const large = await request(app).post('/api/agent/files')
      .attach('file', Buffer.alloc(4 * 1024 * 1024 + 1), 'large.txt').expect(413)
    assert.match(large.body.message, /4 MiB/)
    const json = await request(app).post('/api/agent/chat')
      .send({ messages: [{ role: 'user', content: 'x'.repeat(5 * 1024 * 1024) }] }).expect(413)
    assert.match(json.body.message, /5 MiB/)
  })

  await t.test('frontend blocks oversized files and UTF-8 JSON before fetching', async () => {
    await assert.rejects(client.uploadFile(new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'large.txt')), /4 MiB/)
    await assert.rejects(client.extractDossier({ text: '汉'.repeat(2 * 1024 * 1024) }), /5 MiB/)
    const stream = client.streamChat([{ role: 'user', content: '汉'.repeat(2 * 1024 * 1024) }] as never)
    await assert.rejects(stream.next(), /5 MiB/)
  })

  await t.test('mock model tokens stream without compression on both path forms', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(
      'data: {"choices":[{"delta":{"content":"hello"}}]}\n\ndata: [DONE]\n\n',
      { headers: { 'Content-Type': 'text/event-stream' } }
    )
    try {
      for (const path of ['/api/agent/chat', '/agent/chat']) {
        const result = await request(app).post(path).set('Accept-Encoding', 'gzip')
          .send({ messages: [{ role: 'user', content: 'hello' }] }).expect(200)
        assert.match(result.headers['content-type'], /text\/event-stream/)
        assert.equal(result.headers['content-encoding'], undefined)
        assert.match(result.text, /hello/)
        assert.match(result.text, /"type":"done"/)
      }
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  await t.test('deadlines abort the upstream and finish chat / extraction responses', async () => {
    const originalFetch = globalThis.fetch
    const originalTimeout = globalThis.setTimeout
    let abortCount = 0
    globalThis.fetch = async (_url, init) => new Promise((_resolve, reject) => {
      const abort = () => { abortCount++; reject(new Error('aborted')) }
      if (init?.signal?.aborted) abort()
      else init?.signal?.addEventListener('abort', abort, { once: true })
    })
    // Only accelerate the request deadline; leave all other timers intact.
    globalThis.setTimeout = ((fn, ms, ...args) =>
      originalTimeout(fn, ms === 110_000 ? 25 : ms, ...args)) as typeof setTimeout
    try {
      const chat = await request(app).post('/api/agent/chat')
        .send({ messages: [{ role: 'user', content: 'hello' }] }).expect(200)
      assert.match(chat.text, /110 秒/)
      const dossier = await request(app).post('/api/agent/extract-dossier')
        .send({ text: 'sample dossier' }).expect(504)
      assert.match(dossier.body.message, /110 秒/)
      assert.equal(abortCount, 2)
    } finally {
      globalThis.fetch = originalFetch
      globalThis.setTimeout = originalTimeout
    }
  })
})
