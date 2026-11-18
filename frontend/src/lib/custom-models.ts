import { authHeaders } from './cloudbase';

export interface CustomModel {
  id: string;
  provider: string;
  label: string;
  baseUrl: string;
  model: string;
  vision: boolean;
  tools: boolean;
}

export type CustomModelRequest = Pick<CustomModel, 'baseUrl' | 'model' | 'vision' | 'tools'> & { apiKey: string };

const modelStorage = (accountId: string) => `xiaozhi-custom-models:${accountId}`;
const keyStorage = (accountId: string, modelId: string) => `xiaozhi-model-key:${accountId}:${modelId}`;

export function loadCustomModels(accountId: string): CustomModel[] {
  try {
    const models: unknown = JSON.parse(localStorage.getItem(modelStorage(accountId)) || '[]');
    return Array.isArray(models) ? models.filter(model => model?.id?.startsWith('custom-')) : [];
  } catch {
    return [];
  }
}

export function saveCustomModels(accountId: string, models: CustomModel[]) {
  localStorage.setItem(modelStorage(accountId), JSON.stringify(models));
}

export function getModelKey(accountId: string, model: CustomModel) {
  const saved = sessionStorage.getItem(keyStorage(accountId, model.id));
  const prefix = model.baseUrl + '\n';
  return saved?.startsWith(prefix) ? saved.slice(prefix.length) : '';
}

export function setModelKey(accountId: string, model: CustomModel, apiKey: string) {
  sessionStorage.setItem(keyStorage(accountId, model.id), `${model.baseUrl}\n${apiKey}`);
}

export function removeModelKey(accountId: string, modelId: string) {
  sessionStorage.removeItem(keyStorage(accountId, modelId));
}

export function clearModelKeys(accountId: string) {
  const prefix = keyStorage(accountId, '');
  for (const slot of Object.keys(sessionStorage)) {
    if (slot.startsWith(prefix)) sessionStorage.removeItem(slot);
  }
}

export function customModelRequest(model: CustomModel, apiKey: string): CustomModelRequest {
  return { baseUrl: model.baseUrl, model: model.model, vision: model.vision, tools: model.tools, apiKey };
}

export async function testCustomModel(model: CustomModel, apiKey: string, signal: AbortSignal) {
  const response = await fetch('/api/agent/custom-model/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...await authHeaders() },
    body: JSON.stringify(customModelRequest(model, apiKey)),
    signal,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.ok !== true) throw new Error(result?.message || '连通测试暂不可用。');
}
