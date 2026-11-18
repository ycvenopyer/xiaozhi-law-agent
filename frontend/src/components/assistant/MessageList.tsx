import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import type { ChatMessage } from '@/types/agent';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: ChatMessage[];
  avatar?: string;
  onResend?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
}

export function MessageList({ messages, avatar, onResend, onRegenerate }: MessageListProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const [atBottom, setAtBottom] = useState(true);

  function updateScrollState() {
    const area = scroller.current;
    if (!area) return;
    const nearBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 32;
    follow.current = nearBottom;
    setAtBottom(nearBottom);
  }

  useLayoutEffect(() => {
    const area = scroller.current;
    const inner = content.current;
    if (!area || !inner) return;
    const observer = new ResizeObserver(() => {
      if (follow.current) area.scrollTop = area.scrollHeight;
      updateScrollState();
    });
    area.scrollTop = area.scrollHeight;
    observer.observe(inner);
    observer.observe(area);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scroller} aria-label="对话消息" tabIndex={0} onScroll={updateScrollState}
        className="h-full overflow-x-hidden overflow-y-auto overscroll-contain outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring">
        <div ref={content} className="mx-auto w-full max-w-[var(--chat-max-width)] space-y-5 px-4 pb-12 pt-6">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} avatar={avatar} onResend={onResend} onRegenerate={onRegenerate} />
          ))}
        </div>
      </div>
      {!atBottom && <button type="button" onClick={() => {
        follow.current = true;
        if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
        updateScrollState();
      }} aria-label="跳到底部" title="跳到底部"
        className="absolute bottom-2 left-1/2 grid size-9 -translate-x-1/2 place-items-center rounded-full border border-border bg-card shadow-sm hover:bg-muted">
        <ArrowDown className="size-4" />
      </button>}
    </div>
  );
}
