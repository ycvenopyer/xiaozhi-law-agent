import { useEffect, useRef, useState } from 'react';
import {
  ClipboardList,
  FileText,
  X,
  Copy,
  Check,
  Loader2,
  Newspaper,
  ArrowUpRight,
  Search,
} from 'lucide-react';
import type { IpNews } from '@/lib/agent-client';

type Tab = 'doc' | 'news';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 调用助理生成文本，实时回传 token。 */
  onGenerate: (prompt: string, onToken: (text: string) => void) => Promise<string>;
  onSearchNews: (signal: AbortSignal) => Promise<IpNews>;
  modelLabel: string;
  workspaceBusy: boolean;
}

type DocType = 'email' | 'warning' | 'lawyer';

const DOC_TYPES: { id: DocType; name: string; desc: string }[] = [
  { id: 'email', name: '邮件', desc: '往来沟通 / 进展汇报' },
  { id: 'warning', name: '警告函', desc: '要求停止侵权' },
  { id: 'lawyer', name: '律师函', desc: '正式法律函件' },
];

const EMAIL_SUBTYPES = [
  { id: 'opinion', name: '审查意见转达客户' },
  { id: 'progress', name: '客户进展汇报' },
  { id: 'generic', name: '通用商务邮件' },
];

export function Workbench({ open, onClose, onGenerate, onSearchNews, modelLabel, workspaceBusy }: Props) {
  const [tab, setTab] = useState<Tab>('news');

  return (
    <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open} inert={!open}>
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        aria-label="事务台"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-card shadow-xl transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <ClipboardList className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">事务台</span>
          <button
            aria-label="关闭事务台"
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex shrink-0 border-b border-border text-[0.8rem]">
          <TabButton active={tab === 'news'} onClick={() => setTab('news')} icon={<Newspaper className="h-3.5 w-3.5" />}>
            知产新闻
          </TabButton>
          <TabButton active={tab === 'doc'} onClick={() => setTab('doc')} icon={<FileText className="h-3.5 w-3.5" />}>
            文件起草
          </TabButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          <div hidden={tab !== 'news'}><NewsTab onSearchNews={onSearchNews} modelLabel={modelLabel} workspaceBusy={workspaceBusy} /></div>
          <div hidden={tab !== 'doc'}><DocTab onGenerate={onGenerate} /></div>
        </div>
      </aside>
    </div>
  );
}

