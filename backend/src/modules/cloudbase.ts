import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

export const CLOUD_REQUEST_TIMEOUT_MS = 15_000;

export interface CloudIdentity { id: string; token: string; email?: string }
export interface UserRecord {
  kind: string; id: string; payload: Record<string, unknown>; revision: number;
}
export function gateway() {
  if (!env.CLOUDBASE_PUBLISHABLE_KEY) throw new AppError(503, '云端认证尚未配置，请联系管理员。');
  return `https://${env.CLOUDBASE_ENV_ID}.api.tcloudbasegateway.com`;
}

export async function cloudFetch<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const timeout = AbortSignal.timeout(CLOUD_REQUEST_TIMEOUT_MS);
  const response = await fetch(`${gateway()}${path}`, {
    ...init, signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
    headers: { 'Content-Type': 'application/json', apikey: env.CLOUDBASE_PUBLISHABLE_KEY!,
      Authorization: `Bearer ${token}`, ...init.headers },
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new AppError(response.status, '登录失效或无权访问该资源。');
    const detail = await response.json().catch(() => ({})) as { code?: string };
    if (response.status === 409 || detail.code === '40001') throw new AppError(409, '数据已变化或对话仍在生成，请刷新后重试。');
    throw new AppError(502, 'CloudBase 请求失败，请检查环境、迁移和权限配置。');
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export async function requireIdentity(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store');
  const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '');
  if (!match) return next(new AppError(401, '请先登录。'));
  try {
    // Validate with the issuer. Never trust a locally decoded, unverified JWT.
    const user = await cloudFetch<{ id?: string; user_id?: string; sub?: string; email?: string;
      data?: { id?: string; user_id?: string; sub?: string; email?: string } }>(
      '/auth/v1/user/me', match[1]);
    const profile = user.data ?? user;
    const id = profile.sub ?? profile.id ?? profile.user_id;
    if (typeof id !== 'string' || !id || id.length > 64) throw new AppError(401, '无法确认登录身份。');
    res.locals.identity = { id, token: match[1], email: profile.email } satisfies CloudIdentity;
    return next();
  } catch (error) { return next(error); }
}

export function identity(res: Response): CloudIdentity { return res.locals.identity as CloudIdentity; }

export async function getRecord(token: string, kind: string, id: string): Promise<UserRecord | undefined> {
  const result = await cloudFetch<UserRecord[]>(`/v1/rdb/rest/user_records?kind=eq.${encodeURIComponent(kind)}&id=eq.${encodeURIComponent(id)}&select=kind,id,payload,revision&limit=1`, token);
  return result[0];
}

export function recordRpc<T>(token: string, name: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return cloudFetch(`/v1/rdb/rest/rpc/${name}`, token, { method: 'POST', body: JSON.stringify(body), signal });
}
