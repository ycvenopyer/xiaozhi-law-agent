import { useEffect, useRef, useState } from 'react';
import {
  ClipboardList,
  FileText,
  X,
  Loader2,
  Newspaper,
  ArrowUpRight,
  Search,
  ScanText,
  Languages,
} from 'lucide-react';
import { IpWorkflow, workflowNames } from './IpWorkflow';
import { DocumentToolPanel } from './DocumentToolPanel';
import { ReportPreview } from './ReportPreview';
import { enterpriseDraftPrompt, enterpriseDrafts } from '@/lib/enterprise-drafts';
import type { KBEntry } from '@/lib/knowledge';
import type { IpNews, WorkbenchGenerate, WorkbenchMode } from '@/lib/agent-client';

import type { WorkflowPrefill } from '../../../../shared/workflow-fields.mjs';

type Tab = 'doc' | 'news' | 'parse' | 'translate';

interface Props {
  entries: KBEntry[];
  imports: Partial<Record<WorkbenchMode, WorkflowPrefill & { id: string; source: string }>>;
  workflow: WorkbenchMode | null;
  open: boolean;
  onClose: () => void;
  /** 调用助理生成文本，实时回传 token。 */
  onGenerate: WorkbenchGenerate;
  generating: boolean;
  onContinue?: () => void;
  onSearchNews: (signal: AbortSignal) => Promise<IpNews>;
  searchConfigured: boolean;
}

type DocType = 'email' | 'risk' | 'dispute';

const DOC_TYPES: { id: DocType; name: string; desc: string }[] = [
  { id: 'email', name: '邮件', desc: '往来沟通 / 进展汇报' },
  { id: 'risk', name: '合规与风控', desc: '清单、意见与制度' },
  { id: 'dispute', name: '争议解决', desc: '诉讼、仲裁与和解' },
];

const EMAIL_SUBTYPES = [
  { id: 'opinion', name: '审查意见转达客户' },
  { id: 'progress', name: '客户进展汇报' },
  { id: 'generic', name: '通用商务邮件' },
];

