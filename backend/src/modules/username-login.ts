import { Router } from 'express'
import { env } from '../config/env'
import { gateway } from './cloudbase'

export const usernameLogin = Router()

usernameLogin.post('/password', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  const { username, password } = req.body ?? {}
  if (typeof username !== 'string' || !username || Array.from(username).length > 256 ||
      typeof password !== 'string' || !password || password.length > 4096)
    return res.status(400).json({ message: '请填写用户名和密码。' })
  const denied = () => res.status(401).json({ message: '密码登录失败，请核对用户名和密码。' })
  const unavailable = () => res.status(503).json({ message: '用户名登录暂不可用，请使用邮箱登录。' })
  if (!env.XIAOZHI_LOGIN_LOOKUP_KEY) return unavailable()
  const key = env.CLOUDBASE_PUBLISHABLE_KEY!
  const base = gateway()
  const post = (path: string, body: unknown) => fetch(base + path, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(12000),
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  try {
    const resolved = await post('/v1/rdb/rest/rpc/resolve_login_name', { p_name: username, p_key: env.XIAOZHI_LOGIN_LOOKUP_KEY })
    if (!resolved.ok) return unavailable()
    const target = await resolved.json() as { login?: string; owner?: string }
    if (!target?.login || !target?.owner) return denied()
    const reply = await post('/auth/v1/signin', { username: target.login, password })
    if (reply.status === 429) return res.status(429).json({ message: '尝试过于频繁，请稍后再试。' })
    if (!reply.ok) return reply.status >= 500 ? unavailable() : denied()
    type Tokens = { access_token?: string; refresh_token?: string }
    const result = await reply.json() as Tokens & { data?: Tokens }
    const tokens = result.data ?? result
    if (!tokens.access_token || !tokens.refresh_token) return denied()
    const profile = await fetch(base + '/auth/v1/user/me', { headers: { apikey: key, Authorization: 'Bearer ' + tokens.access_token },
      redirect: 'error', signal: AbortSignal.timeout(10000) })
    if (!profile.ok) return denied()
    type Profile = { sub?: string; id?: string; user_id?: string }
    const raw = await profile.json() as Profile & { data?: Profile }
    const user = raw.data ?? raw
    if ((user.sub ?? user.id ?? user.user_id) !== target.owner) return denied()
    return res.json({ access_token: tokens.access_token, refresh_token: tokens.refresh_token })
  } catch { return unavailable() }
})
