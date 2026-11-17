import { randomUUID } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { runAgent, extractDossier } from './llm';
import { MODEL_REGISTRY, listProviders } from './providers';
import { upload, parseFile } from './files';
import { identity, recordRpc, type UserRecord } from '../cloudbase';
import { requireModelConsent } from './privacy';
import { AppError } from '../../middleware/errorHandler';
import type { ChatMessage, AgentEvent } from './types';
import { findSkill, SKILL_CATALOG, skillMention } from './skills';

export const agentRouter = Router();
agentRouter.get('/models', (_req, res) => res.json(listProviders()));
agentRouter.get('/skills', (_req, res) => res.json(SKILL_CATALOG));

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']), content: z.string(),
  images: z.array(z.string().startsWith('data:image/')).max(8).optional(),
});
const chatSchema = z.object({
  messages: z.array(messageSchema).min(1).max(60), model: z.string(),
  knowledge: z.string().optional(), dossier: z.string().optional(),
  skillId: z.string().max(64).optional(),
  conversationId: z.string().min(1).max(200), assistantMessageId: z.string().min(1).max(200),
});

function selectedModel(id: string, hasImages: boolean) {
  const model = MODEL_REGISTRY.find(provider => provider.id === id);
  if (!model || !model.apiKey) throw new AppError(400, '所选模型不存在或未配置。');
  if (hasImages && !model.vision) throw new AppError(400, '图片分析需要选择支持视觉的模型，不会自动切换供应商。');
  return model;
}

agentRouter.post('/chat', async (req: Request, res: Response) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: '请求格式不正确或上下文过长，请新建对话。' });
  const input = parsed.data;
  const skillId = input.skillId || skillMention(input.messages.filter(message => message.role === 'user').at(-1)?.content || '');
  const skill = findSkill(skillId);
  if (skillId && !skill) return res.status(400).json({ message: '该 Skill 不存在，请刷新技能列表后重试。' });
  const user = identity(res);
  const provider = selectedModel(input.model, input.messages.some(message => !!message.images?.length));
  await requireModelConsent(user.token);
  const runId = randomUUID();
  const record = await recordRpc<UserRecord>(user.token, 'begin_chat', { p_id: input.conversationId, p_run: runId });
  const stored = record.payload;
  const messages = Array.isArray(stored.messages) ? stored.messages as Array<Record<string, unknown>> : [];
  const assistant = messages.find(message => message.id === input.assistantMessageId && message.role === 'assistant');
  if (!assistant) {
    await recordRpc(user.token, 'finish_chat', { p_id: input.conversationId, p_run: runId, p_payload: stored });
    throw new AppError(400, '请先保存本次消息再生成回答。');
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  const send = (event: unknown) => {
    if (!res.writableEnded && !res.destroyed) res.write(`data: ${JSON.stringify(event)}\n\n`);
  };
  const ac = new AbortController();
  let timedOut = false;
  let completed = false;
  let failure = '';
  let content = '';
  const toolCalls: Array<Record<string, unknown>> = [];
  const activatedSkills = new Set<string>();
  const heartbeat = setInterval(() => { if (!res.destroyed) res.write(': ping\n\n'); }, 15_000);
  // Leave time to persist a partial answer before the platform's hard limit.
  const deadline = setTimeout(() => { timedOut = true; ac.abort(); }, 100_000);
  res.on('close', () => { ac.abort(); clearInterval(heartbeat); clearTimeout(deadline); });
  try {
    await runAgent(input.messages as ChatMessage[], (event: AgentEvent) => {
      if (event.type === 'token') content += event.content;
      if (event.type === 'skill') activatedSkills.add(event.id);
      if (event.type === 'tool_start') toolCalls.push({ ...event, status: 'running' });
      if (event.type === 'tool_end') {
        const tool = toolCalls.find(item => item.id === event.id);
        if (tool) Object.assign(tool, { result: event.result, status: 'done' });
      }
      if (event.type === 'done') { completed = true; return; }
      send(event);
    }, ac.signal, provider, input.knowledge, input.dossier, skill?.id);
  } catch {
    // Do not expose upstream response bodies, prompts, or supplier diagnostics.
    failure = '模型生成失败，请稍后重试。';
  } finally {
    clearTimeout(deadline); clearInterval(heartbeat);
    if (timedOut) failure = '生成超过 100 秒，已保存已收到的内容。';
    const status = failure ? 'failed' : ac.signal.aborted && !completed ? 'interrupted' : 'complete';
    assistant.content = content || (failure ? `⚠️ ${failure}` : '');
    assistant.status = status;
    assistant.toolCalls = toolCalls;
    assistant.skillIds = [...activatedSkills];
    stored.updatedAt = Date.now();
    try {
      const saved = await recordRpc<UserRecord>(user.token, 'finish_chat', {
        p_id: input.conversationId, p_run: runId, p_payload: stored,
      });
      send({ type: 'saved', record: saved });
      if (failure) send({ type: 'error', message: failure });
      send({ type: 'done' });
    } catch {
      send({ type: 'error', message: '回答未能确认保存，请保留页面内容并刷新核对云端记录。' });
    }
    if (!res.writableEnded) res.end();
  }
  return undefined;
});

// Parsing stays inside this backend; this endpoint never calls a model.
agentRouter.post('/files', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ message: '未收到文件。' });
  const result = await parseFile(req.file);
  return res.json(result);
});

agentRouter.post('/extract-dossier', async (req: Request, res: Response) => {
  const input = z.object({ text: z.string().optional(), images: z.array(z.string().startsWith('data:image/')).max(8).optional(),
    model: z.string() }).parse(req.body);
  if (!input.text && !input.images?.length) throw new AppError(400, '请提供卷宗材料。');
  const provider = selectedModel(input.model, !!input.images?.length);
  await requireModelConsent(identity(res).token);
  const ac = new AbortController();
  const deadline = setTimeout(() => ac.abort(), 100_000);
  res.on('close', () => ac.abort());
  try {
    const result = await extractDossier(input, ac.signal, provider);
    if (!res.destroyed) return res.json(result);
  } catch {
    if (!res.destroyed) return res.status(ac.signal.aborted ? 504 : 502).json({ message: '卷宗识别失败，可使用本地章节提取或稍后重试。' });
  } finally { clearTimeout(deadline); }
  return undefined;
});
