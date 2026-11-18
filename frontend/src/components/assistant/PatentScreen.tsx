import { useMemo, useState } from 'react'
import { useAccountId } from './CloudAccount'
import { loadCollection, saveCollection } from '@/lib/cloud-store'
import { downloadReport } from '@/lib/report-export'
import {
  columns,
  fields,
  guessMapping,
  ManualCsvProvider,
  proposeFeatures,
  screen,
  searchExpressions,
  termsOf,
  type CsvTable,
  type Feature,
  type Mapping,
  type Field,
} from '@/lib/fto'

const control = 'mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm'
const button =
  'rounded-md border border-border px-3 py-2 text-xs hover:bg-muted disabled:opacity-40'
const disclaimer = '仅供公开专利检索初筛。初筛等级，非侵权结论。法律状态与保护范围需人工复核。'
type Review = { choice?: string; note?: string }

export function PatentScreen() {
  const accountId = useAccountId()
  const [stage, setStage] = useState(0)
  const [allowed, setAllowed] = useState(false)
  const [plan, setPlan] = useState('')
  const [markets, setMarkets] = useState<string[]>([])
  const [exclusions, setExclusions] = useState('')
  const [features, setFeatures] = useState<Feature[]>([])
  const [csv, setCsv] = useState<CsvTable | null>(null)
  const [mapping, setMapping] = useState<Mapping>(() => guessMapping([]))
  const [reviews, setReviews] = useState<Record<string, Review>>({})
  const [source, setSource] = useState('')
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState('原始顺序')
  const [limit, setLimit] = useState(30)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const expressions = searchExpressions(features, exclusions)
  const candidates = useMemo(
    () => (csv ? screen(csv, mapping, features) : []),
    [csv, mapping, features]
  )
  const filtered = candidates.filter(c => !filter || c.risk === filter)
  if (sort === '初筛等级')
    filtered.sort(
      (a, b) =>
        ['高', '中', '低', '待核验'].indexOf(a.risk) - ['高', '中', '低', '待核验'].indexOf(b.risk)
    )
  if (sort === '公开日') filtered.sort((a, b) => b.published.localeCompare(a.published))
  function edit(id: string, patch: Partial<Feature>) {
    setFeatures(previous => previous.map(f => (f.id === id ? { ...f, ...patch } : f)))
  }
  function review(id: string, patch: Review) {
    setReviews(previous => ({ ...previous, [id]: { ...previous[id], ...patch } }))
  }
  async function act(work: () => Promise<void>) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await work()
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败，请重试。')
    } finally {
      setBusy(false)
    }
  }
  async function read(file: File) {
    const table = await ManualCsvProvider.read(file)
    const template = loadCollection<{ id: string; mapping?: Partial<Record<Field, string>> }>(
      'settings'
    ).find(s => s.id === 'fto-csv-mapping')
    setCsv(table)
    setMapping(guessMapping(table.headers, template?.mapping))
    setReviews({})
    setLimit(30)
    setSource('')
  }
  const gaps = [
    !features.length && '特征清单',
    stage < 2 && '特征确认',
    stage < 3 && '检索式确认及外部执行',
    !csv && '外部检索 CSV',
    !source.trim() && '数据库及检索时间',
    ...(csv ? fields.filter(k => mapping[k] < 0).map(k => columns[k][0]) : []),
  ].filter(Boolean)
  function report() {
    const lines = [
      disclaimer,
      '# 专利检索初筛报告',
      gaps.length ? '未完成环节：' + gaps.join('、') : '流程记录完整',
      '## 技术方案',
      plan,
      '目标市场：' + markets.join('、'),
      '排除项：' + (exclusions || '无'),
      '## 特征及关键词',
      ...features.map(
        f =>
          `- ${f.id} ${f.description}（${f.type}，${f.necessary ? '必要' : '可选'}，${f.excluded ? '排除' : '纳入'}，${f.locked ? '锁定' : '可编辑'}） · ${f.terms}`
      ),
      '## 检索式',
      'Google Patents 全文检索；目标国家或地区在结果页筛选。',
      ...expressions.rows.map(row => row.id + ' ' + row.query),
      expressions.combined,
      '## CSV 来源及映射',
      source || '来源待补',
      csv
        ? `${csv.name} · ${csv.encoding} · ${csv.delimiter === ',' ? '逗号' : '制表符'} · ${csv.rows.length} 行，去重后 ${candidates.length} 条`
        : '未导入',
      ...fields.map(k => columns[k][0] + ' ← ' + (csv?.headers[mapping[k]] || '未映射')),
      '## 候选与复核',
      ...candidates.map(c =>
        [
          c.publication || '公开号缺失',
          c.title,
          c.applicant,
          c.filed,
          c.published,
          '法律状态（CSV）：' + c.status,
          '初筛：' + c.risk,
          '命中：' + (c.hits.join('、') || '无'),
          c.reason,
          reviews[c.id]?.choice || '待复核',
          reviews[c.id]?.note || '',
          /^[A-Z]{2}[A-Z0-9]+$/.test(c.id) &&
            'https://patents.google.com/patent/' + encodeURIComponent(c.id),
        ]
          .filter(Boolean)
          .join(' · ')
      ),
      disclaimer,
    ]
    return lines.join('\n\n')
  }
  return (
    <section aria-label="专利 FTO 初筛" className="space-y-4 text-sm">
      <h3 className="font-semibold">专利 FTO 初筛</h3>
      <p className="rounded-lg bg-muted p-3 text-xs leading-5">
        {disclaimer} 方案与 CSV 在当前页面处理。
      </p>
      {stage === 0 && (
        <>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={allowed} onChange={e => setAllowed(e.target.checked)} />
            我确认方案已公开、已申请，或已将未公开内容脱敏。
          </label>
          <fieldset disabled={!allowed} className="space-y-3 disabled:opacity-50">
            <label className="block">
              技术方案
              <textarea
                className={control}
                rows={3}
                value={plan}
                onChange={e => setPlan(e.target.value)}
                placeholder="每行一个技术特征"
              />
            </label>
            <fieldset>
              <legend>目标市场（多选）</legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {['中国', '美国', '欧洲', '日本', '韩国', '其他'].map(m => (
                  <label key={m}>
                    <input
                      type="checkbox"
                      checked={markets.includes(m)}
                      onChange={e =>
                        setMarkets(
                          e.target.checked ? [...markets, m] : markets.filter(x => x !== m)
                        )
                      }
                    />{' '}
                    {m}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block">
              排除词（可选，以 | 分隔）
              <input
                className={control}
                value={exclusions}
                onChange={e => setExclusions(e.target.value)}
              />
            </label>
            <button
              className={button}
              disabled={!plan.trim() || !markets.length}
              onClick={() => {
                setFeatures(proposeFeatures(plan))
                setReviews({})
                setCsv(null)
                setStage(1)
              }}
            >
              提取特征
            </button>
          </fieldset>
        </>
      )}
      {stage === 1 && (
        <>
          <h4 className="font-medium">核对技术特征</h4>
          {features.map(f => (
            <div key={f.id} className="space-y-2 rounded-lg border p-3">
              <label>
                {f.id}
                <input
                  aria-label={f.id + ' 描述'}
                  className={control}
                  value={f.description}
                  onChange={e => edit(f.id, { description: e.target.value })}
                />
              </label>
              <div className="flex items-center gap-3">
                <select
                  aria-label={f.id + ' 类型'}
                  value={f.type}
                  onChange={e => edit(f.id, { type: e.target.value })}
                >
                  {['技术特征', '结构', '方法', '材料', '功能'].map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <label>
                  <input
                    type="checkbox"
                    checked={f.necessary}
                    onChange={e => edit(f.id, { necessary: e.target.checked })}
                  />{' '}
                  必要
                </label>
                <button
                  className={button}
                  onClick={() => setFeatures(features.filter(x => x.id !== f.id))}
                >
                  移除 {f.id}
                </button>
              </div>
            </div>
          ))}
          <button
            className={button}
            onClick={() =>
              setFeatures([
                ...features,
                {
                  ...proposeFeatures('新特征')[0],
                  id: 'F' + (1 + Math.max(0, ...features.map(f => Number(f.id.slice(1))))),
                },
              ])
            }
          >
            添加特征
          </button>
          <button
            className={button}
            disabled={!features.length || features.some(f => !f.description.trim())}
            onClick={() => {
              setFeatures(
                features.map(f => ({
                  ...f,
                  terms: proposeFeatures(f.description)
                    .map(x => x.terms)
                    .join(' | '),
                }))
              )
              setStage(2)
            }}
          >
            确认特征并扩展关键词
          </button>
        </>
      )}
      {stage === 2 && (
        <>
          <h4 className="font-medium">核对检索词与检索式</h4>
          <p className="text-xs text-muted-foreground">
            每组可补充同义词、上位词、下位词及英文词，用 | 分隔。必要特征之间取交集。
          </p>
          {features.map(f => (
            <div key={f.id} className="rounded-lg border p-3">
              <label>
                {f.id} · {f.description}
                <textarea
                  rows={2}
                  className={control}
                  disabled={f.locked || f.excluded}
                  value={f.terms}
                  onChange={e => edit(f.id, { terms: e.target.value })}
                />
              </label>
              <div className="flex gap-3">
                <label>
                  <input
                    type="checkbox"
                    checked={f.locked}
                    onChange={e => edit(f.id, { locked: e.target.checked })}
                  />{' '}
                  锁定
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={f.excluded}
                    onChange={e => edit(f.id, { excluded: e.target.checked })}
                  />{' '}
                  排除整组
                </label>
              </div>
            </div>
          ))}
          {expressions.combined &&
            [...expressions.rows, { id: '聚合', query: expressions.combined }].map(row => (
              <div key={row.id} className="rounded-lg bg-muted p-3">
                <p className="break-words text-xs">
                  {row.id} · {row.query}
                </p>
                <button
                  className={button}
                  onClick={() =>
                    void act(async () => {
                      await navigator.clipboard.writeText(row.query)
                      setMessage('已复制检索式。')
                    })
                  }
                >
                  复制 {row.id}
                </button>
              </div>
            ))}
          <p className="text-xs leading-5">
            在{' '}
            <a
              className="underline"
              href="https://patents.google.com/"
              target="_blank"
              rel="noreferrer"
            >
              Google Patents
            </a>{' '}
            的全文字段执行分项或聚合检索，按目标市场筛选，记录日期并导出
            CSV。专利法律状态请到相应主管机关核对。
          </p>
          <button
            className={button}
            disabled={
              !expressions.combined || features.some(f => !f.excluded && !termsOf(f.terms).length)
            }
            onClick={() => setStage(3)}
          >
            进入 CSV 回填
          </button>
        </>
      )}
      {stage === 3 && (
        <>
          <label className="block">
            外部检索结果 CSV / TSV
            <input
              type="file"
              accept=".csv,.tsv,.txt"
              disabled={busy}
              className={control}
              onChange={e => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void act(() => read(f))
              }}
            />
          </label>
          {csv && (
            <>
              <p>
                {csv.name} · {csv.encoding} · {csv.delimiter === ',' ? '逗号' : '制表符'} ·{' '}
                {csv.rows.length} 行
              </p>
              <label className="block">
                数据库与检索日期
                <input
                  className={control}
                  value={source}
                  onChange={e => setSource(e.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                {fields.map(k => (
                  <label key={k}>
                    {columns[k][0]}
                    <select
                      className={control}
                      value={mapping[k]}
                      onChange={e => {
                        setMapping({ ...mapping, [k]: Number(e.target.value) })
                        setReviews({})
                      }}
                    >
                      {[
                        <option value={-1} key="-1">
                          未映射
                        </option>,
                        ...csv.headers.map((h, i) => (
                          <option key={i} value={i}>
                            {h}
                          </option>
                        )),
                      ]}
                    </select>
                  </label>
                ))}
              </div>
              <button
                className={button}
                disabled={busy || !accountId}
                onClick={() =>
                  void act(async () => {
                    await saveCollection(
                      'settings',
                      [
                        {
                          id: 'fto-csv-mapping',
                          mapping: Object.fromEntries(
                            fields.map(k => [k, csv.headers[mapping[k]] || ''])
                          ),
                        },
                      ],
                      false
                    )
                    setMessage('字段映射已保存至当前账号。')
                  })
                }
              >
                保存字段映射
              </button>
              {(mapping.publication < 0 || csv.rows.some(r => !r[mapping.publication])) && (
                <p>缺公开号的记录无法去重和生成报告链接。</p>
              )}
              {mapping.status < 0 && <p>缺法律状态，全部标为未核验。</p>}
              <p>去重后 {candidates.length} 条 · 初筛等级，非侵权结论</p>
              <select
                aria-label="筛选初筛等级"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              >
                <option value="">全部等级</option>
                {['高', '中', '低', '待核验'].map(v => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              <select aria-label="候选排序" value={sort} onChange={e => setSort(e.target.value)}>
                {['原始顺序', '初筛等级', '公开日'].map(v => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              {filtered.slice(0, limit).map(c => (
                <article className="space-y-2 rounded-lg border p-3" key={c.id}>
                  <h4 className="font-medium">{c.title || '标题缺失'}</h4>
                  <p className="text-xs">
                    {c.publication || '公开号缺失'} · 初筛{c.risk} · 法律状态（CSV）{c.status}
                  </p>
                  <p className="text-xs">
                    {c.reason}。命中 {c.hits.join('、') || '无'}。
                  </p>
                  <select
                    aria-label="复核选择"
                    value={reviews[c.id]?.choice || '待复核'}
                    onChange={e => review(c.id, { choice: e.target.value })}
                  >
                    {['待复核', '纳入', '排除'].map(s => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <input
                    aria-label="复核备注"
                    placeholder="复核备注"
                    className={control}
                    value={reviews[c.id]?.note || ''}
                    onChange={e => review(c.id, { note: e.target.value })}
                  />
                </article>
              ))}
              {filtered.length > limit && (
                <button className={button} onClick={() => setLimit(limit + 30)}>
                  显示更多候选
                </button>
              )}
            </>
          )}
        </>
      )}
      {allowed && plan.trim() && (
        <div className="flex flex-wrap gap-2 border-t pt-3">
          {stage > 0 && (
            <button
              disabled={busy}
              className={button}
              onClick={() => {
                setStage(stage - 1)
                setCsv(null)
                setReviews({})
                setSource('')
                setMessage('')
                setError('')
              }}
            >
              上一步
            </button>
          )}
          {(['md', 'docx'] as const).map(fmt => (
            <button
              className={button}
              key={fmt}
              disabled={busy}
              onClick={() => void act(() => downloadReport('专利初筛报告', report(), fmt))}
            >
              导出 {fmt === 'md' ? 'Markdown' : 'Word'}
            </button>
          ))}
        </div>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}
