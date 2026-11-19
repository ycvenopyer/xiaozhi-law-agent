import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import { LockKeyhole, Mail, Loader2, Download, ChevronsUpDown, CircleHelp, LogOut, Palette, Search, Settings2, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AppearancePanel } from './AppearancePanel';
import { LoginBrand } from './LoginBrand';
import { LoginSettings } from './LoginSettings';
import { WebSearchSettings } from './WebSearchSettings';
import type { Appearance } from '@/lib/appearance';
import { clearModelKeys } from '@/lib/custom-models';
import { setTavilyKey } from '@/lib/tavily-key';
import { cloud, cloudConfig, authHeaders, requireCloud } from '@/lib/cloudbase';
import { clearCloudStore, exportRecovery, flushCloudStore, getPrivacy, getSyncStatus, hydrateCloudStore,
  loadCollection, saveCollection, subscribeSync } from '@/lib/cloud-store';
import { downloadOriginal } from '@/lib/private-files';
import type { AttachedFile } from '@/types/agent';

interface Account { id: string; email?: string }
const Context = createContext<{ user: Account; logout: () => Promise<void> } | null>(null);
export function useAccountId() {
  return useContext(Context)?.user.id || '';
}
const field = 'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary';
const button = 'rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50';
const errorText = (error: unknown) => error instanceof Error ? error.message : '操作失败，请重试。';

