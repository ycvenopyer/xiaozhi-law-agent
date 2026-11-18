import dotenv from 'dotenv'
import { z } from 'zod'
import { assemblePublishableKey } from '../../../shared/cloudbase-key.mjs'

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
  CLOUDBASE_ENV_ID: z.string().regex(/^[a-zA-Z0-9-]+$/).default('xiaozhi-law-agent-d3d75m0c534925'),
  CLOUDBASE_PUBLISHABLE_KEY: z.string().optional(),

  // ============================================
  // LLM (OpenAI-compatible) configuration
  // ============================================
  LLM_API_KEY: z.string().optional(),
  LLM_BASE_URL: z.string().default('https://api.deepseek.com/v1'),
  LLM_MODEL: z.string().default('deepseek-chat'),
  LLM_TEMPERATURE: z.string().transform(Number).default('0.7'),
  LLM_MAX_TOKENS: z.string().transform(Number).default('2000'),

  // Key for the built-in Zhipu models.
  ZHIPU_API_KEY: z.string().optional(),
})

const parseEnv = () => {
  try {
    return envSchema.parse({
      ...process.env,
      CLOUDBASE_PUBLISHABLE_KEY: assemblePublishableKey(process.env, 'CLOUDBASE_PUBLISHABLE_KEY') || undefined,
    })
  } catch (error) {
    console.error('❌ Invalid environment variables:', error)
    process.exit(1)
  }
}

export const env = parseEnv()