export function Workbench({ entries, imports, workflow, open, onClose, onGenerate, generating, onContinue, onSearchNews, searchConfigured }: Props) {
  const [tab, setTab] = useState<Tab>('news');

  return (
    <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open} inert={!open}>
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        aria-label={workflow ? workflowNames[workflow] : '事务台'}
        className={`absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-card shadow-xl transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <ClipboardList className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{workflow ? workflowNames[workflow] : '事务台'}</span>
          <div className="ml-auto flex items-center gap-2">
          {generating && <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10">
            转到后台
          </button>}
          {!generating && onContinue && <button type="button" onClick={onContinue} className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
            继续生成
          </button>}
          <button
            aria-label={workflow ? '关闭' + workflowNames[workflow] : '关闭事务台'}
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          </div>
        </div>

        <div className={workflow ? 'hidden' : 'grid shrink-0 grid-cols-2 border-b border-border text-[0.8rem] sm:grid-cols-4'}>
          <TabButton active={tab === 'news'} onClick={() => setTab('news')} icon={<Newspaper className="h-3.5 w-3.5" />}>
            知产新闻
          </TabButton>
          <TabButton active={tab === 'doc'} onClick={() => setTab('doc')} icon={<FileText className="h-3.5 w-3.5" />}>
            文件起草
          </TabButton>
          <TabButton active={tab === 'parse'} onClick={() => setTab('parse')} icon={<ScanText className="size-3.5" />}>
            文档解析
          </TabButton>
          <TabButton active={tab === 'translate'} onClick={() => setTab('translate')} icon={<Languages className="size-3.5" />}>
            专业翻译
          </TabButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {(Object.keys(workflowNames) as WorkbenchMode[]).map(id => <div key={id} hidden={workflow!==id}>
            {imports[id] && <p className="mb-4 break-words rounded-lg bg-muted p-3 text-xs">已从 {imports[id]?.source} 填入，请核对并补充空白项。</p>}
            <IpWorkflow key={imports[id]?.id} prefill={imports[id]} mode={id} entries={entries} onGenerate={onGenerate}/></div>)}
          <div hidden={!!workflow || tab !== 'news'}><NewsTab onSearchNews={onSearchNews} searchConfigured={searchConfigured} /></div>
          <div hidden={!!workflow || tab !== 'doc'}><DocTab onGenerate={onGenerate} /></div>
          <div hidden={!!workflow || tab !== 'parse'}><DocumentToolPanel name="file_parse" onGenerate={onGenerate} /></div>
          <div hidden={!!workflow || tab !== 'translate'}><DocumentToolPanel name="professional_translate" onGenerate={onGenerate} /></div>
        </div>
      </aside>
    </div>
  );
}

function NewsTab({ onSearchNews, searchConfigured }: Pick<Props, 'onSearchNews' | 'searchConfigured'>) {
  const [result, setResult] = useState<IpNews | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function search() {
    if (request.current || !searchConfigured) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const news = await onSearchNews(controller.signal);
      if (!controller.signal.aborted) setResult(news);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '新闻搜索失败，请重试。');
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  const today = result?.date || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', dateStyle: 'short' }).format(new Date());

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-primary/[0.04] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">今日知产新闻</h2>
          <time className="tabular-nums text-xs text-muted-foreground" dateTime={today}>{today} · 北京时间</time>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">检索当天发布的专利、商标、版权及知识产权政策动态，附原文链接。</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{searchConfigured
          ? '由 Tavily 搜索，使用你的 Tavily 额度。'
          : '请在「设置 → 联网搜索」配置 Tavily API Key。'}</p>
        <button type="button" onClick={() => void search()} disabled={busy || !searchConfigured}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-45">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          {busy ? '正在检索…' : '检索今日新闻'}
        </button>
      </section>
      {error && <p role="alert" className="rounded-lg border border-destructive/25 p-3 text-sm leading-6 text-destructive">{error}</p>}
      {result && <div className="space-y-3">
        <p role="status" className="text-xs text-muted-foreground">
          {result.articles.length ? `找到 ${result.articles.length} 条当天的消息，日期以原文为准。` : '本次未找到日期为今天的知产新闻。'}
        </p>
        {result.articles.map(article => (
          <article key={article.url} className="rounded-xl border border-border p-3.5">
            <span className="text-xs text-muted-foreground">{article.source} · {result.date}</span>
            <a href={article.url} target="_blank" rel="noreferrer" className="mt-1.5 flex items-start justify-between gap-2 text-sm font-semibold leading-6 hover:text-primary">
              <span className="break-words">{article.title}</span>
              <ArrowUpRight className="mt-1 size-4 shrink-0 text-primary" />
            </a>
            {article.summary && <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{article.summary}</p>}
          </article>
        ))}
      </div>}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-pressed={active}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function DocTab({ onGenerate }: { onGenerate: WorkbenchGenerate }) {
  const [docType, setDocType] = useState<DocType>('email');
  const [emailSub, setEmailSub] = useState(EMAIL_SUBTYPES[0].id);
  const [recipient, setRecipient] = useState('');
  const [keyInfo, setKeyInfo] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [entries, setEntries] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const groups = docType === 'email' ? [] : enterpriseDrafts[docType];
  const template = groups.flatMap(group => group.templates).find(item => item.name === templateName);
  const email = EMAIL_SUBTYPES.find(item => item.id === emailSub) || EMAIL_SUBTYPES[0];
  const title = template?.name || email.name;
  const field = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none';
  const ready = docType === 'email' ? !!keyInfo.trim() : !!entries[0]?.trim();

  function selectCategory(category: DocType) {
    if (category === docType) return;
    setDocType(category);
    if (category !== 'email') setTemplateName(enterpriseDrafts[category][0].templates[0].name);
    setEntries([]);
    setDraft('');
    setError('');
  }

  async function generate() {
    if (busy || !ready) return;
    setBusy(true);
    setDraft('');
    setError('');
    const prompt = template ? enterpriseDraftPrompt(template, entries) : [
      email.name,
      '请起草一封专业、简洁的邮件，包含标题、称呼、正文和落款。',
      '收件人：' + (recipient.trim() || '待补充'),
      '关键信息：' + keyInfo.trim(),
    ].join('\n\n');
    try {
      setDraft(await onGenerate(prompt, setDraft, { title }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '生成失败，请重试。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={event => { event.preventDefault(); void generate(); }} className="space-y-4">
      <fieldset disabled={busy} className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {DOC_TYPES.map(category => (
            <button key={category.id} type="button" aria-pressed={docType === category.id} onClick={() => selectCategory(category.id)}
              className={'rounded-lg border px-2 py-3 text-center ' + (docType === category.id
                ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50')}>
              <span className="block text-sm font-medium">{category.name}</span>
              <span className="mt-1 block text-[0.68rem] text-muted-foreground">{category.desc}</span>
            </button>
          ))}
        </div>
        {docType === 'email' ? <>
          <label className="grid gap-1.5 text-sm">
            邮件类型
            <select className={field} value={emailSub} onChange={event => setEmailSub(event.target.value)}>
              {EMAIL_SUBTYPES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            收件人
            <input className={field} value={recipient} onChange={event => setRecipient(event.target.value)} placeholder="如客户、审查员" />
          </label>
          <label className="grid gap-1.5 text-sm">
            关键信息
            <textarea className={field} rows={5} maxLength={20000} value={keyInfo} onChange={event => setKeyInfo(event.target.value)}
              placeholder="填写案件进展、需对方确认的事项或邮件要点" />
          </label>
        </> : <>
          <label className="grid gap-1.5 text-sm">
            文书类型
            <select aria-label="文书类型" className={field} value={templateName} onChange={event => { setTemplateName(event.target.value); setEntries([]); setDraft(''); setError(''); }}>
              {groups.map(group => <optgroup key={group.label} label={group.label}>
                {group.templates.map(item => <option key={item.name}>{item.name}</option>)}
              </optgroup>)}
            </select>
          </label>
          {template?.fields.map((label, index) => (
            <label className="grid gap-1.5 text-sm" key={label}>
              {label}
              <textarea className={field} rows={index === 0 ? 3 : 2} maxLength={20000} required={index === 0}
                value={entries[index] || ''} placeholder={index === 0 ? '填写已脱敏的事实' : '尚不清楚可留空'}
                onChange={event => setEntries(previous => {
                  const next = [...previous];
                  next[index] = event.target.value;
                  return next;
                })} />
            </label>
          ))}
        </>}
        <button disabled={!ready}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-45">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
          {busy ? '正在生成…' : docType === 'email' ? '生成邮件草稿' : '生成' + title + '初稿'}
        </button>
      </fieldset>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {draft && <ReportPreview title={title} report={draft} busy={busy} copy />}
    </form>
  );
}
