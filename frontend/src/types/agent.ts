export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface ModelInfo {
  id: string;
  label: string;
  free: boolean;
  available: boolean;
  vision?: boolean;
  provider?: string;
}

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
  storagePath?: string;
  storageBucket?: string;
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
  status?: 'generating' | 'complete' | 'failed' | 'interrupted';
}

export interface Session {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  /** Sidebar organization, stored with the account's conversation record. */
  projectId?: string;
  pinnedAt?: number;
  titleEdited?: boolean;
  /** Retained for records imported from older versions. */
  dossier?: CaseDossier;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
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
  sourceFiles?: AttachedFile[];
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
};
