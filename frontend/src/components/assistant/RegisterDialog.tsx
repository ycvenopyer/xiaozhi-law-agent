import { useState, type FormEvent } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cloudConfig, pgRequest, requireCloud, usernameFormatError } from '@/lib/cloudbase'

const field = 'mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-primary'

export function RegisterDialog({ initialEmail, onClose, onComplete }: {
  initialEmail: string
  onClose: () => void
  onComplete: (email: string) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [verificationId, setVerificationId] = useState('')
  const [newAccountToken, setNewAccountToken] = useState('')
  const created = Boolean(newAccountToken)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const formatError = usernameFormatError(name)
      if (formatError) throw new Error(formatError)
      const address = email.trim()
      const auth = requireCloud().auth()
      if (!verificationId) {
        const result = await auth.getVerification({ email: address, target: 'ANY', usage: 'email' })
        if (result.is_user) throw new Error('该邮箱已注册，请返回登录。')
        if (!result.verification_id) throw new Error('验证码发送失败，请稍后重试。')
        setVerificationId(result.verification_id)
        return
      }
      let accountToken = newAccountToken
      if (!accountToken) {
        const proof = await auth.verify({ verification_id: verificationId, verification_code: code.trim() })
        if (!proof.verification_token) throw new Error('邮箱验证码无效或已过期，请重新获取。')
        // The SDK email signUp callback can also sign in an existing user. This endpoint only creates users.
        const response = await fetch(`https://${cloudConfig.env}.api.tcloudbasegateway.com/auth/v1/signup`, {
          method: 'POST', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20000),
          headers: { 'Content-Type': 'application/json', apikey: cloudConfig.key, Authorization: 'Bearer ' + cloudConfig.key },
          body: JSON.stringify({ email: address, password, verification_token: proof.verification_token }),
        }).catch(() => {
          throw new Error('未能确认注册结果。请先返回登录，用此邮箱和密码登录；如果邮箱尚未注册，请重新获取注册验证码。')
        })
        if (!response.ok) throw new Error('注册失败，请核对密码是否符合要求，或使用已注册邮箱登录。')
        const result = await response.json()
        const token = result.access_token ?? result.data?.access_token
        if (typeof token !== 'string' || !token) throw new Error('未收到注册凭证，请尝试使用邮箱登录。')
        accountToken = token
        setNewAccountToken(token)
        setPassword('')
        setCode('')
      }
      await pgRequest('rpc/set_login_name', { method: 'POST', body: JSON.stringify({ p_name: name }) }, accountToken)
      setNewAccountToken('')
      onComplete(address)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '操作失败，请检查验证码后重试。')
    } finally {
      setBusy(false)
    }
  }

  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-md" showCloseButton={!busy}>
      <DialogTitle>注册小知账号</DialogTitle>
      <DialogDescription>{created ? '邮箱账号已创建。保存账号名称即可完成注册，也可稍后用邮箱登录并设置名称。'
        : verificationId ? '验证码已发送至 ' + email + '，请查收后完成注册。' : '设置账号名称和密码，然后验证你的邮箱。'}</DialogDescription>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">账号名称<input className={field} required autoComplete="username" aria-describedby="register-name-hint" value={name} disabled={busy} onChange={e => setName(e.target.value)} /></label>
        <p id="register-name-hint" className="text-xs text-muted-foreground">支持 1–256 个汉字、英文字母或数字，区分大小写。</p>
        <label className="block text-sm">邮箱<input className={field} required type="email" autoComplete="email" value={email} disabled={busy || !!verificationId} onChange={e => setEmail(e.target.value)} /></label>
        {!created && <label className="block text-sm">密码<input className={field} required type="password" autoComplete="new-password" value={password} disabled={busy} onChange={e => setPassword(e.target.value)} /></label>}
        {verificationId && !created && <label className="block text-sm">注册验证码<input className={field} required autoComplete="one-time-code" inputMode="numeric" value={code} disabled={busy} onChange={e => setCode(e.target.value)} /></label>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-50">{busy ? '正在处理…' : created ? '保存账号名称' : verificationId ? '完成注册' : '发送注册验证码'}</button>
        {verificationId && !created && <button type="button" disabled={busy} className="text-sm text-primary" onClick={() => { setVerificationId(''); setCode(''); setError('') }}>重新填写或获取验证码</button>}
      </form>
    </DialogContent>
  </Dialog>
}
