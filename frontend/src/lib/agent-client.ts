import type { AgentEvent, AttachedFile, ChatMessage, GenerationOptions } from '@/types/agent';
import { authHeaders } from './cloudbase';
import { acceptRecord, type CloudRecord } from './cloud-store';
import { imageDataUrl, storeOriginal } from './private-files';
import type { CustomModelRequest } from './custom-models';
import type { DocumentTool } from '../../../shared/document-tools.mjs';

const MAX_JSON_BYTES = 5 * 1024 * 1024;

export type WorkbenchMode = 'compare' | 'infringement' | 'compliance' | 'draft';

export type WorkbenchGenerate = (
  prompt: string,
  onToken: (text: string) => void,
  options?: GenerationOptions & { files?: AttachedFile[]; title?: string },
) => Promise<string>;

export interface IpNews {
  date: string;
  articles: { title: string; url: string; source: string; summary: string }[];
}

export async function fetchIpNews(apiKey: string, signal: AbortSignal): Promise<IpNews> {
  const response = await fetch('/api/agent/ip-news', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...await authHeaders() },
    body: JSON.stringify({ apiKey }),
    signal,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) throw new Error(result?.message || '新闻搜索失败，请重试。');
  return result;
}

function serializeRequest(payload: unknown): string {
  const body = JSON.stringify(payload);
  if (new Blob([body]).size > MAX_JSON_BYTES) {
    throw new Error('请求内容超过 5 MiB，请减少图片、附件或历史消息后重试。');
  }
  return body;
}

/**
 * Stream a chat completion from the backend. The backend returns Server-Sent
 * Events; we parse them incrementally and yield typed AgentEvents.
 */
export async function* streamChat(
  messages: ChatMessage[],
  opts?: {
    model?: string;
    signal?: AbortSignal;
    knowledge?: string;
    tavilyKey?: string;
    workflow?: WorkbenchMode;
    documentTool?: DocumentTool;
    customModel?: CustomModelRequest;
    conversationId?: string;
    assistantMessageId?: string;
    resumeRevision?: number;
    onSaved?: (record: CloudRecord) => void;
  }
): AsyncGenerator<AgentEvent> {
  // Only send what the LLM needs: role + text content (including any attached
  // document text) and image data URLs for vision input. Tool calls/results are
  // handled server-side, so we strip them.
  const history = opts?.documentTool ? messages.slice(-1) : messages;
  const payload = await Promise.all(history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map(async (m) => {
      let content = m.content;
      const images: string[] = [];
      if (m.files && m.files.length) {
        const docs = m.files
          .filter((f) => f.kind !== 'image')
          .map((f) => opts?.documentTool ? f.text : `\n\n【附带的文档：${f.name}】\n${f.text}\n【文档结束】`)
          .join('\n\n');
        const imgs = m.files.filter((f) => f.kind === 'image');
        for (const f of imgs) images.push(await imageDataUrl(f));
        content = docs
          ? content
            ? content + docs
            : opts?.documentTool ? docs : '请根据以下文档回答问题：' + docs
          : content;
      }
      return images.length ? { role: m.role, content, images } : { role: m.role, content };
    }));

  const body = serializeRequest({
    messages: payload, model: opts?.model, workflow: opts?.workflow, documentTool: opts?.documentTool,
    knowledge: opts?.knowledge, tavilyKey: opts?.tavilyKey, customModel: opts?.customModel,
    conversationId: opts?.conversationId, assistantMessageId: opts?.assistantMessageId,
    manualContinuation: true, resumeRevision: opts?.resumeRevision,
  });
  for await (const event of readChatSegment(body, opts?.signal, opts?.onSaved)) {
    if (event.type !== 'resume') yield event;
  }
}

type SegmentEvent = AgentEvent | { type: 'resume'; revision: number };

async function* readChatSegment(body: string, signal?: AbortSignal,
  onSaved?: (record: CloudRecord) => void): AsyncGenerator<SegmentEvent> {

  const res = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...await authHeaders() },
    body,
    signal,
  });

  if (!res.ok || !res.body) {
    let msg = `请求失败（${res.status}）`;
    try {
      const j = await res.json();
      if (j?.message) msg = j.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      try {
        const event = JSON.parse(data) as SegmentEvent | { type: 'saved'; record: CloudRecord };
        if (event.type === 'saved') {
          acceptRecord(event.record);
          onSaved?.(event.record);
        } else yield event;
      } catch {
        /* ignore partial frames */
      }
    }
  }
}

/**
 * Upload a file to the backend, which extracts readable text we can attach
 * to the next prompt. Returns the parsed file metadata.
 */
export async function uploadFile(file: File): Promise<AttachedFile> {
  const stored = await storeOriginal(file);
  if (stored.kind === 'image') return stored;
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/agent/files', { method: 'POST', headers: await authHeaders(), body: form });
  if (!res.ok) {
    let msg = '文件上传失败';
    try {
      const j = await res.json();
      if (j?.message) msg = j.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const j = await res.json();
  return {
    ...stored,
    name: j.name,
    size: j.size,
    text: j.text,
    charCount: j.charCount,
    truncated: j.truncated,
    type: j.type,
  };
}
