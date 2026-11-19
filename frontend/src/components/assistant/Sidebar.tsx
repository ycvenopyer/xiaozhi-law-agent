import { useState, type FormEvent, type ReactNode } from 'react';
import { Check, ChevronDown, ChevronRight, FolderClosed, FolderOpen, FolderPlus, LoaderCircle, MoreHorizontal, PanelLeftClose, Pencil, Pin, PinOff, Plus, Search, SquarePen, Trash2 } from 'lucide-react';
import { ConversationSearch } from './ConversationSearch';
import type { Project, Session } from '@/types/agent';
import { sortConversations } from '@/lib/projects';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Props {
  sessions: Session[];
  projects: Project[];
  currentId: string;
  projectViewId: string | null;
  onSelect: (id: string) => void;
  onNew: (projectId?: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onPin: (id: string) => void;
  onMove: (id: string, projectId?: string) => void;
  onCreateProject: (name: string, sessionId?: string) => string;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  onOpenProject: (id: string) => void;
  footer: ReactNode;
  open: boolean;
  onClose: () => void;
  runningIds: ReadonlySet<string>;
  right?: boolean;
}

type EditDialog = { type: 'create-project'; sessionId?: string } | { type: 'rename-session' | 'delete-session' | 'rename-project' | 'delete-project'; id: string; name: string };

function ConversationRow({ session, active, projects, generating, onSelect, onRename, onDelete, onPin, onMove, onCreateProject }: {
  session: Session;
  active: boolean;
  projects: Project[];
  generating: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
  onPin: () => void;
  onMove: (projectId?: string) => void;
  onCreateProject: () => void;
}) {
  return <div data-session-id={session.id} className={`group flex min-w-0 items-center rounded-lg transition-colors ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/65'}`}>
    <button type="button" onClick={onSelect} aria-current={active ? 'page' : undefined} aria-label={`打开对话：${session.title}`} title={session.title} className="min-w-0 flex-1 rounded-lg px-3 py-2.5 text-left text-[0.84rem] outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"><span className="block truncate">{session.title}</span></button>
    {generating && <LoaderCircle aria-label="正在生成" className="size-3.5 shrink-0 animate-spin text-primary" />}
    {!!session.pinnedAt && <Pin aria-label="已置顶" className="h-3 w-3 shrink-0 text-muted-foreground" />}
    <DropdownMenu>
      <DropdownMenuTrigger asChild><button type="button" disabled={generating} aria-label={`对话“${session.title}”操作`} title={generating ? '生成完成后可修改此对话' : '对话操作'} className="mr-1 shrink-0 rounded-md p-1.5 text-muted-foreground outline-none transition-opacity hover:bg-background/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-background/70 data-[state=open]:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 disabled:opacity-30"><MoreHorizontal className="h-4 w-4" /></button></DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" collisionPadding={12} className="w-48 rounded-xl p-1.5 shadow-lg">
        <DropdownMenuItem onSelect={onRename} className="cursor-pointer rounded-lg py-2.5"><Pencil />重命名</DropdownMenuItem>
        <DropdownMenuItem onSelect={onPin} className="cursor-pointer rounded-lg py-2.5">{session.pinnedAt ? <PinOff /> : <Pin />}{session.pinnedAt ? '取消置顶' : '置顶'}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer rounded-lg py-2.5"><FolderOpen />移至项目</DropdownMenuSubTrigger>
          <DropdownMenuSubContent collisionPadding={12} className="max-h-[min(360px,65dvh)] w-52 overflow-y-auto rounded-xl p-1.5">
            <DropdownMenuItem onSelect={() => onMove()} className="cursor-pointer rounded-lg py-2.5"><SquarePen /><span className="flex-1">普通对话</span>{!session.projectId && <Check className="text-primary" />}</DropdownMenuItem>
            {projects.map(project => <DropdownMenuItem key={project.id} onSelect={() => onMove(project.id)} className="cursor-pointer rounded-lg py-2.5"><FolderClosed /><span className="min-w-0 flex-1 truncate">{project.name}</span>{session.projectId === project.id && <Check className="text-primary" />}</DropdownMenuItem>)}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onCreateProject} className="cursor-pointer rounded-lg py-2.5"><FolderPlus />新建项目…</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete} className="cursor-pointer rounded-lg py-2.5"><Trash2 />删除</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;
}

