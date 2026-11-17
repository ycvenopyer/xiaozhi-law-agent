import cloudbase from '@cloudbase/js-sdk';
import { assemblePublishableKey } from '../../../shared/cloudbase-key.mjs';

const buildEnv = import.meta.env ?? {};
let publishableKey = '';
let configurationError = '';
try {
  publishableKey = assemblePublishableKey(buildEnv, 'VITE_CLOUDBASE_PUBLISHABLE_KEY');
} catch (error) {
  configurationError = error instanceof Error ? error.message : 'CloudBase Key 分段配置错误。';
}

export const cloudConfig = {
  env: buildEnv.VITE_CLOUDBASE_ENV_ID || 'xiaozhi-law-agent-d3d75m0c534925',
  region: buildEnv.VITE_CLOUDBASE_REGION || 'ap-shanghai',
  key: publishableKey,
  error: configurationError,
};

export const cloud = cloudConfig.key ? cloudbase.init({
  env: cloudConfig.env,
  region: cloudConfig.region,
  accessKey: cloudConfig.key,
  persistence: 'session',
}) : null;

export function requireCloud() {
  if (!cloud) throw new Error(cloudConfig.error || '请先配置 Publishable Key（完整值或 PART 分段），再重新构建网站。');
  return cloud;
}

export async function accessToken(): Promise<string> {
  const token = await requireCloud().auth().getAccessToken();
  if (!token.accessToken) throw new Error('登录已过期，请重新登录。');
  return token.accessToken;
}

export async function authHeaders(): Promise<Record<string, string>> {
  return { Authorization: `Bearer ${await accessToken()}` };
}

export async function pgRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`https://${cloudConfig.env}.api.tcloudbasegateway.com/v1/rdb/rest/${path}`, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(20_000),
    headers: { 'Content-Type': 'application/json', apikey: cloudConfig.key,
      ...await authHeaders(), ...init.headers },
    cache: 'no-store',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('登录已过期，请重新登录。');
    if (res.status === 409 || error.code === '40001') throw new Error('数据已在其他页面更新，请刷新后重试，当前修改尚未保存。');
    throw new Error(`云端操作失败（${res.status}）。请检查数据库迁移、权限和环境配置。`);
  }
  return res.status === 204 ? undefined as T : res.json();
}
