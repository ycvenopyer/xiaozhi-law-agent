/**
 * Shared types for the AI Agent module.
 * Messages follow the OpenAI chat-completions shape so any OpenAI-compatible
 * provider can be used.
 */

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    /** JSON-encoded arguments string, as required by the OpenAI API */
    arguments: string;
  };
}

export interface ChatMessage {
  role: Role;
  content: string | null;
  tool_calls?: ToolCall[];
  /** present on role:"tool" messages to link back to the assistant tool_call */
  tool_call_id?: string;
  name?: string;
  /** base64 data URLs of images attached by the user (vision input) */
  images?: string[];
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description?: string; enum?: string[] }>;
      required?: string[];
    };
  };
}

/** Events pushed to the browser over the SSE stream. */
export type AgentEvent =
  | { type: 'token'; content: string }
  | { type: 'tool_start'; id: string; name: string; arguments: string }
  | { type: 'tool_end'; id: string; name: string; result: string }
  | { type: 'done' }
  | { type: 'error'; message: string };
