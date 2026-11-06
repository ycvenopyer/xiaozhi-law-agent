import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_PREFIX: z.string().default('/api'),

  CORS_ORIGIN: z.string().refine(
    (val) => val === '*' || z.string().url().safeParse(val).success,
    { message: 'CORS_ORIGIN must be a valid URL or "*" for all origins' }
  ).default('*'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // ============================================
  // LLM (OpenAI-compatible) configuration
  // ============================================
  LLM_API_KEY: z.string().optional(),
  LLM_BASE_URL: z.string().default('https://api.deepseek.com/v1'),
  LLM_MODEL: z.string().default('deepseek-chat'),
  LLM_TEMPERATURE: z.string().transform(Number).default('0.7'),
  LLM_MAX_TOKENS: z.string().transform(Number).default('2000'),

  // Optional web search provider for live legal/case retrieval.
  //  - Tavily:  WEB_SEARCH_PROVIDER=tavily  WEB_SEARCH_API_KEY=<key>
  //  - SerpAPI: WEB_SEARCH_PROVIDER=serpapi WEB_SEARCH_API_KEY=<key>
  // When unset, the assistant answers from its own knowledge and flags
  // statutes/cases for the lawyer to verify (no live internet in sandbox).
  WEB_SEARCH_PROVIDER: z.string().optional(),
  WEB_SEARCH_API_KEY: z.string().optional(),

  // OpenRouter key — unlocks free models (Qwen 14B / Llama 8B) and other
  // OpenAI-compatible models. Leave blank to use only DeepSeek.
  OPENROUTER_API_KEY: z.string().optional(),

  // Zhipu BigModel (智谱) — Chinese GLM models, free tier GLM-4.7-Flash
  // (200K context, no daily limit, 1 concurrent). Sign up at open.bigmodel.cn.
  ZHIPU_API_KEY: z.string().optional(),

  // SiliconFlow (硅基流动) — 1000 RPM free tier, Chinese open-source models
  // (Qwen3-8B, GLM-4-9B, DeepSeek-R1-Distill-Qwen-7B). Sign up at
  // cloud.siliconflow.cn (phone + ID verification, no credit card).
  SILICONFLOW_API_KEY: z.string().optional(),
})

const parseEnv = () => {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    console.error('❌ Invalid environment variables:', error)
    process.exit(1)
  }
}

export const env = parseEnv()
