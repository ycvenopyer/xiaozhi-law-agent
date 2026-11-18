import { useState, type FormEvent } from 'react'
import { Markdown } from './Markdown'
import { PatentScreen } from './PatentScreen'
import { downloadReport } from '@/lib/report-export'
import { lawStatus, type KBEntry } from '@/lib/knowledge'
import type { WorkbenchMode } from '@/lib/agent-client'

const choices = {
  compare: ['商标检索比对', '著作权材料比对', '专利 FTO 初筛'],
  infringement: ['商标侵权', '著作权侵权', '商业秘密侵害', '专利检索提示'],
  compliance: [
    '研发合规清单',
    '开源许可证',
    '职务发明权属',
    '商业秘密保护',
    '竞业限制',
    '成果保护策略',
    '合同合规审查',
    '一般咨询',
  ],
  draft: ['保密协议（NDA）', '知识产权许可合同', '职务发明权属约定', '竞业限制协议'],
}
export const workflowNames: Record<WorkbenchMode, string> = {
  compare: '检索比对',
  infringement: '侵权识别',
  compliance: '合规提示',
  draft: '知产文书',
}
const checklist = [
  ['立项', '记录拟实施方案、目标市场与现有权利检索范围'],
  ['研发', '登记人员贡献、职务成果归属和第三方代码许可证'],
  ['测试', '核对测试数据、样品和第三方素材的授权及使用范围'],
  ['发布', '核对商标、版权署名、开源声明及专利申请与公开顺序'],
  ['对外合作', '签署保密和成果归属条款，限定接收人及披露用途'],
]
const input =
  'mt-1.5 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none'
const button =
  'rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-45'
function fieldNames(mode: WorkbenchMode, task: string) {
  if (mode === 'infringement')
    return [
      '权利基础、登记号或底稿',
      '被诉行为、地域及比对材料',
      '行为发生时间',
      '双方关系或许可情况',
      '警告及后续行为',
      '已采取措施',
    ]
  if (mode === 'compare')
    return [
      '权利或作品材料 A',
      '拟使用标识或作品材料 B',
      '商品类别、渠道或使用方式',
      '使用地域、发生时间及是否商用',
    ]
  if (mode === 'draft')
    return [
      '当事人及角色',
      '成果、合作事项与使用范围',
      '期限、地域、价款或补偿',
      '归属、保密及违约要求',
    ]
  switch (task) {
    case '开源许可证':
      return ['组件、版本与许可证原文', '集成、修改及分发方式', '产品用途与拟采用许可证']
    case '成果保护策略':
    case '职务发明权属':
      return ['研发成果形态及贡献人', '雇佣、委托或合作约定', '是否已公开、公开时间及保密措施']
    case '合同合规审查':
      return ['合同类型（保密、许可或竞业）', '脱敏合同全文', '关键交易事实与审查目标']
    case '竞业限制':
      return ['人员职责及接触的信息', '约定范围、期限、地域与补偿', '履行情况及时间']
    case '商业秘密保护':
      return ['信息类别与商业价值', '知悉范围与保密措施', '披露、使用或可能泄露的事实']
    default:
      return ['具体问题及事实', '需要确认的问题或期望行动']
  }
}

function Checklist() {
  const [checked, setChecked] = useState<string[]>([])
  const [project, setProject] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const tasks: Record<string, [string, string]> = {
    使用开源组件: ['软件分发', '记录组件版本、许可证、修改和分发方式，核对署名与源代码交付条件'],
    计划申请专利: ['专利申请', '核对发明人贡献、申请权归属和首次公开计划'],
    使用品牌标识: ['品牌使用', '复核核定商品、标识来源与近似商标的检索记录'],
    向合作方披露: ['对外披露', '列明披露清单、保密期限、用途和返还销毁安排'],
  }
  const items = [...checklist, ...selected.map(task => tasks[task])]
  const count = items.filter(([s]) => checked.includes(s)).length
  return (
    <div className="space-y-3">
      <h3 className="font-medium">研发全流程自查</h3>
      <label>
        项目名称（可选）
        <input className={input} value={project} onChange={e => setProject(e.target.value)} />
      </label>
      <fieldset className="flex flex-wrap gap-2">
        <legend>按项目情况添加检查项</legend>
        {Object.keys(tasks).map(t => (
          <label key={t} className="text-xs">
            <input
              type="checkbox"
              checked={selected.includes(t)}
              onChange={e =>
                setSelected(e.target.checked ? [...selected, t] : selected.filter(s => s !== t))
              }
            />{' '}
            {t}
          </label>
        ))}
      </fieldset>
      {items.map(([stage, item]) => (
        <label key={stage} className="flex gap-3 rounded-lg border p-3">
          <input
            type="checkbox"
            checked={checked.includes(stage)}
            onChange={e =>
              setChecked(e.target.checked ? [...checked, stage] : checked.filter(s => s !== stage))
            }
          />
          <span>
            <strong>{stage}</strong>
            <span className="mt-1 block text-xs">{item}</span>
          </span>
        </label>
      ))}
      <button
        className={button}
        onClick={() =>
          void downloadReport(
            '研发合规检查清单',
            '# 研发合规检查清单\n\n' +
              project +
              '\n\n' +
              items
                .map(([s, i]) => '- [' + (checked.includes(s) ? 'x' : ' ') + '] ' + s + ' · ' + i)
                .join('\n') +
              '\n\n需人工复核'
          )
        }
      >
        导出清单（{count}/{items.length}）
      </button>
    </div>
  )
}

