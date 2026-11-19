import { useEffect, useState } from 'react';
import { ArrowDown, FileText, Loader2 } from 'lucide-react';
import type { ChatMessage, AttachedFile } from '@/types/agent';
import { downloadOriginal, imageDataUrl } from '@/lib/private-files';
import { Markdown } from './Markdown';
import { ReportDownloads } from './ReportPreview';
import { ToolCallCard } from './ToolCallCard';
import { MessageActions } from './MessageActions';

interface MessageBubbleProps {
  message: ChatMessage;
  avatar?: string;
  streaming?: boolean;
  onContinue?: () => void;
  onResend?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
}

function PrivateAttachment({ file }: { file: AttachedFile }) {
  const [url, setUrl] = useState(file.dataUrl || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function open() {
    setBusy(true); setError('');
    try {
      if (file.kind === 'image') setUrl(await imageDataUrl(file));
      else await downloadOriginal(file);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '文件读取失败'); }
    finally { setBusy(false); }
  }
  return <div className="mt-2">
    {url ? <img src={url} alt={file.name} className="max-h-56 rounded-lg border border-white/20 object-contain" /> :
      <button onClick={() => void open()} disabled={busy || !file.storagePath} className="flex items-center gap-1.5 rounded-md bg-white/15 px-2 py-1 text-[0.78rem] disabled:opacity-60">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
        <span className="max-w-[200px] truncate">{file.name}</span><span>{file.storagePath ? file.kind === 'image' ? '查看' : '下载' : '旧文本附件'}</span>
      </button>}
    {error && <p role="alert" className="mt-1 text-xs">{error}</p>}
  </div>;
}

export function MessageBubble({ message, avatar, streaming, onContinue, onResend, onRegenerate }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [generationExpired, setGenerationExpired] = useState(() => Date.now() - message.createdAt >= 150_000);
  useEffect(() => {
    const delay = 150_000 - (Date.now() - message.createdAt);
    if (delay <= 0) return;
    const timer = window.setTimeout(() => setGenerationExpired(true), delay);
    return () => window.clearTimeout(timer);
  }, [message.createdAt]);

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
              className="w-full resize-none bg-transparent text-[length:var(--font-size-body)] leading-relaxed text-foreground outline-none"
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
            <p className="whitespace-pre-wrap text-[length:var(--font-size-body)] leading-relaxed">{message.content}</p>
          )}
          {message.files?.map(file => <PrivateAttachment key={file.id} file={file} />)}
        </div>
        {message.content && (
          <MessageActions
            role="user"
            content={message.content}
            onEdit={onResend && (() => {
              setDraft(message.content);
              setEditing(true);
            })}
          />
        )}
      </div>
    );
  }

  const empty =
    message.content.trim() === '' && (!message.toolCalls || message.toolCalls.length === 0);
  const canContinue = message.status === 'interrupted' && message.continuation && onContinue;

  return (
    <div className="msg-assistant flex gap-3">
      <img
        src={avatar ?? '/xiaozhi-avatar.png'}
        alt="小知"
        className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-primary/20"
      />
      <div className="min-w-0 flex-1 pt-1">
        {empty ? !canContinue && (
          <div className="flex items-center gap-1.5 text-[0.85rem] text-muted-foreground">
            {message.status === 'generating' && (streaming || !generationExpired) ? <><Loader2 className="h-4 w-4 animate-spin" />思考中…</> : '此回答尚未完成，可重新生成。'}
          </div>
        ) : (
          <>
            <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-2.5"><Markdown content={message.content} /></div>
            {!canContinue && (message.status === 'failed' || message.status === 'interrupted') && <p role="status" className="mt-2 text-xs text-muted-foreground">生成未完成，可核对已有内容后重新生成。</p>}
            {message.exportName && message.content.trim() && message.status !== 'generating' &&
              <ReportDownloads title={message.exportName} report={message.content} />}
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
        {canContinue && <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={onContinue}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/35 bg-primary/5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10">
            <ArrowDown className="size-3.5" />继续生成
          </button>
          <p role="status" className="text-xs text-muted-foreground">
            {empty ? '本段暂未收到正文，可以继续尝试。' : '已保存本段，继续生成会接在这条回复里。'}
          </p>
        </div>}
        {message.toolCalls?.map((t) => (
          <ToolCallCard key={t.id} tool={t} />
        ))}
      </div>
    </div>
  );
}
