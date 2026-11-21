import { useEffect, useRef, useState, type FormEvent } from 'react'
import { pgRequest, requireCloud, usernameFormatError } from '@/lib/cloudbase'

const field =
  'mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary'
const button =
  'rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50'

interface Props {
  initialName?: string | null
  onSaved: (name: string) => void
  onEmailSaved: (email: string) => void
  email?: string
  busy: boolean
  setBusy: (value: boolean) => void
}

export function LoginSettings({ email, onEmailSaved, busy, setBusy, initialName, onSaved }: Props) {
  const [username, setUsername] = useState(initialName ?? '')
  const [savedName, setSavedName] = useState(initialName ?? '')
  const [nameError, setNameError] = useState('')
  const [loading, setLoading] = useState(initialName === undefined)
  const [nextEmail, setNextEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailVerification, setEmailVerification] = useState<((code: string) => Promise<void>) | null>(null)
  const [challenge, setChallenge] = useState(0)
  const [resendReady, setResendReady] = useState(false)
  const [nonce, setNonce] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const verify = useRef<((token: string, next: string) => Promise<void>) | null>(null)
  const name = username
  const formatError = name !== savedName ? usernameFormatError(name) : ''
  useEffect(() => {
    if (initialName !== undefined) return
    let active = true
    async function load() {
      const name = await pgRequest<string | null>('rpc/my_login_name', { method: 'POST', body: '{}' })
      if (!active) return
      if (typeof name === 'string') {
        setSavedName(name)
        setUsername(name)
        setLoading(false)
        onSaved(name)
      }
    }
    void load()
      .catch(() => {
        if (active) setError('未能读取当前用户名，请重新打开登录账号设置。')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [initialName, onSaved])

  useEffect(() => {
    if (!challenge) return
    const timer = window.setTimeout(() => setResendReady(true), 60_000)
    return () => window.clearTimeout(timer)
  }, [challenge])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '操作失败，请重试。')
    } finally {
      setBusy(false)
    }
  }

  function saveUsername(event: FormEvent) {
    event.preventDefault()
    if (!name || formatError || name === savedName) return
    setNameError('')
    void run(async () => {
      try {
        await pgRequest('rpc/set_login_name', { method: 'POST', body: JSON.stringify({ p_name: name }) })
      } catch (cause) {
        setNameError(cause instanceof Error ? cause.message : '用户名保存失败，请重试。')
        return
      }
      setSavedName(name)
      setUsername(name)
      onSaved(name)
      setNotice('用户名已保存。')
    })
  }

  function changeEmail(event: FormEvent) {
    event.preventDefault()
    void run(async () => {
      const address = nextEmail.trim()
      if (emailVerification) {
        await emailVerification(emailCode.trim())
        setEmailVerification(null)
        setNextEmail('')
        setEmailCode('')
        verify.current = null
        setChallenge(0)
        setNonce('')
        setPassword('')
        setConfirm('')
        onEmailSaved(address)
        setNotice('登录邮箱已更新。')
        return
      }
      const result = await requireCloud().auth().updateUser({ email: address })
      if (result.error) throw new Error('无法验证新邮箱，请检查地址是否已被使用。')
      const verifyEmail = result.data && 'verifyOtp' in result.data && result.data.verifyOtp
      if (!verifyEmail) throw new Error('未能发起邮箱验证，请重试。')
      setEmailVerification(() => async (token: string) => {
        const reply = await verifyEmail({ email: address, token })
        if (reply.error || reply.data?.user?.email?.toLowerCase() !== address.toLowerCase()) {
          throw new Error('邮箱换绑未确认，请核对验证码或重新获取。')
        }
      })
      setNotice('验证码已发送到新邮箱。')
    })
  }

  function sendCode() {
    void run(async () => {
      const result = await requireCloud().auth().reauthenticate()
      const update = result.data?.updateUser
      if (result.error || !update) throw new Error('验证码发送失败，请检查账号绑定信息或稍后重试。')
      verify.current = async (token, next) => {
        const response = await update({ nonce: token, password: next })
        if (response.error)
          throw new Error('密码设置失败，请核对验证码及密码是否符合环境的强度要求。')
      }
      setNonce('')
      setResendReady(false)
      setChallenge(n => n + 1)
      setNotice('验证码已发送至' + (email || '当前账号绑定的联系方式') + '。')
    })
  }

  function savePassword(event: FormEvent) {
    event.preventDefault()
    void run(async () => {
      if (password !== confirm) throw new Error('两次输入的密码不一致。')
      if (!verify.current) throw new Error('请先发送验证码。')
      await verify.current(nonce.trim(), password)
      setChallenge(0)
      setPassword('')
      setConfirm('')
      setNonce('')
      verify.current = null
      setNotice('密码已保存，下次可使用密码登录。')
    })
  }

  return (
    <div className="space-y-4">
      <form className="space-y-3 rounded-xl border border-border p-4" onSubmit={saveUsername}>
        <h3 className="text-sm font-medium">用户名</h3>
        <label className="block text-xs text-muted-foreground">
          登录用户名
          <input
            className={field}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={Boolean(formatError || nameError)}
            aria-describedby="username-hint username-feedback"
            disabled={busy || loading}
            required
            value={username}
            onChange={e => {
              setUsername(e.target.value)
              setNameError('')
              setNotice('')
            }}
          />
        </label>
        <p id="username-hint" className="text-xs text-muted-foreground">
          支持 1–256 个汉字、英文字母或数字。完整名称须唯一，区分大小写。
        </p>
        <p
          id="username-feedback"
          aria-live="polite"
          className={
            formatError || nameError ? 'text-sm text-destructive' : 'text-xs text-muted-foreground'
          }
        >
          {formatError || nameError}
        </p>
        <button
          className={button}
          disabled={busy || loading || !name || !!formatError || name === savedName}
        >
          保存用户名
        </button>
      </form>
      <form className="space-y-3 rounded-xl border border-border p-4" onSubmit={changeEmail}>
        <h3 className="text-sm font-medium">更换登录邮箱</h3>
        <p className="text-xs text-muted-foreground">当前绑定邮箱：{email || '未绑定'}</p>
        <label className="block text-sm">新邮箱<input className={field} type="email" required autoComplete="email"
          disabled={busy || !!emailVerification} value={nextEmail} onChange={e => setNextEmail(e.target.value)} /></label>
        {emailVerification && <label className="block text-sm">新邮箱验证码<input className={field} required autoComplete="one-time-code"
          inputMode="numeric" disabled={busy} value={emailCode} onChange={e => setEmailCode(e.target.value)} /></label>}
        <button className={button} disabled={busy || !nextEmail.trim() || nextEmail.trim().toLowerCase() === email?.toLowerCase()}>
          {emailVerification ? '确认更换邮箱' : '验证新邮箱'}
        </button>
        {emailVerification && <button type="button" className={button} disabled={busy}
          onClick={() => { setEmailVerification(null); setEmailCode(''); setNotice(''); setError('') }}>重新填写邮箱</button>}
      </form>
      <section className="space-y-3 rounded-xl border border-border p-4">
        <h3 className="text-sm font-medium">设置或更改密码</h3>
        <p className="text-xs text-muted-foreground">
          先通过{email || '账号绑定的联系方式'}验证身份。
        </p>
        <button
          className={button}
          type="button"
          disabled={busy || (challenge > 0 && !resendReady)}
          onClick={sendCode}
        >
          {challenge > 0 ? '重新发送验证码' : '发送安全验证码'}
        </button>
        {challenge > 0 && (
          <form className="space-y-3" onSubmit={savePassword}>
            <label className="block text-sm">
              安全验证码
              <input
                className={field}
                autoComplete="one-time-code"
                inputMode="numeric"
                disabled={busy}
                required
                value={nonce}
                onChange={e => setNonce(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              新密码
              <input
                className={field}
                type="password"
                autoComplete="new-password"
                disabled={busy}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              确认新密码
              <input
                className={field}
                type="password"
                autoComplete="new-password"
                disabled={busy}
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
              />
            </label>
            <button className={button} disabled={busy}>
              保存密码
            </button>
          </form>
        )}
      </section>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
    </div>
  )
}
