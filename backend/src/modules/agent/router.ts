import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { env } from '../../config/env';
import { runAgent, extractDossier, friendlyError } from './llm';
import { getProvider, listProviders } from './providers';
import { upload, parseFile } from './files';
import type { ChatMessage } from './types';

export const agentRouter = Router();

/** GET /api/agent/config — lets the UI show the default model and setup state. */
agentRouter.get('/config', (_req: Request, res: Response) => {
  res.json({
    model: env.LLM_MODEL,
    baseUrl: env.LLM_BASE_URL,
    configured: Boolean(env.LLM_API_KEY),
  });
});

/** GET /api/agent/models — list switchable models and which are configured. */
agentRouter.get('/models', (_req: Request, res: Response) => {
  res.json(listProviders());
});

const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.union([z.string(), z.null()]).optional(),
  tool_calls: z.any().optional(),
  tool_call_id: z.string().optional(),
  name: z.string().optional(),
  images: z.array(z.string()).optional(),
});

const chatBodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(60),
  model: z.string().optional(),
  // Curated laws/cases the UI sends so the model answers from authority.
  knowledge: z.string().optional(),
  // Structured case dossier (parties / cause / facts / claims / evidence) so
  // the assistant reasons about the actual matter instead of in the abstract.
  dossier: z.string().optional(),
});

/**
 * POST /api/agent/chat
 * Server-Sent Events stream of AgentEvents:
 *   token | tool_start | tool_end | done | error
 */
agentRouter.post('/chat', async (req: Request, res: Response) => {
  const parsed = chatBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: '请求格式不正确：messages 必须是非空数组。' });
  }

  const hasImages = parsed.data.messages.some(
    (m) => Array.isArray(m.images) && m.images.length > 0
  );
  const provider = getProvider(parsed.data.model, hasImages);
  if (!provider.apiKey) {
    const avail = listProviders()
      .filter((p) => p.available)
      .map((p) => p.label);
    return res.status(400).json({
      message: `所选模型未配置对应 API Key。当前可用：${avail.join('、') || '无'}`,
    });
  }

  // Set SSE headers early so the browser receives tokens live.
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const send = (obj: unknown) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  // Heartbeat: corporate proxies (and Cloud Studio's gateway) silently drop
  // idle SSE streams after 30-60s. A trivial periodic comment line keeps the
  // socket warm without polluting the parsed event stream.
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) res.write(': ping\n\n');
  }, 15_000);

  const ac = new AbortController();
  // Use res (not req) close: req 'close' fires once express.json() finishes
  // reading the body, which would abort generation before it starts.
  res.on('close', () => ac.abort());

  try {
    await runAgent(
      parsed.data.messages as ChatMessage[],
      send as any,
      ac.signal,
      provider,
      parsed.data.knowledge,
      parsed.data.dossier
    );
  } catch (err) {
    send({ type: 'error', message: (err as Error).message || '生成失败' });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});

/**
 * POST /api/agent/files  (multipart/form-data, field name "file")
 * Returns extracted text so the client can include it in the next prompt.
 */
agentRouter.post('/files', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: '未收到文件' });
  }
  try {
    const result = await parseFile(req.file);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message || '文件解析失败' });
  }
});

/**
 * POST /api/agent/extract-dossier
 * Body: { text?: string, images?: string[] }
 * Uses the LLM to turn raw case material into a structured dossier
 * (parties / cause / facts / claims / evidence) without streaming.
 */
agentRouter.post('/extract-dossier', async (req: Request, res: Response) => {
  const schema = z.object({
    text: z.string().optional(),
    images: z.array(z.string()).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: '请求格式不正确' });
  }
  const { text, images } = parsed.data;
  if (!text && !images?.length) {
    return res.status(400).json({ message: '请上传卷宗文本或图片' });
  }
  try {
    const result = await extractDossier({ text, images });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: friendlyError(String((err as Error)?.message || err)) });
  }
});