export function Sidebar(props: Props) {
  const [expanded, setExpanded] = useState(() => new Set(props.projects.map(project => project.id)));
  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [chatsOpen, setChatsOpen] = useState(true);
  const [dialog, setDialog] = useState<EditDialog | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const pinned = sortConversations(props.sessions.filter(session => !!session.pinnedAt));
  const projectIds = new Set(props.projects.map(project => project.id));
  const regular = sortConversations(props.sessions.filter(session => !session.pinnedAt && (!session.projectId || !projectIds.has(session.projectId))));
  const current = props.sessions.find(session => session.id === props.currentId);

  function edit(next: EditDialog) {
    setName('name' in next ? next.name : ''); setError(''); setDialog(next);
  }
  function toggleProject(id: string) { setExpanded(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  function expandProject(id: string) { setProjectsOpen(true); setExpanded(previous => new Set([...previous,id])); }

  function submitDialog(event: FormEvent) {
    event.preventDefault();
    if (!dialog) return;
    const value = name.trim();
    if ((dialog.type === 'create-project' || dialog.type.startsWith('rename-')) && !value) { setError('请输入名称。'); return; }
    if (dialog.type === 'create-project') expandProject(props.onCreateProject(value, dialog.sessionId));
    else if (dialog.type === 'rename-session') props.onRename(dialog.id,value);
    else if (dialog.type === 'rename-project') props.onRenameProject(dialog.id,value);
    else if (dialog.type === 'delete-session') props.onDelete(dialog.id);
    else props.onDeleteProject(dialog.id);
    setDialog(null);
  }

  function row(session: Session) {
    return <ConversationRow key={session.id} session={session} active={!props.projectViewId && session.id === props.currentId} projects={props.projects} generating={props.runningIds.has(session.id)}
      onSelect={() => props.onSelect(session.id)} onRename={() => edit({type:'rename-session',id:session.id,name:session.title})} onDelete={() => edit({type:'delete-session',id:session.id,name:session.title})}
      onPin={() => { setPinnedOpen(true); props.onPin(session.id); }} onMove={projectId => { if (projectId) expandProject(projectId); props.onMove(session.id,projectId); }} onCreateProject={() => edit({type:'create-project',sessionId:session.id})} />;
  }
  const deleting = dialog?.type.startsWith('delete-');
  const dialogTitle = dialog?.type === 'create-project' ? '新建项目' : dialog?.type === 'rename-session' ? '重命名对话' : dialog?.type === 'rename-project' ? '重命名项目' : dialog?.type === 'delete-project' ? '删除项目' : '删除对话';

  return <>
    {props.open && <button type="button" aria-label="关闭侧边栏遮罩" onClick={props.onClose} className="fixed inset-0 z-30 bg-black/30 md:hidden" />}
    <aside aria-label="工作空间侧边栏" className={`${props.open ? 'flex' : 'hidden'} fixed inset-y-0 z-40 h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:static md:z-auto ${props.right ? 'right-0 order-2 border-l border-sidebar-border' : 'left-0 order-1 border-r border-sidebar-border'}`}>
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <img src="/favicon.svg?v=xiaozhi" alt="" className="h-7 w-7 rounded-lg" />
        <span className="text-sm font-semibold tracking-tight">Xiaozhi</span>
        <div className="ml-auto flex gap-1">
          <button type="button" onClick={() => setSearchOpen(true)} aria-label="搜索对话" title="搜索对话" className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent"><Search className="size-4" /></button>
          <button type="button" onClick={props.onClose} aria-label="收起侧边栏" className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent"><PanelLeftClose className="size-4" /></button>
        </div>
      </div>
      <div className="px-2"><button type="button" onClick={() => props.onNew()} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-sidebar-accent disabled:opacity-50"><SquarePen className="h-4 w-4" />新建对话</button></div>
      <nav aria-label="对话与项目" className="mt-3 min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-2 pb-6">
        {pinned.length > 0 && <section aria-label="置顶对话">
          <button type="button" onClick={() => setPinnedOpen(!pinnedOpen)} aria-expanded={pinnedOpen} className="mb-1 flex items-center gap-1 px-3 text-xs text-muted-foreground hover:text-foreground">置顶<ChevronDown className={`h-3 w-3 transition-transform ${pinnedOpen ? '' : '-rotate-90'}`} /></button>
          {pinnedOpen && <div className="space-y-0.5">{pinned.map(row)}</div>}
        </section>}
        <section aria-label="项目列表">
          <div className="mb-1 flex items-center px-3"><button type="button" onClick={() => setProjectsOpen(!projectsOpen)} aria-expanded={projectsOpen} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">项目<ChevronDown className={`h-3 w-3 transition-transform ${projectsOpen ? '' : '-rotate-90'}`} /></button><button type="button" onClick={() => edit({type:'create-project'})} aria-label="新建项目" title="新建项目" className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground disabled:opacity-40"><Plus className="h-3.5 w-3.5" /></button></div>
          {projectsOpen && <div className="space-y-1">{props.projects.length === 0 && <button type="button" onClick={() => edit({type:'create-project'})} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-sidebar-accent"><FolderPlus className="h-4 w-4" />创建项目，整理相关对话</button>}
            {props.projects.map(project => { const opened = expanded.has(project.id); const active = props.projectViewId === project.id || (!props.projectViewId && current?.projectId === project.id); const children = props.sessions.filter(session => session.projectId === project.id); return <div key={project.id} data-project-id={project.id}>
              <div className={`group flex items-center rounded-lg ${active ? 'bg-sidebar-accent/60' : 'hover:bg-sidebar-accent/65'}`}>
                <button type="button" onClick={() => toggleProject(project.id)} aria-label={`${opened ? '折叠' : '展开'}项目“${project.name}”`} aria-expanded={opened} className="rounded-md py-2.5 pl-1.5 pr-0.5 text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"><ChevronRight className={`h-3.5 w-3.5 transition-transform ${opened ? 'rotate-90' : ''}`} /></button>
                <button type="button" aria-label={`打开项目：${project.name}`} title={project.name} onClick={() => { expandProject(project.id); props.onOpenProject(project.id); }} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-2.5 pr-1 text-left text-[0.84rem] disabled:opacity-50">{opened ? <FolderOpen className="h-4 w-4 shrink-0" /> : <FolderClosed className="h-4 w-4 shrink-0" />}<span className="truncate">{project.name}</span></button>
                <DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={`项目“${project.name}”操作`} className="mr-1 rounded-md p-1.5 text-muted-foreground hover:bg-background/70 data-[state=open]:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"><MoreHorizontal className="h-4 w-4" /></button></DropdownMenuTrigger><DropdownMenuContent side="right" align="start" collisionPadding={12} className="w-44 rounded-xl p-1.5">
                  <DropdownMenuItem onSelect={() => { expandProject(project.id); props.onNew(project.id); }} className="cursor-pointer rounded-lg py-2.5"><SquarePen />新建对话</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => edit({type:'rename-project',id:project.id,name:project.name})} className="cursor-pointer rounded-lg py-2.5"><Pencil />重命名项目</DropdownMenuItem>
                  <DropdownMenuSeparator /><DropdownMenuItem variant="destructive" disabled={children.some(session => props.runningIds.has(session.id))} onSelect={() => edit({type:'delete-project',id:project.id,name:project.name})} className="cursor-pointer rounded-lg py-2.5"><Trash2 />删除项目</DropdownMenuItem>
                </DropdownMenuContent></DropdownMenu>
              </div>
              {opened && <div className="ml-5 mt-0.5 border-l border-sidebar-border pl-1.5">{children.length ? sortConversations(children).map(row) : <button type="button" onClick={() => props.onNew(project.id)} className="w-full rounded-lg px-3 py-2 text-left text-xs text-muted-foreground hover:bg-sidebar-accent">暂无对话 · 新建对话</button>}</div>}
            </div>; })}
          </div>}
        </section>
        <section aria-label="普通对话">
          <button type="button" onClick={() => setChatsOpen(!chatsOpen)} aria-expanded={chatsOpen} className="mb-1 flex items-center gap-1 px-3 text-xs text-muted-foreground hover:text-foreground">对话<ChevronDown className={`h-3 w-3 transition-transform ${chatsOpen ? '' : '-rotate-90'}`} /></button>
          {chatsOpen && <div className="space-y-0.5">{regular.length ? regular.map(row) : <p className="px-3 py-2 text-xs text-muted-foreground">暂无普通对话</p>}</div>}
        </section>
      </nav>
      <div className="shrink-0 border-t border-sidebar-border p-2">{props.footer}</div>
    </aside>
    {searchOpen && <ConversationSearch sessions={props.sessions} projects={props.projects}
      onClose={() => setSearchOpen(false)} onSelect={id => { setSearchOpen(false); props.onSelect(id); }} />}
    <Dialog open={!!dialog} onOpenChange={open => { if (!open) setDialog(null); }}><DialogContent className="sm:max-w-sm"><form onSubmit={submitDialog}>
      <DialogHeader><DialogTitle>{dialogTitle}</DialogTitle><DialogDescription>{dialog?.type === 'delete-project' ? '项目中的对话会移回普通对话列表，内容保留。' : dialog?.type === 'delete-session' ? '删除后无法从历史列表恢复此对话。' : dialog?.type === 'create-project' ? '把同一案件或主题的对话收纳在一个项目中。' : '修改显示名称，方便查找与整理。'}</DialogDescription></DialogHeader>
      {deleting ? <p className="my-5 break-words text-sm">确认删除“{dialog && 'name' in dialog ? dialog.name : ''}”？</p> : <div className="my-5"><label htmlFor="sidebar-edit-name" className="mb-2 block text-xs text-muted-foreground">名称</label><input id="sidebar-edit-name" autoFocus value={name} onChange={event => { setName(event.target.value); setError(''); }} maxLength={80} placeholder={dialog?.type === 'create-project' ? '例如：商标侵权案件' : '输入新名称'} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />{error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}</div>}
      <DialogFooter><button type="button" onClick={() => setDialog(null)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">取消</button><button type="submit" disabled={!deleting && !name.trim()} className={`rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50 ${deleting ? 'bg-destructive' : 'bg-primary'}`}>{deleting ? '确认删除' : dialog?.type === 'create-project' ? '创建项目' : '保存'}</button></DialogFooter>
    </form></DialogContent></Dialog>
  </>;
}
