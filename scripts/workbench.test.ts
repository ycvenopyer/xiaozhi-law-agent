import assert from 'node:assert/strict'
import test from 'node:test'
import library from '../shared/law-library.json'
import { generateReport } from '../backend/src/modules/agent/workbench-report'
import {
  ManualCsvProvider,
  guessMapping,
  proposeFeatures,
  screen,
  searchExpressions,
} from '../frontend/src/lib/fto'
import { kbToText, loadKB } from '../frontend/src/lib/knowledge'

test('risk scenarios retrieve dated, enabled, official articles', () => {
  const kb = loadKB()
  for (const [query, id] of [
    ['商标冲突', 'law-tm19-57'],
    ['开源许可证', 'law-software-8'],
    ['职务发明权属', 'law-pat-6'],
    ['商业秘密泄露', 'law-uc-10'],
    ['竞业限制', 'law-labor-24'],
  ])
    assert.match(kbToText(kb, query, '2026-11-18'), new RegExp(id + '】'))
  const before = kbToText(kb, '商标侵权', '2026-12-31')
  const after = kbToText(kb, '商标侵权', '2027-01-01')
  assert.doesNotMatch(before, /law-tm26-/)
  assert.doesNotMatch(after, /law-tm19-/)
  assert.match(after, /law-tm26-72】/)
  assert.doesNotMatch(
    kbToText(
      kb.filter(a => a.id !== 'law-uc-10'),
      '商业秘密'
    ),
    /法规原文 law-uc-10】/
  )
})

test('structured reports retry a fabricated quote before emitting or persisting text', async () => {
  const law = library.laws.find(l => l.id === 'pat')!
  const a = law.articles.find(a => a.number === 6)!
  const knowledge = '【法规原文 law-pat-6】' + a.content
  let attempts = 0
  const provider = {
    id: 'test',
    label: 'test',
    baseUrl: 'https://example.test',
    apiKey: 'fixture',
    free: true,
    model: 'mock',
    completion: async () => {
      attempts++
      const body = {
        risk: '无法判断',
        conclusion: '需要核对权属约定。',
        analysis: '缺少合作合同。',
        actions: ['核对合同。'],
        references: [
          {
            id: 'law-pat-6',
            quote: attempts === 1 ? '不在原文中的引述' : a.content.slice(0, 24),
          },
        ],
        questions: ['研发任务由谁安排？'],
      }
      return new Response(
        'data: ' +
          JSON.stringify({
            choices: [{ delta: { content: JSON.stringify(body) } }],
          }) +
          '\n\ndata: [DONE]\n\n'
      )
    },
  }
  const report = await generateReport(
    'compliance',
    '职务发明权属',
    knowledge,
    provider,
    new AbortController().signal
  )
  assert.equal(attempts, 2)
  assert.ok(report.includes(law.source_url) && report.endsWith('需人工复核'))
  assert.match(report, /第六条第1款/)
  assert.doesNotMatch(report, /不在原文中的引述/)
  const unverified = await generateReport(
    'compliance',
    '职务发明权属',
    '',
    provider,
    new AbortController().signal
  )
  assert.match(unverified, /无法判断。支撑结论的引文未通过核验/)
  assert.doesNotMatch(unverified, /缺少合作合同|需要核对权属约定/)
  const callsBefore = attempts
  const incomplete = await generateReport(
    'infringement',
    '商标侵权\n行为发生时间：待补充',
    '',
    provider,
    new AbortController().signal
  )
  assert.match(incomplete, /行为发生时间具体是什么/)
  assert.equal(attempts, callsBefore)
  await assert.rejects(
    generateReport('draft', '保密协议', knowledge, provider, new AbortController().signal)
  )
})

test('CSV import supports quoted records, reusable mappings, deduplication and unknown status', async () => {
  const features = proposeFeatures('传感器；电池')
  const table = await ManualCsvProvider.read(
    new File(
      [
        'search URL: https://example.test/search\r\nid,title,abstract\r\nCN-123-A,"Sensor, battery","two\nlines"\r\nCN123A,duplicate,duplicate\r\n,无公开号,无摘要',
      ],
      'fixture.csv'
    )
  )
  const mapping = guessMapping(table.headers)
  const result = screen(table, mapping, features)
  assert.equal(result.length, 2)
  assert.equal(result[0].status, '未核验')
  assert.deepEqual(result[0].hits, ['F1', 'F2'])
  assert.equal(result[0].risk, '高')
  assert.equal(result[1].risk, '待核验')
  assert.equal(guessMapping(['编号', '摘要'], { publication: '编号' }).publication, 0)
  assert.equal(guessMapping(['标题', '摘要']).publication, -1)
  await assert.rejects(ManualCsvProvider.read(new File(['标题,摘要\n"残缺,摘要'], 'bad.csv')))
  for (const term of ['电池', '显示屏', '无线通信', '图像识别', '温度传感器']) {
    const expr = searchExpressions(proposeFeatures(term), '排除项')
    assert.ok(
      expr.combined.includes(term) &&
        expr.combined.includes(' OR ') &&
        expr.combined.endsWith('-"排除项"')
    )
  }
})
