import type { AgentEvent, AttachedFile, ChatMessage } from '@/types/agent';

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_JSON_BYTES = 5 * 1024 * 1024;

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
    dossier?: string;
  }
): AsyncGenerator<AgentEvent> {
  // Only send what the LLM needs: role + text content (including any attached
  // document text) and image data URLs for vision input. Tool calls/results are
  // handled server-side, so we strip them.
  const payload = messages
    .filter((m) => m.role !== 'system')
    .map((m) => {
      let content = m.content;
      const images: string[] = [];
      if (m.files && m.files.length) {
        const docs = m.files
          .filter((f) => f.kind !== 'image')
          .map((f) => `\n\n【附带的文档：${f.name}】\n${f.text}\n【文档结束】`)
          .join('');
        const imgs = m.files.filter((f) => f.kind === 'image' && f.dataUrl);
        for (const f of imgs) if (f.dataUrl) images.push(f.dataUrl);
        content = docs
          ? content
            ? content + docs
            : '请根据以下文档回答问题：' + docs
          : content;
      }
      return images.length ? { role: m.role, content, images } : { role: m.role, content };
    });

  const res = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: serializeRequest({
      messages: payload,
      model: opts?.model,
      knowledge: opts?.knowledge,
      dossier: opts?.dossier,
    }),
    signal: opts?.signal,
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
        yield JSON.parse(data) as AgentEvent;
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
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('文件超过 4 MiB，请压缩或拆分后重试。');
  }
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/agent/files', { method: 'POST', body: form });
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
    id: crypto.randomUUID(),
    name: j.name,
    size: j.size,
    text: j.text,
    charCount: j.charCount,
    truncated: j.truncated,
    type: j.type,
  };
}

/**
 * Ask the backend to turn raw case material (text or images) into a structured
 * dossier via the LLM. Returns the extracted fields.
 */
export async function extractDossier(payload: {
  text?: string;
  images?: string[];
}): Promise<Record<string, string>> {
  const res = await fetch('/api/agent/extract-dossier', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: serializeRequest(payload),
  });
  if (!res.ok) {
    let msg = '卷宗识别失败';
    try {
      const j = await res.json();
      if (j?.message) msg = j.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json();
}
