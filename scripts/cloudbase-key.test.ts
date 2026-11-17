import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { assemblePublishableKey } from '../shared/cloudbase-key.mjs'

const key = `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ role: 'anon', example: 'x'.repeat(1600) })).toString('base64url')}.synthetic-signature`
const pieces = Array.from({ length: Math.ceil(key.length / 900) }, (_, index) => key.slice(index * 900, (index + 1) * 900))
const name = 'VITE_CLOUDBASE_PUBLISHABLE_KEY'
const split = Object.fromEntries(pieces.map((part, index) => [`${name}_PART_${index + 1}`, part]))

test('long Publishable Key round-trips through sub-1000-byte environment variables', () => {
  assert.ok(key.length > 1000)
  assert.ok(pieces.every(part => Buffer.byteLength(part) <= 900))
  assert.equal(assemblePublishableKey(split, name), key)
  assert.equal(assemblePublishableKey({ [name]: key }, name), key)
  assert.equal(assemblePublishableKey({}, name), '')
})

test('missing, conflicting and malformed parts fail without printing key material', () => {
  assert.throws(() => assemblePublishableKey({ ...split, [name]: key }, name), /一种/)
  assert.throws(() => assemblePublishableKey({ [`${name}_PART_2`]: pieces[1] }, name), /连续/)
  assert.throws(() => assemblePublishableKey({ [`${name}_PART_1`]: 'contains space' }, name), /ASCII/)
  assert.throws(() => assemblePublishableKey({ [`${name}_PART_1`]: 'x'.repeat(1001) }, name), /1000/)
  assert.throws(() => assemblePublishableKey({ [`${name}_PART_0`]: 'abc' }, name), /连续/)
  assert.throws(() => assemblePublishableKey({ [`${name}_PART_01`]: 'abc' }, name), /连续/)
  assert.throws(() => assemblePublishableKey(Object.fromEntries(Array.from({ length: 17 }, (_, index) => [`${name}_PART_${index + 1}`, 'abc'])), name), /16/)
})

test('backend normalizes split variables into the key used by its CloudBase client', async () => {
  delete process.env.CLOUDBASE_PUBLISHABLE_KEY
  pieces.forEach((part, index) => { process.env[`CLOUDBASE_PUBLISHABLE_KEY_PART_${index + 1}`] = part })
  const { env } = await import('../backend/src/config/env.ts')
  assert.equal(env.CLOUDBASE_PUBLISHABLE_KEY, key)
})

test('Windows helper respects the size limit and refuses a service_role key', { skip: process.platform !== 'win32' }, () => {
  const result = spawnSync('powershell', ['-NoProfile', '-File', 'scripts/split-cloudbase-key.ps1', '-Key', key, '-CheckOnly'], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  const metadata = JSON.parse(result.stdout)
  assert.equal(metadata.Total, key.length)
  assert.equal(metadata.Parts, pieces.length)
  assert.ok(metadata.Lengths.every((length: number) => length <= 900))
  assert.ok(!result.stdout.includes(key))
  const adminKey = `e30.${Buffer.from('{"role":"service_role"}').toString('base64url')}.synthetic-signature`
  const refused = spawnSync('powershell', ['-NoProfile', '-File', 'scripts/split-cloudbase-key.ps1', '-Key', adminKey, '-CheckOnly'], { encoding: 'utf8' })
  assert.notEqual(refused.status, 0)
  assert.ok(!refused.stdout.includes(adminKey))
})
