import { useDeferredValue, useState } from 'react';
import { ArrowUpRight, MessageSquare, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { Project, Session } from '@/types/agent';

interface Props {
  sessions: Session[];
  projects: Project[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

const normalize = (text: string) => text.normalize('NFKC').toLowerCase();

export function ConversationSearch({ sessions, projects, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const term = normalize(deferredQuery.trim());
  const results = [...sessions].sort((left, right) => right.updatedAt - left.updatedAt).flatMap(session => {
    const message = term ? session.messages.find(item => normalize(item.content).includes(term)) : undefined;
    if (term && !message && !normalize(session.title).includes(term)) return [];
    const body = message?.content.replace(/\s+/g, ' ').trim() || '';
    const start = term ? Math.max(0, normalize(body).indexOf(term) - 18) : 0;
    const snippet = body ? (start ? '…' : '') + body.slice(start, start + 105) + (body.length > start + 105 ? '…' : '') : '';
    return [{ session, snippet, project: projects.find(project => project.id === session.projectId)?.name }];
  });

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[85dvh] grid-rows-[auto_auto_minmax(0,1fr)] gap-3 overflow-hidden rounded-2xl p-5 sm:max-w-xl">
        <div>
          <DialogTitle>搜索对话</DialogTitle>
          <DialogDescription className="mt-1.5 text-xs">按标题或消息内容查找当前账号的对话。</DialogDescription>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 focus-within:border-primary">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input type="search" autoFocus aria-label="搜索关键词" placeholder="输入关键词…" value={query}
            onChange={event => setQuery(event.target.value)} onKeyDown={event => {
              if (event.key === 'Enter' && query === deferredQuery && results[0]) onSelect(results[0].session.id);
            }} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" />
        </label>
        <div className="min-h-0 overflow-y-auto overscroll-contain">
          <p role="status" className="px-2 pb-2 text-xs text-muted-foreground">{term ? `${results.length} 条匹配` : '最近对话'}</p>
          {results.length ? results.slice(0, 50).map(({ session, snippet, project }) => (
            <button key={session.id} type="button" onClick={() => onSelect(session.id)}
              className="group flex w-full min-w-0 items-center gap-3 rounded-lg px-2.5 py-2.5 text-left hover:bg-muted focus-visible:bg-muted">
              <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{session.title}</span>
                {(project || snippet) && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{[project, snippet].filter(Boolean).join(' · ')}</span>}
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-60" />
            </button>
          )) : <p className="px-2 py-8 text-center text-sm text-muted-foreground">{term ? '找不到匹配的对话。' : '还没有对话。'}</p>}
          {results.length > 50 && <p className="px-2 pt-2 text-xs text-muted-foreground">显示最近的 50 条结果，可缩小关键词范围。</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
