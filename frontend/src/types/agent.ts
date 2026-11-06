export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  text: string;
  charCount: number;
  truncated: boolean;
  type: string;
  /** 'image' for pictures sent as vision input, 'doc' for text-extracted files */
  kind?: 'image' | 'doc';
  /** base64 data URL for image attachments */
  dataUrl?: string;
}

export interface ToolCallView {
  id: string;
  name: string;
  arguments: string;
  result?: string;
  status: 'running' | 'done';
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  toolCalls?: ToolCallView[];
  files?: AttachedFile[];
  createdAt: number;
}

export interface Session {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  /** Structured case background for the matter being handled in this session. */
  dossier?: CaseDossier;
}

/** A lawyer-style case file: who, what cause, what happened, what's claimed. */
export interface CaseDossier {
  parties: string;
  cause: string;
  facts: string;
  claims: string;
  evidence: string;
  /** Original uploaded material, kept for reference (not sent to the model). */
  raw?: string;
}

export const EMPTY_DOSSIER: CaseDossier = {
  parties: '',
  cause: '',
  facts: '',
  claims: '',
  evidence: '',
};

export const DOSSIER_CAUSES = [
  '商标侵权',
  '专利侵权',
  '著作权侵权',
  '不正当竞争',
  '商业秘密',
  '其他',
];

/** Placeholder kept in `raw` when the dossier was recognized from images. */
export const IMAGE_DOSSIER_RAW = '（图片卷宗，已通过视觉模型识别）';

/** Serialize the dossier into the block the backend injects as case background. */
export function dossierToText(d?: CaseDossier): string {
  if (!d) return '';
  const lines: string[] = [];
  if (d.parties.trim()) lines.push(`当事人：${d.parties.trim()}`);
  if (d.cause.trim()) lines.push(`案由：${d.cause.trim()}`);
  if (d.facts.trim()) lines.push(`核心事实：${d.facts.trim()}`);
  if (d.claims.trim()) lines.push(`诉讼请求：${d.claims.trim()}`);
  if (d.evidence.trim()) lines.push(`证据清单：${d.evidence.trim()}`);
  return lines.join('\n');
}

export type AgentEvent =
  | { type: 'token'; content: string }
  | { type: 'tool_start'; id: string; name: string; arguments: string }
  | { type: 'tool_end'; id: string; name: string; result: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

/** Friendly metadata for each built-in tool. */
export const TOOL_META: Record<string, { label: string; icon: string; tone: string }> = {
  calculator: { label: '计算', icon: 'Calculator', tone: 'text-emerald-600 dark:text-emerald-400' },
  get_datetime: { label: '时间', icon: 'Clock', tone: 'text-sky-600 dark:text-sky-400' },
  web_search: { label: '联网搜索', icon: 'Globe', tone: 'text-violet-600 dark:text-violet-400' },
  trademark_search: { label: '商标检索', icon: 'Copyright', tone: 'text-amber-600 dark:text-amber-400' },
};
