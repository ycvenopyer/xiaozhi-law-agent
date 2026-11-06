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
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const ZHIPU_BASE = 'https://open.bigmodel.cn/api/paas/v4';
const SILICONFLOW_BASE = 'https://api.siliconflow.cn/v1';

/**
 * Models the UI can switch between. Only FREE models are listed — the paid
 * DeepSeek key is intentionally excluded so the app never bills the user.
 * Each model resolves its key from OPENROUTER_API_KEY (configured in .env).
 */
export const MODEL_REGISTRY: ModelProvider[] = [
  // Zhipu GLM-4.7 — permanent free, Chinese-strong, 200K context.
  // Listed first so it's the default and fallback for any query type.
  {
    id: 'zhipu-glm',
    label: '智谱 GLM-4.7',
    baseUrl: ZHIPU_BASE,
    model: 'glm-4.7',
    apiKey: env.ZHIPU_API_KEY || '',
    free: true,
    vision: false,
  },
  // Zhipu GLM-4.7-FlashX — faster variant of GLM-4.7, same 200K context,
  // also permanent free. Useful as a low-latency backup.
  {
    id: 'zhipu-flashx',
    label: '智谱 GLM-4.7-FlashX',
    baseUrl: ZHIPU_BASE,
    model: 'glm-4.7-flashx',
    apiKey: env.ZHIPU_API_KEY || '',
    free: true,
    vision: false,
  },
  // Zhipu GLM-4.6V-Flash — multimodal free model (text + image).
  // Replaces OpenRouter's Ling vision model as a domestic, free alternative.
  {
    id: 'zhipu-vision',
    label: '智谱 GLM-4.6V-Flash',
    baseUrl: ZHIPU_BASE,
    model: 'glm-4.6v-flash',
    apiKey: env.ZHIPU_API_KEY || '',
    free: true,
    vision: true,
  },
  // Zhipu GLM-4.5-Air — lightweight free text model, 128K context.
  // Smaller/faster than GLM-4.7; a third backup if the others get rate-limited.
  {
    id: 'zhipu-air',
    label: '智谱 GLM-4.5-Air',
    baseUrl: ZHIPU_BASE,
    model: 'glm-4.5-air',
    apiKey: env.ZHIPU_API_KEY || '',
    free: true,
    vision: false,
  },
  // SiliconFlow Qwen3-8B — 1000 RPM free tier, fast response for daily Q&A.
  // Domestic, low-latency; 32K context. Best for general legal chat.
  {
    id: 'sf-qwen3',
    label: '硅基流动 Qwen3-8B',
    baseUrl: SILICONFLOW_BASE,
    model: 'Qwen/Qwen3-8B',
    apiKey: env.SILICONFLOW_API_KEY || '',
    free: true,
    vision: false,
  },
  // SiliconFlow DeepSeek-R1-Distill-Qwen-7B — reasoning-focused, 131K context.
  // Best for complex legal analysis (lessons per step).
  {
    id: 'sf-deepseek-r1',
    label: '硅基流动 DeepSeek-R1-Distill',
    baseUrl: SILICONFLOW_BASE,
    model: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
    apiKey: env.SILICONFLOW_API_KEY || '',
    free: true,
    vision: false,
  },
  // SiliconFlow GLM-4-9B-Chat — Zhipu's compact 9B model hosted on
  // SiliconFlow for higher RPM than Zhipu direct.
  {
    id: 'sf-glm4-9b',
    label: '硅基流动 GLM-4-9B',
    baseUrl: SILICONFLOW_BASE,
    model: 'THUDM/glm-4-9b-chat',
    apiKey: env.SILICONFLOW_API_KEY || '',
    free: true,
    vision: false,
  },
  {
    id: 'qwen-free',
    label: 'Qwen 27B',
    baseUrl: OPENROUTER_BASE,
    model: 'qwen/qwen3.8-27b:free',
    apiKey: env.OPENROUTER_API_KEY || '',
    free: true,
    vision: true,
  },
  {
    id: 'ling-vl-free',
    label: 'Ling 视觉',
    baseUrl: OPENROUTER_BASE,
    model: 'inclusionai/ling-3.0-flash-vl:free',
    apiKey: env.OPENROUTER_API_KEY || '',
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
  }));
}

/**
 * Build an ordered fallback chain starting from the primary provider.
 * When the message contains images, only vision-capable models are included,
 * so a rate-limited model can transparently hand off to another free model.
 */
export function getProviderChain(primary: ModelProvider, hasImages: boolean): ModelProvider[] {
  const usable = MODEL_REGISTRY.filter((p) => p.apiKey);
  const ok = usable.filter((p) => (hasImages ? p.vision : true));
  const chain = [primary, ...ok.filter((p) => p.id !== primary.id)];
  if (ok.length && !chain.some((p) => ok.includes(p))) chain.unshift(ok[0]);
  return chain;
}

/**
 * Resolve a requested model id to a usable provider, falling back safely.
 * When the message contains images but the chosen model can't see them,
 * automatically switch to a vision-capable free model so image analysis works.
 */
export function getProvider(id?: string, hasImages = false): ModelProvider {
  const requested = id ? MODEL_REGISTRY.find((p) => p.id === id) : undefined;

  // If images are attached but the chosen model can't see them, switch to a
  // vision-capable free model so image analysis still works.
  if (hasImages && requested && !requested.vision) {
    const vision = MODEL_REGISTRY.find((p) => p.apiKey && p.vision);
    if (vision) return vision;
  }

  if (requested && requested.apiKey) return requested;

  if (hasImages) {
    const vision = MODEL_REGISTRY.find((p) => p.apiKey && p.vision);
    if (vision) return vision;
  }

  return MODEL_REGISTRY.find((p) => p.apiKey) ?? MODEL_REGISTRY[0];
}