export function CloudAccountGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<'otp' | 'password'>('otp');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [retryAccount, setRetryAccount] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const verify = useRef<((token: string) => Promise<void>) | null>(null);

  async function enter() {
    setRetryAccount(true);
    const response = await fetch('/api/auth/me', { headers: await authHeaders(), cache: 'no-store' });
    if (!response.ok) throw new Error(response.status === 401 ? '登录失效，请重新登录。' : '后端认证未就绪，请检查 EdgeOne 环境变量。');
    const account = await response.json() as Account;
    await hydrateCloudStore(account.id);
    setRetryAccount(false);
    setUser(account);
  }

  useEffect(() => {
    let active = true;
    async function boot() {
      try {
        if (cloud && await cloud.auth().getLoginState() && active) await enter();
      } catch (cause) { if (active) setError(errorText(cause)); }
      finally { if (active) setLoading(false); }
    }
    void boot();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function sendCode(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setRetryAccount(false);
    try {
      const result = await requireCloud().auth().signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
      if (result.error) throw new Error(result.error.message);
      const callback = result.data?.verifyOtp;
      if (!callback) throw new Error('当前 SDK 未返回验证码校验方法，请检查 SDK 版本和邮箱登录配置。');
      verify.current = async token => {
        const result = await callback({ token });
        if (result.error) throw new Error(result.error.message);
      };
      setSent(true); setCooldown(60);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function signIn(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setRetryAccount(false);
    try {
      if (mode === 'password') {
        const auth = requireCloud().auth();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())) {
          const result = await auth.signInWithPassword({ email: identifier.trim(), password });
          if (result.error) throw new Error(result.error.category === 'RATE_LIMITED' ? '尝试次数过多，请稍后重试。' : '密码登录失败，请核对邮箱和密码，或使用邮箱验证码登录。');
        } else {
          const response = await fetch('/api/auth/password', { method: 'POST', cache: 'no-store',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: identifier, password }) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.message || '用户名登录失败，请重试。');
          const session = await auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token });
          if (session.error) throw new Error('登录状态建立失败，请重新登录。');
        }
        setPassword('');
      } else {
        if (!verify.current) throw new Error('请先发送验证码。');
        await verify.current(code.trim());
        setCode(''); setSent(false); verify.current = null;
      }
      await enter();
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  function switchMode(next: typeof mode) {
    if (next === mode || busy) return;
    if (next === 'password' && email) setIdentifier(email);
    if (next === 'otp' && identifier.includes('@')) setEmail(identifier.trim());
    setMode(next); setPassword(''); setCode(''); setSent(false);
    verify.current = null; setError(''); setRetryAccount(false);
  }

  async function logout() {
    await flushCloudStore();
    await requireCloud().auth().signOut();
    try {
      if (user) {
        setTavilyKey(user.id, '');
        clearModelKeys(user.id);
      }
    } finally {
      setUser(null); clearCloudStore(); setSent(false); setCode(''); verify.current = null;
      setPassword(''); setIdentifier(''); setEmail(''); setMode('otp'); setRetryAccount(false); setCooldown(0); setError('');
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center gap-2 bg-background text-sm"><Loader2 className="h-4 w-4 animate-spin" />正在读取账号与云端资料…</div>;
  if (user) return <Context.Provider value={{ user, logout }}><div key={user.id}>{children}</div></Context.Provider>;
  return <main className="grid min-h-dvh grid-rows-[auto_1fr] bg-background md:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] md:grid-rows-1">
    <LoginBrand />
    <section className="flex min-w-0 items-center justify-center px-6 py-8 md:px-10 md:py-12">
      <div className="w-full max-w-[25rem]">
        <h1 className="text-2xl font-semibold tracking-tight md:text-[1.8rem]">登录后，继续你的工作</h1>
        <p className="mb-6 mt-3 text-sm leading-6 text-muted-foreground">对话、知识库与文件按账号保存。</p>
        <div role="group" aria-label="登录方式" className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {([['otp', '验证码登录'], ['password', '密码登录']] as const).map(([id, label]) =>
            <button key={id} type="button" disabled={busy} aria-pressed={mode === id} onClick={() => switchMode(id)} className={`rounded-lg px-3 py-2 text-sm focus-visible:outline-primary ${mode === id ? 'bg-background font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{label}</button>)}
        </div>
        {!cloud && <p role="alert" className="mb-4 text-sm text-destructive">{cloudConfig.error || '尚未配置 Publishable Key，请按部署文档完成环境变量配置并重新构建。'}</p>}
        <form onSubmit={mode === 'password' || sent ? signIn : sendCode} className="space-y-4">
          {mode === 'password' ? <>
            <label className="block text-sm">邮箱或用户名<input name="username" className={`${field} mt-2`} autoComplete="username" autoCapitalize="none" spellCheck={false} required disabled={busy} value={identifier} onChange={e => setIdentifier(e.target.value)} /></label>
            <label className="block text-sm">密码<input name="password" className={`${field} mt-2`} type="password" autoComplete="current-password" required disabled={busy} value={password} onChange={e => setPassword(e.target.value)} /></label>
          </> : <>
            <label className="block text-sm">邮箱<input className={`${field} mt-2`} type="email" autoComplete="email" required value={email} disabled={sent || busy} onChange={event => setEmail(event.target.value)} /></label>
            {sent && <label className="block text-sm">邮箱验证码<input className={`${field} mt-2`} inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={event => setCode(event.target.value)} /></label>}
          </>}
          {error && <p role="alert" className="text-sm leading-6 text-destructive">{error}</p>}
          <button disabled={!cloud || busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'password' ? <LockKeyhole className="h-4 w-4" /> : <Mail className="h-4 w-4" />}{mode === 'password' ? '登录' : sent ? '验证并进入' : '发送邮箱验证码'}</button>
        </form>
        {sent && <div className="mt-3 flex gap-3 text-xs"><button disabled={busy || cooldown > 0} onClick={event => void sendCode(event)} className="disabled:opacity-40">{cooldown ? `${cooldown} 秒后可重发` : '重新发送'}</button><button disabled={busy} onClick={() => { setSent(false); setCode(''); verify.current = null; }}>更换邮箱</button></div>}
        {cloud && error && retryAccount && <button className={`${button} mt-3`} disabled={busy} onClick={() => { setBusy(true); void enter().catch(cause => setError(errorText(cause))).finally(() => setBusy(false)); }}>重试读取已登录账号</button>}
        <div className="mt-8 flex items-start gap-2 border-t border-border pt-5 text-xs leading-5 text-muted-foreground"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />{mode === 'otp' ? '首次邮箱验证将创建账号。' : '首次使用或忘记密码？用邮箱验证码登录后，可在「设置 → 登录账号」设置密码。'}</div>
      </div>
    </section>
  </main>;
}

interface AccountControlsProps {
  disabled?: boolean;
  appearance: Appearance;
  onAppearanceChange: (value: Appearance) => void;
  searchConfigured: boolean;
  onSearchKeyChange: (configured: boolean) => void;
}

export function AccountControls({ disabled = false, appearance, onAppearanceChange, searchConfigured, onSearchKeyChange }: AccountControlsProps) {
  const account = useContext(Context);
  const sync = useSyncExternalStore(subscribeSync, getSyncStatus);
  const [guiding, setGuiding] = useState(() => !loadCollection<{ id: string }>('settings').some(item => item.id === 'welcome-v1'));
  const [dialog, setDialog] = useState<'settings' | 'help' | null>(guiding ? 'settings' : null);
  const [section, setSection] = useState<'privacy' | 'account' | 'appearance' | 'search' | 'files'>('privacy');
  const [external, setExternal] = useState(getPrivacy);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (getSyncStatus().pending || getSyncStatus().error) event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  if (!account) return null;
  async function act(action: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await action(); } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }
  const status = sync.error ? '保存失败' : sync.pending ? '保存中…' : '云端已同步';
  const displayName = account.user.email || account.user.id;
  function closeSettings() {
    if (!guiding) { setDialog(null); return; }
    void act(async () => {
      await saveCollection('settings', [{ id: 'welcome-v1', completed: true }], false);
      setGuiding(false);
      setDialog(null);
    });
  }
  function openSettings() {
    setFiles(loadCollection<AttachedFile>('files'));
    setExternal(getPrivacy());
    setSection('privacy');
    setDialog('settings');
  }
  return <>
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button ref={trigger} type="button" aria-label="账号菜单" className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-primary data-[state=open]:bg-sidebar-accent">
          <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-semibold text-primary">{displayName.slice(0, 2).toUpperCase()}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium" title={displayName}>{displayName}</span>
            <span className={`mt-0.5 flex items-center gap-1 text-[0.65rem] ${sync.error ? 'text-destructive' : 'text-muted-foreground'}`}><ShieldCheck className="size-3" />{status}</span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-44 rounded-xl p-1.5" aria-label="账号菜单">
        <DropdownMenuItem className="cursor-pointer rounded-lg py-2.5" onSelect={openSettings}><Settings2 />设置</DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer rounded-lg py-2.5" onSelect={() => setDialog('help')}><CircleHelp />帮助</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer rounded-lg py-2.5" disabled={busy || disabled || sync.pending || !!sync.error} onSelect={() => void act(account.logout)}><LogOut />退出登录</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    {!dialog && (error || sync.error) && <p role="alert" className="px-2 pb-1 text-xs text-destructive">{error || '请在设置中查看保存状态'}</p>}
    <Dialog open={dialog !== null} onOpenChange={open => { if (!open && !busy) closeSettings(); }}>
      {dialog && <DialogContent showCloseButton={false} onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }} className="max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 space-y-1.5">
            <DialogTitle>{guiding ? '首次使用设置' : dialog === 'settings' ? '设置' : '帮助'}</DialogTitle>
            <DialogDescription>{guiding ? (section === 'privacy' ? '第 1 步，共 2 步 · 选择是否允许模型处理你的资料。' : '第 2 步，共 2 步 · 可选配 Tavily，以使用联网搜索。') : dialog === 'settings' ? displayName : '小知工作空间使用指南'}</DialogDescription>
          </div>
          <button aria-label="关闭" disabled={busy} onClick={closeSettings} className="rounded-md px-2 text-lg leading-6 text-muted-foreground hover:bg-muted">×</button>
        </header>
        {dialog === 'help' ? <div className="space-y-4 overflow-y-auto p-5 text-sm leading-6">
          <div><h3 className="font-medium">开始对话</h3><p className="text-muted-foreground">在设置里授权第三方模型处理，然后从输入框选择模型。检索法条和案例时，可通过知识库或普通附件提供参考材料。</p></div>
          <div><h3 className="font-medium">从材料开始办案</h3><p className="text-muted-foreground">点击对话框的「上传文件填表」，选择 PDF、Word、TXT、Markdown 或图片，再选择用途。检索对比适合比较两份材料，侵权识别用于梳理权利基础和被诉行为，合规提示用于检查研发或合同风险，知产文书用于起草协议。导入会替换所选功能的草稿，请先核对字段再生成报告。</p></div>
          <div><h3 className="font-medium">图片和扫描件</h3><p className="text-muted-foreground">文字版 PDF 可直接提取正文。照片和扫描页需在输入框选择支持图片的模型。每个文件最多 4 MiB，每次填表合计最多 4 万字和 8 张图片或扫描页。</p></div>
          <div><h3 className="font-medium">核对法律依据</h3><p className="text-muted-foreground">从右上角打开知识库，选择本次使用的材料。阅读报告时，可沿来源链接核对法规版本、施行日期和引用原文。报告中的待补充事项可作为下一轮提问的起点。</p></div>
          <div><h3 className="font-medium">配置自己的模型</h3><p className="text-muted-foreground">从模型菜单打开「自定义模型」，填写厂商、接口地址、模型 ID 和 API Key，可先测试连通性。</p></div>
          <div><h3 className="font-medium">检索今日知产新闻</h3><p className="text-muted-foreground">在「设置 → 联网搜索」保存 Tavily API Key，支持工具调用的模型即可在对话中检索网页，也可以到事务台检索当天的知产动态。搜索使用你的 Tavily 额度。</p></div>
          <div><h3 className="font-medium">调整阅读外观</h3><p className="text-muted-foreground">进入「设置 → 界面外观」，拖动字号滑块或直接输入 1–48 的整数。中文和英文可分别选择字体，设置保存在当前浏览器。</p></div>
          <div><h3 className="font-medium">下载已保存的附件</h3><p className="text-muted-foreground">在「设置 → 文件下载」中下载当前账号已保存的文件原件。</p></div>
        </div> : <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] sm:grid-cols-[9rem_minmax(0,1fr)] sm:grid-rows-1">
          <nav aria-label="设置分类" hidden={guiding} className={guiding ? 'hidden' : "grid grid-cols-2 gap-1 border-b border-border bg-muted/30 p-2 sm:flex sm:flex-col sm:border-b-0 sm:border-r"}>
            {([
              ['privacy', '账号与隐私', ShieldCheck],
              ['account', '登录账号', LockKeyhole],
              ['appearance', '界面外观', Palette],
              ['search', '联网搜索', Search],
              ['files', '文件下载', Download],
            ] as const).map(([id, label, Icon]) => <button type="button" key={id} aria-pressed={section === id} disabled={busy} onClick={() => { setError(''); setSection(id); }} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs ${section === id ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted'}`}><Icon className="size-4" />{label}</button>)}
          </nav>
          <div className={guiding ? "col-span-full row-span-full overflow-y-auto p-5" : "min-h-0 overflow-y-auto p-4 sm:p-5"}>
            {section === 'account' && <LoginSettings email={account.user.email} busy={busy} setBusy={setBusy} />}
            {section === 'appearance' && <AppearancePanel value={appearance} onChange={onAppearanceChange} />}
            {section === 'search' && <WebSearchSettings accountId={account.user.id} configured={searchConfigured} onChange={onSearchKeyChange} />}
            {section === 'files' && <section aria-labelledby="saved-files-title" className="overflow-hidden rounded-xl border border-border">
              <div className="border-b border-border bg-muted/30 p-4">
                <h3 id="saved-files-title" className="text-sm font-semibold">已保存的文件原件</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">文件通过私有存储权限验证后下载。</p>
              </div>
              {files.length ? <ul className="divide-y divide-border">
                {files.map(file => <li key={file.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 break-words text-sm">{file.name}</span>
                  <button type="button" aria-label={`下载 ${file.name}`} disabled={busy}
                    onClick={() => void act(() => downloadOriginal(file))}
                    className={`${button} flex shrink-0 items-center gap-1.5`}>
                    <Download className="size-3.5" />下载
                  </button>
                </li>)}
              </ul> : <p className="p-4 text-sm text-muted-foreground">暂无已保存的文件。</p>}
              {error && <p role="alert" className="border-t border-border p-4 text-sm text-destructive">{error}</p>}
            </section>}
            {section === 'privacy' && <>
              <div className="rounded-xl border border-border p-4">
                <h3 className="text-sm font-medium">第三方模型处理</h3>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">开启后，你选择的模型服务可以处理对话、附件文本、图片及启用的知识库。整理未公开专利、技术交底书和商业秘密时，请按资料要求决定是否授权。</p>
                <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={external} disabled={busy || disabled || sync.pending || !!sync.error} onChange={event => {
                  const next = event.target.checked;
                  const previous = external;
                  setExternal(next);
                  void act(async () => {
                    try {
                      await saveCollection('settings', [{ id: 'privacy', externalModels: next, consentVersion: 1, updatedAt: Date.now() }], false);
                    } catch (cause) { setExternal(previous); throw cause; }
                  });
                }} />我允许第三方模型处理工作资料</label>
              </div>
              {(error || sync.error) && <p role="alert" className="mt-3 text-sm text-destructive">{error || sync.error}</p>}
              {sync.error && <button className={`${button} mt-3`} onClick={exportRecovery}>导出未保存资料备份</button>}
            </>}
            {guiding && <div className="mt-4 flex justify-end gap-2">
              {section === 'search' && <button className={button} disabled={busy} onClick={() => setSection('privacy')}>上一步</button>}
              <button className={button} disabled={busy} onClick={() => section === 'privacy' ? setSection('search') : closeSettings()}>
                {section === 'privacy' ? '下一步' : '完成引导'}
              </button>
            </div>}
            {guiding && section === 'search' && error && <p role="alert">{error}</p>}
          </div>
        </div>}
      </DialogContent>}
    </Dialog>
  </>;
}