function NewsTab({ onSearchNews, modelLabel, workspaceBusy }: Pick<Props, 'onSearchNews' | 'modelLabel' | 'workspaceBusy'>) {
  const [result, setResult] = useState<IpNews | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function search() {
    if (request.current || workspaceBusy) return;
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
        <p className="mt-2 break-words text-xs text-muted-foreground">当前模型：{modelLabel}。联网搜索可能由供应商单独计费。</p>
        <button type="button" onClick={() => void search()} disabled={busy || workspaceBusy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-45">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          {busy ? '正在检索…' : '检索今日新闻'}
        </button>
      </section>
      {error && <p role="alert" className="rounded-lg border border-destructive/25 p-3 text-sm leading-6 text-destructive">{error}</p>}
      {result && <div className="space-y-3">
        <p role="status" className="text-xs text-muted-foreground">
          {result.articles.length ? `找到 ${result.articles.length} 条当天发布的消息` : '本次未找到发布日期为今天的知产新闻。'}
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

function DocTab({ onGenerate }: { onGenerate: Props['onGenerate'] }) {
  const [docType, setDocType] = useState<DocType>('email');
  const [emailSub, setEmailSub] = useState(EMAIL_SUBTYPES[0].id);
  const [recipient, setRecipient] = useState('');
  const [keyInfo, setKeyInfo] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  function buildPrompt(): string {
    const info = keyInfo.trim() || '（无，请基于常见情形生成模板）';
    if (docType === 'email') {
      const sub = EMAIL_SUBTYPES.find((x) => x.id === emailSub)?.name || '通用商务邮件';
      return `你是知识产权律师的办案助理。请起草一封「${sub}」邮件，要求：
1. 收件人：${recipient.trim() || '（默认客户）'}；
2. 基于以下关键信息撰写，语气专业、简洁、可执行；
3. 包含清晰的标题、称呼、正文、落款；
4. 如涉及法定期限或具体法条，请明确标注，但不得编造文号；
5. 直接输出邮件全文，不要额外解释。

关键信息：
${info}`;
    }
    if (docType === 'warning') {
      return `你是知识产权律师的办案助理。请起草一封「警告函」，要求：
1. 发函对象：${recipient.trim() || '（侵权方）'}；
2. 基于以下侵权事实与权利要求撰写，语气正式、严肃、有法律依据；
3. 结构包含：标题、致送对象、事实与侵权认定、法律依据、具体要求（限期停止侵权 / 下架 / 赔偿等）、保留追责声明、落款；
4. 如涉及具体商标 / 专利号或法条，请明确标注，但不得编造；
5. 直接输出警告函全文，不要额外解释。

关键信息：
${info}`;
    }
    return `你是知识产权律师的办案助理。请起草一份「律师函」，要求：
1. 致送对象：${recipient.trim() || '（相关方）'}；
2. 基于以下事实撰写，语气正式、严谨、体现律师身份；
3. 结构包含：标题、律所与承办律师、致送对象、事实陈述、法律分析、具体要求与期限、落款；
4. 如涉及具体商标 / 专利号或法条，请明确标注，但不得编造；
5. 直接输出律师函全文，不要额外解释。

关键信息：
${info}`;
  }

  async function generate() {
    if (busy || !keyInfo.trim()) return;
    setBusy(true);
    setDraft('');
    setCopied(false);
    try {
      await onGenerate(buildPrompt(), setDraft);
    } catch (e) {
      setDraft('⚠️ ' + ((e as Error).message || '生成失败'));
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    navigator.clipboard?.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const recipientPlaceholder =
    docType === 'email'
      ? '收件人（如：客户张先生 / 审查员）'
      : docType === 'warning'
      ? '侵权方 / 收函人（如：某网店经营者）'
      : '致送对象（如：被投诉方 / 对方当事人）';

  const keyPlaceholder =
    docType === 'email'
      ? '关键内容：审查意见要点 / 案件进展 / 需客户确认事项…'
      : docType === 'warning'
      ? '关键内容：侵权事实 / 权利基础（商标或专利号）/ 拟提出的整改与赔偿要求…'
      : '关键内容：委托事项 / 事实经过 / 需对方履行的义务或期限…';

  const genLabel =
    docType === 'email' ? '生成邮件草稿' : docType === 'warning' ? '生成警告函' : '生成律师函';

  return (
    <div className="space-y-3">
      <p className="text-[0.74rem] leading-relaxed text-muted-foreground">
        选文件类型、填关键事实，一键生成可发送 / 可寄送的文书草稿。生成后可复制修改。
      </p>

      {/* 三类文件按钮 */}
      <div className="grid grid-cols-3 gap-2">
        {DOC_TYPES.map((d) => {
          const active = docType === d.id;
          return (
            <button
              key={d.id}
              onClick={() => setDocType(d.id)}
              className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 text-center transition ${
                active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/40'
              }`}
            >
              <span className="text-[0.8rem] font-medium text-foreground">{d.name}</span>
              <span className="text-[0.64rem] leading-tight text-muted-foreground">{d.desc}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {docType === 'email' && (
          <select
            value={emailSub}
            onChange={(e) => setEmailSub(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
          >
            {EMAIL_SUBTYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder={recipientPlaceholder}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
        />
        <textarea
          value={keyInfo}
          onChange={(e) => setKeyInfo(e.target.value)}
          rows={5}
          placeholder={keyPlaceholder}
          className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
        />
        <button
          onClick={generate}
          disabled={busy || !keyInfo.trim()}
          className="flex w-full items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[0.8rem] text-primary-foreground hover:opacity-90 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
          {busy ? '生成中…' : genLabel}
        </button>
      </div>

      {draft && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[0.74rem] font-medium text-foreground">草稿</span>
            <button
              onClick={copy}
              className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[0.68rem] text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-2.5 text-[0.78rem] leading-relaxed">
            {draft}
          </pre>
        </div>
      )}
    </div>
  );
}
