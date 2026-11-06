import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import type { ChatMessage } from '@/types/agent';
import { Markdown } from './Markdown';
import { ToolCallCard } from './ToolCallCard';
import { MessageActions } from './MessageActions';

interface MessageBubbleProps {
  message: ChatMessage;
  avatar?: string;
  onResend?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
}

export function MessageBubble({ message, avatar, onResend, onRegenerate }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  if (isUser) {
    // 原地编辑态：气泡变成编辑框，发送后从该条消息起重写对话
    if (editing) {
      return (
        <div className="msg-user flex flex-col items-end">
          <div className="w-[82%] rounded-2xl border border-primary/40 bg-card p-3 shadow-sm">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={Math.min(8, Math.max(2, draft.split('\n').length))}
              autoFocus
              className="w-full resize-none bg-transparent text-[0.95rem] leading-relaxed text-foreground outline-none"
              placeholder="编辑消息…"
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDraft(message.content);
                }}
                className="rounded-full border border-border px-4 py-1.5 text-[0.82rem] text-muted-foreground hover:bg-muted"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!draft.trim()}
                onClick={() => {
                  setEditing(false);
                  onResend?.(message.id, draft.trim());
                }}
                className="rounded-full bg-primary px-4 py-1.5 text-[0.82rem] text-primary-foreground disabled:opacity-50"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="msg-user flex flex-col items-end">
        <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground shadow-sm">
          {message.content && (
            <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed">{message.content}</p>
          )}
          {message.files?.map((f) =>
            f.kind === 'image' && f.dataUrl ? (
              <img
                key={f.id}
                src={f.dataUrl}
                alt={f.name}
                className="mt-1.5 max-h-56 rounded-lg border border-white/20 object-contain"
              />
            ) : (
              <div
                key={f.id}
                className="mt-1.5 flex items-center gap-1.5 rounded-md bg-white/15 px-2 py-1 text-[0.78rem]"
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="max-w-[200px] truncate">{f.name}</span>
              </div>
            )
          )}
        </div>
        {message.content && (
          <MessageActions
            role="user"
            content={message.content}
            onEdit={() => {
              setDraft(message.content);
              setEditing(true);
            }}
          />
        )}
      </div>
    );
  }

  const empty =
    message.content.trim() === '' && (!message.toolCalls || message.toolCalls.length === 0);

  return (
    <div className="msg-assistant flex gap-3">
      <img
        src={avatar ?? '/xiaozhi-avatar.png'}
        alt="小知"
        className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-primary/20"
      />
      <div className="min-w-0 flex-1 pt-1">
        {empty ? (
          <div className="flex items-center gap-1.5 text-[0.85rem] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            思考中…
          </div>
        ) : (
          <>
            <Markdown content={message.content} />
            {message.content.trim() !== '' && (
              <MessageActions
                role="assistant"
                content={message.content}
                messageId={message.id}
                onRegenerate={onRegenerate}
              />
            )}
          </>
        )}
        {message.toolCalls?.map((t) => (
          <ToolCallCard key={t.id} tool={t} />
        ))}
      </div>
    </div>
  );
}
