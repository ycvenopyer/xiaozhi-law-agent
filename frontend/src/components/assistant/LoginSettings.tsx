import { useEffect, useRef, useState, type FormEvent } from 'react'
import { pgRequest, requireCloud } from '@/lib/cloudbase'

const field =
  'mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary'
const button =
  'rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50'

interface Props {
  email?: string
  busy: boolean
  setBusy: (value: boolean) => void
}

function usernameFormatError(name: string) {
  if (Array.from(name).length > 256) return '登录用户名最长为 256 个字符。'
  if (/[^A-Za-z0-9〇\p{Unified_Ideograph}]/u.test(name)) return '仅可使用中文汉字、英文字母和数字。'
  return ''
}

export function LoginSettings({ email, busy, setBusy }: Props) {
  const [username, setUsername] = useState('')
  const [savedName, setSavedName] = useState('')
  const [nameError, setNameError] = useState('')
  const [loading, setLoading] = useState(true)
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
    let active = true
    async function load() {
      const name = await pgRequest<string | null>('rpc/my_login_name', { method: 'POST', body: '{}' })
      if (!active) return
      if (typeof name === 'string') {
        setSavedName(name)
        setUsername(name)
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
  }, [])

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
      setNotice('用户名已保存。')
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
