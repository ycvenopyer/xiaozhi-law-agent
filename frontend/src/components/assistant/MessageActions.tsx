import { useState } from 'react';
import {
  Check,
  Copy,
  Forward,
  Pencil,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';

interface ActionButtonProps {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ActionButton({ label, active, onClick, children }: ActionButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded-md p-1.5 transition-colors hover:bg-muted ${
        active
          ? 'text-primary'
          : 'text-muted-foreground/60 hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

interface MessageActionsProps {
  role: 'user' | 'assistant';
  content: string;
  onEdit?: (content: string) => void;
  onRegenerate?: (messageId: string) => void;
  messageId?: string;
}

/**
 * DeepSeek 风格的消息操作图标：
 * - 用户消息：复制、修改
 * - 助手消息：复制、重新生成、点赞、点踩、分享
 */
export function MessageActions({
  role,
  content,
  onEdit,
  onRegenerate,
  messageId,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const isUser = role === 'user';

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时静默失败 */
    }
  }

  async function handleCopy() {
    await copyText(content);
  }

  async function handleShare() {
    // 优先调用系统分享，失败或不可用时降级为复制到剪贴板
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: '小知', text: content });
        return;
      } catch {
        /* 用户取消分享则不再复制 */
        return;
      }
    }
    await copyText(content);
  }

  return (
    <div
      className={`mt-1 flex items-center gap-0.5 ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* 复制 */}
      <ActionButton label="复制" onClick={handleCopy}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </ActionButton>

      {isUser ? (
        /* 修改：把内容填回输入框 */
        onEdit && (
          <ActionButton label="修改" onClick={() => onEdit(content)}>
            <Pencil className="h-3.5 w-3.5" />
          </ActionButton>
        )
      ) : (
        <>
          {/* 重新生成 */}
          {onRegenerate && messageId && (
            <ActionButton
              label="重新生成"
              onClick={() => onRegenerate(messageId)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </ActionButton>
          )}
          {/* 点赞 */}
          <ActionButton
            label="点赞"
            active={vote === 'up'}
            onClick={() => setVote(vote === 'up' ? null : 'up')}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </ActionButton>
          {/* 点踩 */}
          <ActionButton
            label="不喜欢"
            active={vote === 'down'}
            onClick={() => setVote(vote === 'down' ? null : 'down')}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </ActionButton>
          {/* 分享 */}
          <ActionButton label="分享" onClick={handleShare}>
            <Forward className="h-3.5 w-3.5" />
          </ActionButton>
        </>
      )}
    </div>
  );
}
