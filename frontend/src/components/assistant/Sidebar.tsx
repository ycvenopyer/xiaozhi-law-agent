import { Plus, MessageSquare, Trash2, Sparkles, Palette, ClipboardList } from 'lucide-react';
import type { Session } from '@/types/agent';

function timeAgo(ts: number): string {
  const d = Date.now() - ts;
  const m = 60000;
  const h = 3600000;
  const day = 86400000;
  if (d < m) return '刚刚';
  if (d < h) return `${Math.floor(d / m)} 分钟前`;
  if (d < day) return `${Math.floor(d / h)} 小时前`;
  return `${Math.floor(d / day)} 天前`;
}

interface Props {
  sessions: Session[];
  currentId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  modelName: string;
  onOpenAppearance: () => void;
  onOpenWorkbench: () => void;
  right?: boolean;
}

export function Sidebar({ sessions, currentId, onSelect, onNew, onDelete, modelName, onOpenAppearance, onOpenWorkbench, right }: Props) {
  return (
    <aside
      className={`flex h-full w-64 shrink-0 flex-col bg-sidebar ${
        right ? 'order-2 border-l border-sidebar-border' : 'order-1 border-r border-sidebar-border'
      }`}
    >
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">智能助理</div>
          <div className="text-[0.7rem] text-muted-foreground">AI Personal Assistant</div>
        </div>
      </div>

      <div className="px-3">
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 dark:text-white"
        >
          <Plus className="h-4 w-4" /> 新建对话
        </button>
      </div>

      <nav className="mt-3 flex-1 space-y-1 overflow-y-auto px-2">
        {sessions.length === 0 && (
          <p className="px-2 py-4 text-center text-[0.78rem] text-muted-foreground">还没有对话记录</p>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 ${
              s.id === currentId ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
            }`}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.85rem]">{s.title}</div>
              <div className="text-[0.68rem] text-muted-foreground">{timeAgo(s.updatedAt)}</div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(s.id);
              }}
              className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              title="删除对话"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-sidebar-border px-4 py-3">
        <div className="text-[0.7rem] text-muted-foreground">模型：{modelName}</div>
        <button
          onClick={onOpenAppearance}
          className="flex w-full items-center gap-2 rounded-md border border-sidebar-border px-2.5 py-1.5 text-[0.78rem] text-sidebar-foreground hover:bg-muted hover:text-foreground"
          title="界面外观"
        >
          <Palette className="h-3.5 w-3.5" />
          界面外观
        </button>
        <button
          onClick={onOpenWorkbench}
          className="flex w-full items-center gap-2 rounded-md border border-sidebar-border px-2.5 py-1.5 text-[0.78rem] text-sidebar-foreground hover:bg-muted hover:text-foreground"
          title="事务台"
        >
          <ClipboardList className="h-3.5 w-3.5" />
          事务台
        </button>
      </div>
    </aside>
  );
}
