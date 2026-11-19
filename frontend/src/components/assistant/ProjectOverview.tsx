import { ArrowUpRight, FolderOpen, LoaderCircle, MessageSquarePlus, Pin } from 'lucide-react';
import type { Project, Session } from '@/types/agent';
import { sortConversations } from '@/lib/projects';

export function ProjectOverview({ project, sessions, onNew, onSelect, runningIds }: {
  project: Project;
  sessions: Session[];
  onNew: () => void;
  onSelect: (id: string) => void;
  runningIds: ReadonlySet<string>;
}) {
  return <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-16">
    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 text-primary"><FolderOpen className="h-6 w-6" /></div>
    <p className="text-xs text-muted-foreground">项目 · {sessions.length} 个对话</p>
    <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{project.name}</h1>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">将同一事项的讨论放在一起，继续已有对话，或在这个项目中新建对话。</p>
    <button onClick={onNew} className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"><MessageSquarePlus className="h-4 w-4" />在项目中新建对话</button>
    <div className="mt-10 border-t border-border pt-5">
      <h2 className="mb-3 text-xs font-medium text-muted-foreground">项目对话</h2>
      {sessions.length === 0 ? <div className="rounded-xl border border-dashed border-border p-6 text-sm leading-relaxed text-muted-foreground">这里还没有对话。你也可以从侧边栏的对话菜单中选择「移至项目」，将已有对话放进来。</div> :
        <div className="space-y-1">{sortConversations(sessions).map(session => <button key={session.id} onClick={() => onSelect(session.id)} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted">
          {session.pinnedAt ? <Pin className="h-4 w-4 shrink-0 text-muted-foreground" /> : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />}
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{session.title}</span><span className="mt-1 block text-xs text-muted-foreground">{new Date(session.updatedAt).toLocaleDateString('zh-CN')} · {session.messages.length} 条消息</span></span>
          {runningIds.has(session.id) && <LoaderCircle aria-label="正在生成" className="size-3.5 shrink-0 animate-spin text-primary" />}
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
        </button>)}</div>}
    </div>
  </div>;
}
