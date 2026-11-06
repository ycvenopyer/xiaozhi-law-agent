import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/types/agent';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: ChatMessage[];
  avatar?: string;
  onResend?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
}

export function MessageList({ messages, avatar, onResend, onRegenerate }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastLen = messages[messages.length - 1]?.content.length ?? 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [messages.length, lastLen]);

  return (
    <div className="mx-auto w-full max-w-[var(--chat-max-width)] space-y-5 px-4 py-6">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} avatar={avatar} onResend={onResend} onRegenerate={onRegenerate} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