function LocalSearch({ entries }: { entries: KBEntry[] }) {
  const [query, setQuery] = useState('')
  const parts = query.trim().toLowerCase().split(/\s+/)
  const matches = query.trim()
    ? entries.filter(
        e =>
          !e.legacyReference &&
          (!e.official || lawStatus(e) === '现行有效') &&
          parts.every(p => (e.title + ' ' + e.content).toLowerCase().includes(p))
      )
    : []
  return (
    <section className="rounded-lg border bg-muted/25 p-3">
      <label className="block font-medium">
        查找知识库材料
        <input
          className={input}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="如 商标 混淆"
        />
      </label>
      {query.trim() && (
        <p role="status" className="mt-2 text-xs">
          {matches.length ? '匹配 ' + matches.length + ' 条' : '未检索到，需人工核实。'}
        </p>
      )}
      {matches.slice(0, 12).map(e => (
        <details key={e.id} className="mt-2 text-xs">
          <summary className="cursor-pointer">{e.title}</summary>
          <p className="my-2 whitespace-pre-wrap leading-5">{e.content}</p>
          {e.official && (
            <a
              href={e.official.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              核对官方原文
            </a>
          )}
        </details>
      ))}
    </section>
  )
}
type Generate = (
  prompt: string,
  onToken: (text: string) => void,
  workflow?: WorkbenchMode
) => Promise<string>
function AnalysisForm({
  mode,
  task,
  onGenerate,
}: {
  mode: WorkbenchMode
  task: string
  onGenerate: Generate
}) {
  const labels = fieldNames(mode, task)
  const [values, setValues] = useState<Record<string, string>>({})
  const [confirmed, setConfirmed] = useState(false)
  const [report, setReport] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!confirmed || busy) return
    setError('')
    setReport('')
    setBusy(true)
    try {
      const prompt = [task, ...labels.map(l => l + '：' + (values[l]?.trim() || '待补充'))].join(
        '\n\n'
      )
      setReport(await onGenerate(prompt, setReport, mode))
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败，请重试。')
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <fieldset disabled={busy} className="space-y-3">
        {labels.map((l, i) => (
          <label className="block text-sm" key={l}>
            {l}
            <textarea
              className={input}
              rows={i < 2 ? 2 : 1}
              maxLength={20000}
              required={i === 0}
              value={values[l] || ''}
              onChange={e => setValues({ ...values, [l]: e.target.value })}
              placeholder={i === 0 ? '填写已脱敏材料' : '尚不清楚可留空'}
            />
          </label>
        ))}
        <label className="flex items-start gap-2 text-xs leading-5">
          <input
            type="checkbox"
            className="mt-1"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
          />
          我已脱敏，同意将本次材料交给所选模型并保存至当前账号的对话历史。
        </label>
        <button
          disabled={!confirmed || !values[labels[0]]?.trim()}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-45"
        >
          {busy ? '正在生成并核对引文…' : mode === 'draft' ? '生成文书初稿' : '生成初筛报告'}
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {report && (
        <section className="rounded-lg border p-3 text-sm">
          <Markdown content={report} />
          <div className="mt-3 flex gap-2">
            {(['md', 'docx'] as const).map(fmt => (
              <button
                type="button"
                className={button}
                key={fmt}
                onClick={() =>
                  void downloadReport(task, report, fmt).catch(() => setError('导出失败，请重试。'))
                }
              >
                导出 {fmt === 'md' ? 'Markdown' : 'Word'}
              </button>
            ))}
          </div>
        </section>
      )}
    </form>
  )
}

export function IpWorkflow({
  mode,
  entries,
  onGenerate,
}: {
  mode: WorkbenchMode
  entries: KBEntry[]
  onGenerate: Generate
}) {
  const [task, setTask] = useState(choices[mode][0])
  return (
    <div className="space-y-4 text-sm">
      <label className="block font-medium">
        {workflowNames[mode]}事项
        <select className={input} value={task} onChange={e => setTask(e.target.value)}>
          {choices[mode].map(c => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      {task === '专利 FTO 初筛' || task === '专利检索提示' ? (
        <PatentScreen />
      ) : task === '研发合规清单' ? (
        <Checklist />
      ) : (
        <>
          {mode === 'compare' && <LocalSearch entries={entries} />}
          <AnalysisForm key={task} mode={mode} task={task} onGenerate={onGenerate} />
        </>
      )}
    </div>
  )
}
