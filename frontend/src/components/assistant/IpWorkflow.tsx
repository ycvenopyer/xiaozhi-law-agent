import { useState, type FormEvent } from 'react'
import { PatentScreen } from './PatentScreen'
import { ReportPreview } from './ReportPreview'
import { lawStatus, type KBEntry } from '@/lib/knowledge'
import type { WorkbenchGenerate, WorkbenchMode } from '@/lib/agent-client'

import { choices, fieldNames, type WorkflowPrefill } from '../../../../shared/workflow-fields.mjs'

export const workflowNames: Record<WorkbenchMode, string> = {
  compare: '检索对比',
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
function useWorkflowReport(onGenerate: WorkbenchGenerate, mode: WorkbenchMode) {
  const [report, setReport] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function generate(prompt: string) {
    if (busy) return
    setReport('')
    setError('')
    setBusy(true)
    try {
      setReport(await onGenerate(prompt, setReport, { workflow: mode }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '生成失败，请重试。')
    } finally {
      setBusy(false)
    }
  }
  return { report, busy, error, generate }
}

function Checklist({ values, onGenerate }: { values?: Record<string, string>; onGenerate: WorkbenchGenerate }) {
  const [checked, setChecked] = useState<string[]>([])
  const [project, setProject] = useState(values?.['项目名称'] || '')
  const [selected, setSelected] = useState<string[]>(values?.['项目情况']?.split('|') || [])
  const [confirmed, setConfirmed] = useState(false)
  const { report, busy, error, generate } = useWorkflowReport(onGenerate, 'compliance')
  const tasks: Record<string, [string, string]> = {
    使用开源组件: ['软件分发', '记录组件版本、许可证、修改和分发方式，核对署名与源代码交付条件'],
    计划申请专利: ['专利申请', '核对发明人贡献、申请权归属和首次公开计划'],
    使用品牌标识: ['品牌使用', '复核核定商品、标识来源与近似商标的检索记录'],
    向合作方披露: ['对外披露', '列明披露清单、保密期限、用途和返还销毁安排'],
  }
  const items = [...checklist, ...selected.filter(task => Object.hasOwn(tasks, task)).map(task => tasks[task])]
  const count = items.filter(([s]) => checked.includes(s)).length

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!confirmed) return
    const facts = [
      '研发合规清单',
      '项目名称：' + (project.trim() || '待补充'),
      '项目情况：' + (selected.join('、') || '待补充'),
      ...items.map(([stage, item]) => '- ' + stage + '：' + item + '（' + (checked.includes(stage) ? '已勾选' : '待核实') + '）'),
    ]
    void generate(facts.join('\n'))
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <fieldset disabled={busy} className="space-y-3">
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
        <p className="text-xs text-muted-foreground">已勾选 {count}/{items.length} 项</p>
        <label className="flex items-start gap-2 text-xs leading-5">
          <input type="checkbox" className="mt-1" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
          我已脱敏，同意将本次材料交给所选模型并保存至当前账号的对话历史。
        </label>
        <button disabled={!confirmed}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-45">
          {busy ? '正在生成合规提示…' : '生成合规提示初稿'}
        </button>
      </fieldset>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {report && <ReportPreview report={report} title="研发合规提示初稿" busy={busy} />}
    </form>
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
function AnalysisForm({
  mode,
  initialValues,
  task,
  onGenerate,
}: {
  mode: WorkbenchMode
  task: string
  initialValues?: Record<string, string>
  onGenerate: WorkbenchGenerate
}) {
  const labels = fieldNames(mode, task)
  const [values, setValues] = useState<Record<string, string>>(initialValues || {})
  const [confirmed, setConfirmed] = useState(false)
  const { report, busy, error, generate } = useWorkflowReport(onGenerate, mode)
  function submit(e: FormEvent) {
    e.preventDefault()
    if (!confirmed || busy) return
    const prompt = [task, ...labels.map(l => l + '：' + (values[l]?.trim() || '待补充'))].join('\n\n')
    void generate(prompt)
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <fieldset disabled={busy} className="space-y-3">
        {labels.map((l, i) => (
          <label className="block text-sm" key={l}>
            {l}
            <textarea
              aria-label={l}
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
      {report && <ReportPreview key={task} title={task} report={report} busy={busy} />}
    </form>
  )
}

export function IpWorkflow({
  mode,
  entries,
  prefill,
  onGenerate,
}: {
  mode: WorkbenchMode
  entries: KBEntry[]
  prefill?: WorkflowPrefill
  onGenerate: WorkbenchGenerate
}) {
  const [task, setTask] = useState(prefill?.task || choices[mode][0])
  const initialValues = task === prefill?.task ? prefill.values : undefined
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
        <PatentScreen values={initialValues} />
      ) : task === '研发合规清单' ? (
        <Checklist values={initialValues} onGenerate={onGenerate} />
      ) : (
        <>
          {mode === 'compare' && <LocalSearch entries={entries} />}
          <AnalysisForm initialValues={initialValues} key={task} mode={mode} task={task} onGenerate={onGenerate} />
        </>
      )}
    </div>
  )
}
