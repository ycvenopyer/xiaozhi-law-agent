import { useEffect, useState } from 'react';
import {
  CalendarClock,
  ClipboardList,
  FileText,
  Newspaper,
  Users,
  X,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import {
  loadDeadlines,
  saveDeadlines,
  daysLeft,
  urgencyClass,
  DEADLINE_TYPES,
  loadConflicts,
  saveConflicts,
  screenConflicts,
  type Deadline,
  type ConflictMatter,
} from '@/lib/workbench';

type Tab = 'deadline' | 'doc' | 'news' | 'conflict';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 调用助理生成文本（邮件草稿 / 新闻汇总），实时回传 token。 */
  onGenerate: (prompt: string, onToken: (text: string) => void) => Promise<string>;
  /** 当前卷宗的当事人，用于预填期限台账的案号。 */
  dossierCaseName?: string;
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

export function Workbench({ open, onClose, onGenerate, dossierCaseName }: Props) {
  const [tab, setTab] = useState<Tab>('deadline');

  return (
    <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-card shadow-xl transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <ClipboardList className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">事务台</span>
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex border-b border-border text-[0.8rem]">
          <TabButton active={tab === 'deadline'} onClick={() => setTab('deadline')} icon={<CalendarClock className="h-3.5 w-3.5" />}>
            期限台账
          </TabButton>
          <TabButton active={tab === 'doc'} onClick={() => setTab('doc')} icon={<FileText className="h-3.5 w-3.5" />}>
            文件起草
          </TabButton>
          <TabButton active={tab === 'news'} onClick={() => setTab('news')} icon={<Newspaper className="h-3.5 w-3.5" />}>
            知产新闻
          </TabButton>
          <TabButton active={tab === 'conflict'} onClick={() => setTab('conflict')} icon={<Users className="h-3.5 w-3.5" />}>
            利益冲突
          </TabButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === 'deadline' && <DeadlineTab dossierCaseName={dossierCaseName} />}
          {tab === 'doc' && <DocTab onGenerate={onGenerate} />}
          {tab === 'news' && <NewsTab onGenerate={onGenerate} />}
          {tab === 'conflict' && <ConflictTab onGenerate={onGenerate} />}
        </div>
      </aside>
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

/* ----------------------------- 期限台账 ----------------------------- */

function DeadlineTab({ dossierCaseName }: { dossierCaseName?: string }) {
  const [list, setList] = useState<Deadline[]>(() => loadDeadlines());
  const [caseName, setCaseName] = useState(dossierCaseName || '');
  const [type, setType] = useState(DEADLINE_TYPES[0]);
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (dossierCaseName) setCaseName(dossierCaseName);
  }, [dossierCaseName]);

  function persist(next: Deadline[]) {
    setList(next);
    saveDeadlines(next);
  }

  function add() {
    if (!caseName.trim() || !dueDate) return;
    const item: Deadline = {
      id: crypto.randomUUID(),
      caseName: caseName.trim(),
      matter: '',
      type,
      dueDate,
      note: note.trim(),
      done: false,
    };
    persist([...list, item].sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
    setNote('');
    setDueDate('');
  }

  function toggle(id: string) {
    persist(list.map((d) => (d.id === id ? { ...d, done: !d.done } : d)));
  }

  function remove(id: string) {
    persist(list.filter((d) => d.id !== id));
  }

  return (
    <div className="space-y-3">
      <p className="text-[0.74rem] leading-relaxed text-muted-foreground">
        登记每个案件的法定期限节点。漏期可能直接导致失权，请如实填写，系统按剩余天数高亮临期项。
      </p>

      <div className="space-y-2 rounded-lg border border-border p-3">
        <input
          value={caseName}
          onChange={(e) => setCaseName(e.target.value)}
          placeholder="案件 / 当事人（如：A公司诉B公司商标侵权案）"
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
        />
        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
          >
            {DEADLINE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
          />
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="备注（如：限15日内提交答辩状）"
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
        />
        <button
          onClick={add}
          disabled={!caseName.trim() || !dueDate}
          className="flex w-full items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[0.8rem] text-primary-foreground hover:opacity-90 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" /> 添加期限
        </button>
      </div>

      {list.length === 0 ? (
        <p className="py-6 text-center text-[0.78rem] text-muted-foreground">还没有期限记录</p>
      ) : (
        <ul className="space-y-2">
          {list.map((d) => {
            const left = daysLeft(d.dueDate);
            const leftText =
              left === null
                ? '日期无效'
                : d.done
                ? '已完成'
                : left < 0
                ? `已逾期 ${Math.abs(left)} 天`
                : `剩余 ${left} 天`;
            return (
              <li
                key={d.id}
                className={`flex items-start gap-2 rounded-lg border border-border p-2.5 ${
                  d.done ? 'opacity-60' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[0.66rem] text-primary">
                      {d.type}
                    </span>
                    <span className="truncate text-[0.82rem] font-medium">{d.caseName}</span>
                  </div>
                  {d.note && (
                    <div className="mt-0.5 truncate text-[0.74rem] text-muted-foreground">{d.note}</div>
                  )}
                  <div className="mt-0.5 text-[0.72rem] text-muted-foreground">
                    {d.dueDate} · <span className={urgencyClass(d)}>{leftText}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggle(d.id)}
                  className={`rounded px-1.5 py-0.5 text-[0.68rem] ${
                    d.done
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'border border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {d.done ? '已办' : '标记'}
                </button>
                <button
                  onClick={() => remove(d.id)}
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                  title="删除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------- 文件起草助手 ----------------------------- */

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
        选文件类型、填关键事实，一键生成可发送 / 可寄送的文书草稿。会结合当前卷宗内容撰写，生成后可复制修改。
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

/* ----------------------------- 每日知产新闻 ----------------------------- */

function NewsTab({ onGenerate }: { onGenerate: Props['onGenerate'] }) {
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function fetchNews() {
    if (busy) return;
    setBusy(true);
    setSummary('');
    setCopied(false);
    try {
      await onGenerate(
        `请使用联网搜索工具，汇总今天（${new Date().toISOString().slice(0, 10)}）知识产权领域的要闻，要求：
1. 检索权威来源（国家知识产权局、中国商标网、最高人民法院、IPRdaily、知产力等）；
2. 列出 5-8 条要闻，每条含标题、要点（1-2 句）与来源链接；
3. 按“立法政策 / 典型案例 / 行业动态”分组；
4. 无法确认的内容标注“需核实”，严禁编造。`,
        setSummary
      );
    } catch (e) {
      setSummary('⚠️ ' + ((e as Error).message || '获取失败'));
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-3">
      <p className="text-[0.74rem] leading-relaxed text-muted-foreground">
        一键联网检索并汇总当日知产领域要闻（立法政策 / 典型案例 / 行业动态），帮你用最短时间掌握行业动态。每次会消耗模型与搜索额度。
      </p>

      <button
        onClick={fetchNews}
        disabled={busy}
        className="flex w-full items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[0.8rem] text-primary-foreground hover:opacity-90 disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Newspaper className="h-3.5 w-3.5" />}
        {busy ? '检索中…' : '获取今日汇总'}
      </button>

      {summary && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[0.74rem] font-medium text-foreground">今日知产要闻</span>
            <button
              onClick={copy}
              className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[0.68rem] text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-2.5 text-[0.78rem] leading-relaxed">
            {summary}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- 利益冲突审查 ----------------------------- */

function ConflictTab({ onGenerate }: { onGenerate: Props['onGenerate'] }) {
  const [list, setList] = useState<ConflictMatter[]>(() => loadConflicts());
  const [matter, setMatter] = useState('');
  const [client, setClient] = useState('');
  const [adverse, setAdverse] = useState('');
  const [status, setStatus] = useState<'active' | 'closed'>('active');
  const [note, setNote] = useState('');

  const [newClient, setNewClient] = useState('');
  const [newAdverse, setNewAdverse] = useState('');
  const [brief, setBrief] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  function persist(next: ConflictMatter[]) {
    setList(next);
    saveConflicts(next);
  }

  function add() {
    if (!client.trim() || !adverse.trim()) return;
    const item: ConflictMatter = {
      id: crypto.randomUUID(),
      matter: matter.trim() || '（未命名事项）',
      client: client.trim(),
      adverse: adverse.trim(),
      status,
      note: note.trim(),
    };
    persist([...list, item]);
    setMatter('');
    setClient('');
    setAdverse('');
    setNote('');
  }

  function remove(id: string) {
    persist(list.filter((d) => d.id !== id));
  }

  const quick = screenConflicts(newClient, newAdverse, list);

  function buildPrompt(): string {
    const roster = list.length
      ? list
          .map(
            (m, i) =>
              `${i + 1}. 事项：${m.matter}｜委托方：${m.client}｜相对方：${m.adverse}｜状态：${m.status === 'active' ? '进行中' : '已结案'}${m.note ? '｜备注：' + m.note : ''}`
          )
          .join('\n')
      : '（暂无已代理事项，请仅基于一般规则评估并提示需补充台账）';
    return `你是律师事务所的利益冲突审查助理。请基于以下「已代理事项清单」与「拟新接事项」进行利益冲突审查，要求：
1. 先复述已代理事项清单（委托方 / 相对方 / 状态）；
2. 将拟新接事项的委托方与相对方，分别与清单中的委托方、相对方逐一比对；
3. 识别以下典型冲突并明确标注：
   - 相对冲突：新委托方曾作为清单中某事项的相对方（曾与我们对立）；
   - 当事人冲突：新相对方是清单中某事项的委托方（我们将与现有客户对立）；
   - 同方重复：新委托方已是现有委托方（注意多重代理 / concurrent representation 风险）；
   - 关联方重叠：名称高度相似或疑似关联公司（标注“需进一步核实”）；
4. 给出结论：无冲突 / 存在潜在冲突（列明）/ 信息不足需补充；
5. 不得编造清单以外的内容，无法确认的事项注明“需进一步核实”。

已代理事项清单：
${roster}

拟新接事项：
委托方：${newClient.trim() || '（未填）'}
相对方：${newAdverse.trim() || '（未填）'}
案件简述：${brief.trim() || '（无）'}`;
  }

  async function review() {
    if (busy) return;
    if (!newClient.trim() && !newAdverse.trim()) return;
    setBusy(true);
    setResult('');
    setCopied(false);
    try {
      await onGenerate(buildPrompt(), setResult);
    } catch (e) {
      setResult('⚠️ ' + ((e as Error).message || '审查失败'));
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    navigator.clipboard?.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-3">
      <p className="text-[0.74rem] leading-relaxed text-muted-foreground">
        先维护「已代理事项」（委托方 / 相对方），再填入拟新接事项的双方，一键排查利益冲突。台账存于本机，刷新不丢。
      </p>

      {quick.length > 0 && (
        <div className="space-y-1.5 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5">
          {quick.map((h, i) => (
            <div
              key={i}
              className={`text-[0.74rem] leading-relaxed ${h.level === 'danger' ? 'text-destructive' : 'text-amber-600'}`}
            >
              {h.level === 'danger' ? '● ' : '○ '}
              {h.message}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 rounded-lg border border-border p-3">
        <div className="text-[0.74rem] font-medium text-foreground">拟新接事项排查</div>
        <input
          value={newClient}
          onChange={(e) => setNewClient(e.target.value)}
          placeholder="新委托方（客户）"
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
        />
        <input
          value={newAdverse}
          onChange={(e) => setNewAdverse(e.target.value)}
          placeholder="新相对方（对方）"
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
        />
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={3}
          placeholder="案件简述（可选）"
          className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
        />
        <button
          onClick={review}
          disabled={busy || (!newClient.trim() && !newAdverse.trim())}
          className="flex w-full items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[0.8rem] text-primary-foreground hover:opacity-90 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
          {busy ? '审查中…' : '开始利益冲突审查'}
        </button>
      </div>

      {result && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[0.74rem] font-medium text-foreground">审查意见</span>
            <button
              onClick={copy}
              className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[0.68rem] text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-2.5 text-[0.78rem] leading-relaxed">
            {result}
          </pre>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-[0.74rem] font-medium text-foreground">已代理事项台账</div>
        <div className="space-y-2 rounded-lg border border-border p-3">
          <input
            value={matter}
            onChange={(e) => setMatter(e.target.value)}
            placeholder="事项名称（如：A公司诉B公司商标侵权案）"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
          />
          <div className="flex gap-2">
            <input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="我方委托方"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
            />
            <input
              value={adverse}
              onChange={(e) => setAdverse(e.target.value)}
              placeholder="相对方"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'closed')}
              className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
            >
              <option value="active">进行中</option>
              <option value="closed">已结案</option>
            </select>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="备注（可选）"
              className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
            />
          </div>
          <button
            onClick={add}
            disabled={!client.trim() || !adverse.trim()}
            className="flex w-full items-center justify-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5 text-[0.8rem] text-primary hover:bg-primary/10 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" /> 添加事项
          </button>
        </div>

        {list.length === 0 ? (
          <p className="py-3 text-center text-[0.78rem] text-muted-foreground">还没有已代理事项</p>
        ) : (
          <ul className="space-y-2">
            {list.map((m) => (
              <li key={m.id} className="flex items-start gap-2 rounded-lg border border-border p-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[0.66rem] ${m.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}
                    >
                      {m.status === 'active' ? '进行中' : '已结案'}
                    </span>
                    <span className="truncate text-[0.82rem] font-medium">{m.matter}</span>
                  </div>
                  <div className="mt-0.5 text-[0.74rem] text-muted-foreground">
                    委托方：{m.client} · 相对方：{m.adverse}
                  </div>
                  {m.note && (
                    <div className="mt-0.5 truncate text-[0.72rem] text-muted-foreground">{m.note}</div>
                  )}
                </div>
                <button
                  onClick={() => remove(m.id)}
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                  title="删除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
