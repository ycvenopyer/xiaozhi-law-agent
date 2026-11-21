import { env } from '../../config/env';

export interface ModelProvider {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  free: boolean;
  /** whether this model can understand images (vision input) */
  vision?: boolean;
  tools?: boolean;
  completion?: (body: string, signal: AbortSignal) => Promise<Response>;
}

const ZHIPU_BASE = 'https://open.bigmodel.cn/api/paas/v4';

/** Existing model catalogue. Availability means its platform key is configured,
 * not that the endpoint has been tested or its current pricing verified. */
export const MODEL_REGISTRY: ModelProvider[] = [
  // Existing Zhipu entries retain their model IDs.
  {
    id: 'zhipu-glm',
    label: '智谱 GLM-4.7',
    baseUrl: ZHIPU_BASE,
    model: 'glm-4.7',
    apiKey: env.ZHIPU_API_KEY || '',
    free: false,
    vision: false,
  },
  {
    id: 'zhipu-flash',
    label: '智谱 GLM-4.7-Flash',
    baseUrl: ZHIPU_BASE,
    model: 'glm-4.7-flash',
    apiKey: env.ZHIPU_API_KEY || '',
    free: true,
    vision: false,
  },
  {
    id: 'zhipu-vision',
    label: '智谱 GLM-4.6V-Flash',
    baseUrl: ZHIPU_BASE,
    model: 'glm-4.6v-flash',
    apiKey: env.ZHIPU_API_KEY || '',
    free: true,
    vision: true,
  },
];

/** Lightweight list for the UI (no secrets). */
export function listProviders() {
  return MODEL_REGISTRY.map((p) => ({
    id: p.id,
    label: p.label,
    free: p.free,
    available: Boolean(p.apiKey),
    provider: '智谱 AI',
    vision: Boolean(p.vision),
  }));
}

/** Keep requests on the explicitly selected model. */
export function getProviderChain(primary: ModelProvider, hasImages: boolean): ModelProvider[] {
  // Never transfer case materials to another model or supplier on failure.
  return primary.apiKey && (!hasImages || primary.vision) ? [primary] : [];
}
