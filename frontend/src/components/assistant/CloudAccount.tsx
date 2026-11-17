import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import { LockKeyhole, Mail, ShieldCheck, X, Loader2, Download } from 'lucide-react';
import { cloud, cloudConfig, authHeaders, requireCloud } from '@/lib/cloudbase';
import { clearCloudStore, exportRecovery, flushCloudStore, getPrivacy, getSyncStatus, hydrateCloudStore,
  loadCollection, saveCollection, subscribeSync } from '@/lib/cloud-store';
import { clearLegacy, exportLegacy, importLegacy, previewLegacy } from '@/lib/legacy-import';
import { downloadOriginal } from '@/lib/private-files';
import type { AttachedFile } from '@/types/agent';

interface Account { id: string; email?: string }
const Context = createContext<{ user: Account; logout: () => Promise<void> } | null>(null);
const field = 'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary';
const button = 'rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50';
const errorText = (error: unknown) => error instanceof Error ? error.message : '操作失败，请重试。';

export function CloudAccountGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const verify = useRef<((token: string) => Promise<void>) | null>(null);

  async function enter() {
    const response = await fetch('/api/auth/me', { headers: await authHeaders(), cache: 'no-store' });
    if (!response.ok) throw new Error(response.status === 401 ? '登录失效，请重新登录。' : '后端认证未就绪，请检查 EdgeOne 环境变量。');
    const account = await response.json() as Account;
    await hydrateCloudStore(account.id);
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
    event.preventDefault(); setBusy(true); setError('');
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
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (!verify.current) throw new Error('请先发送验证码。');
      await verify.current(code.trim());
      await enter();
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function logout() {
    await flushCloudStore();
    await requireCloud().auth().signOut();
    setUser(null); clearCloudStore(); setSent(false); setCode(''); verify.current = null;
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center gap-2 bg-background text-sm"><Loader2 className="h-4 w-4 animate-spin" />正在读取账号与云端资料…</div>;
  if (user) return <Context.Provider value={{ user, logout }}><div key={user.id}>{children}</div></Context.Provider>;
  return <main className="flex min-h-screen items-center justify-center bg-background p-6">
    <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="mb-8 flex items-center gap-3"><img src="/xiaozhi-avatar.png" alt="" className="h-12 w-12 rounded-xl" /><div><p className="text-lg font-semibold">小知 · 私人工作空间</p><p className="mt-1 text-xs text-muted-foreground">知识产权办案助理</p></div></div>
      <h1 className="text-2xl font-semibold tracking-tight">登录后，继续你的工作</h1>
      <p className="mb-6 mt-3 text-sm leading-6 text-muted-foreground">对话、知识库与卷宗按账号保存。第三方模型处理默认关闭，可在登录后单独开启。</p>
      {!cloud && <p role="alert" className="mb-4 text-sm text-destructive">{cloudConfig.error || '尚未配置 Publishable Key，请按部署文档完成环境变量配置并重新构建。'}</p>}
      <form onSubmit={sent ? signIn : sendCode} className="space-y-4">
        <label className="block text-sm">邮箱<input className={`${field} mt-2`} type="email" autoComplete="email" required value={email} disabled={sent || busy} onChange={event => setEmail(event.target.value)} /></label>
        {sent && <label className="block text-sm">邮箱验证码<input className={`${field} mt-2`} inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={event => setCode(event.target.value)} /></label>}
        {error && <p role="alert" className="text-sm leading-6 text-destructive">{error}</p>}
        <button disabled={!cloud || busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}{sent ? '验证并进入' : '发送邮箱验证码'}</button>
      </form>
      {sent && <div className="mt-3 flex gap-3 text-xs"><button disabled={busy || cooldown > 0} onClick={event => void sendCode(event)} className="disabled:opacity-40">{cooldown ? `${cooldown} 秒后可重发` : '重新发送'}</button><button disabled={busy} onClick={() => { setSent(false); setCode(''); verify.current = null; }}>更换邮箱</button></div>}
      {cloud && error && <button className={`${button} mt-3`} onClick={() => void enter().catch(cause => setError(errorText(cause)))}>重试读取已登录账号</button>}
      <div className="mt-8 flex items-start gap-2 border-t border-border pt-5 text-xs leading-5 text-muted-foreground"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />首次验证会创建账号。本机的旧资料不会自动上传，登录后可预览并导入。</div>
    </section>
  </main>;
}

export function AccountControls({ disabled = false }: { disabled?: boolean }) {
  const account = useContext(Context);
  const sync = useSyncExternalStore(subscribeSync, getSyncStatus);
  const [open, setOpen] = useState(false);
  const [external, setExternal] = useState(getPrivacy);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [legacy, setLegacy] = useState<ReturnType<typeof previewLegacy>>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [imported, setImported] = useState(() => loadCollection<{ id: string }>('settings').some(item => item.id === 'legacy-import'));
  const [notice, setNotice] = useState('');
  const [files, setFiles] = useState<AttachedFile[]>([]);

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
  return <>
    <button className={`${button} flex items-center gap-1.5 whitespace-nowrap py-1 text-xs`} onClick={() => { setLegacy(previewLegacy()); setFiles(loadCollection<AttachedFile>('files')); setOpen(true); }}><ShieldCheck className="h-3.5 w-3.5" />{status} · 账号</button>
    {sync.error && <span role="alert" title={sync.error} className="text-xs text-destructive">请保留页面并核对保存状态</span>}
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation" onClick={() => !busy && setOpen(false)}>
      <section role="dialog" aria-modal="true" aria-labelledby="account-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 id="account-title" className="text-lg font-semibold">账号与隐私</h2><button aria-label="关闭" disabled={busy} onClick={() => setOpen(false)}><X className="h-5 w-5" /></button></div>
        <p className="mt-2 break-all text-sm text-muted-foreground">{account.user.email || account.user.id}</p>
        <div className="mt-5 rounded-xl border border-border p-4">
          <h3 className="text-sm font-medium">第三方模型处理</h3>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">开启后，对话、附件提取文本、图片和启用的知识库／卷宗可能交给你所选择的模型服务。未公开专利、技术交底书和商业秘密请保持关闭。当前不提供网页搜索，跨模型自动回退已禁止。</p>
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
        <div className="mt-4 rounded-xl border border-border p-4">
          <h3 className="text-sm font-medium">导入旧浏览器资料</h3>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">旧资料：{legacy.reduce((sum, item) => sum + item.count, 0)} 条。已有相同 ID 的云端记录会跳过；旧文档可能只有截断文本，不能恢复缺失的原件。建议先导出备份。</p>
          <label className="mt-3 flex items-start gap-2 text-xs leading-5"><input type="checkbox" className="mt-1" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />我确认这些本地资料属于当前账号，并同意上传至该账号。</label>
          <div className="mt-3 flex flex-wrap gap-2"><button className={button} onClick={exportLegacy}>导出本地备份</button><button className={button} disabled={!confirmed || disabled || busy || sync.pending || !!sync.error} onClick={() => void act(async () => {
            await flushCloudStore(); const count = await importLegacy();
            await saveCollection('settings', [{ id: 'legacy-import', completedAt: Date.now() }], false);
            setNotice(`已导入 ${count} 条记录，正在重新加载工作空间。`); setImported(true); location.reload();
          })}>导入当前账号</button></div>
          {imported && <div className="mt-3 flex flex-wrap gap-2"><button className={button} onClick={() => location.reload()}>重新加载并核对</button><button className={button} onClick={() => { if (window.confirm('确认已核对云端资料并导出备份？此操作会清除本浏览器的旧业务记录。')) { clearLegacy(); setLegacy(previewLegacy()); setNotice('已清理本地旧业务记录。'); } }}>清除本地旧记录</button></div>}
        </div>
        <div className="mt-4 rounded-xl border border-border p-4"><h3 className="text-sm font-medium">已保存的文件原件</h3><p className="my-2 text-xs text-muted-foreground">文件通过私有存储权限验证后下载。</p><ul className="max-h-40 space-y-2 overflow-y-auto">{files.map(file => <li key={file.id} className="flex items-center gap-2 text-xs"><span className="min-w-0 flex-1 truncate">{file.name}</span><button aria-label={`下载 ${file.name}`} disabled={busy} onClick={() => void act(() => downloadOriginal(file))}><Download className="h-4 w-4" /></button></li>)}</ul></div>
        {(error || sync.error) && <p role="alert" className="mt-3 text-sm text-destructive">{error || sync.error}</p>}
        {sync.error && <button className={`${button} mt-3`} onClick={exportRecovery}>导出未保存资料备份</button>}
        {notice && <p role="status" className="mt-3 text-sm">{notice}</p>}
        <button className={`${button} mt-5`} disabled={busy || disabled || sync.pending || !!sync.error} onClick={() => void act(account.logout)}>退出登录</button>
      </section>
    </div>}
  </>;
}
