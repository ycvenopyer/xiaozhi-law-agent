import { fileToImageDataUrl } from '@/lib/image-file';
import { WorkflowUpload } from '@/components/assistant/WorkflowUpload';
import type { WorkflowPrefill } from '../../../shared/workflow-fields.mjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, ClipboardList, PanelLeftOpen, ChevronRight } from 'lucide-react';
import { Sidebar } from '@/components/assistant/Sidebar';
import { ProjectOverview } from '@/components/assistant/ProjectOverview';
import { MessageList } from '@/components/assistant/MessageList';
import { ChatInput } from '@/components/assistant/ChatInput';
import { EmptyState } from '@/components/assistant/EmptyState';
import { KnowledgePanel } from '@/components/assistant/KnowledgePanel';
import { type WorkbenchMode, type WorkbenchGenerate, fetchIpNews, streamChat, uploadFile } from '@/lib/agent-client';
import { loadSessions, saveSessions, newSessionId } from '@/lib/sessions';
import { loadProjects, saveProjects } from '@/lib/projects';
import { loadKB, saveKB, kbToText, type KBEntry } from '@/lib/knowledge';
import { Workbench } from '@/components/assistant/Workbench';
import { ContractPanel } from '@/components/assistant/ContractPanel';
import { loadAppearance, applyAppearance, watchSystemTheme, isDarkMode, type Appearance } from '@/lib/appearance';
import type {
  AttachedFile,
  ChatMessage,
  Session,
  ModelInfo,
  Project,
} from '@/types/agent';
import { AccountControls, useAccountId } from '@/components/assistant/CloudAccount';
import { CustomModelSettings } from '@/components/assistant/CustomModelSettings';
import { customModelRequest, getModelKey, loadCustomModels, removeModelKey, saveCustomModels, setModelKey, type CustomModel } from '@/lib/custom-models';
import { authHeaders } from '@/lib/cloudbase';
import { getTavilyKey } from '@/lib/tavily-key';
import { conversationRevision, getPrivacy, loadCollection, refreshConversation, reportSyncError, saveCollection, stageRecovery } from '@/lib/cloud-store';

interface ComposerDraft {
  text: string;
  files: AttachedFile[];
  pendingUploads: number;
}

const emptyDraft: ComposerDraft = { text: '', files: [], pendingUploads: 0 };

function makeMsg(role: ChatMessage['role'], content = ''): ChatMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: Date.now() };
}

function firstLine(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  return t.length > 22 ? t.slice(0, 22) + '…' : t || '新对话';
}

function emptySession(projectId?: string): Session {
  const now = Date.now();
  return { id: newSessionId(), title: '新对话', messages: [], createdAt: now, updatedAt: now, projectId };
}

export default function Index() {
  const accountId = useAccountId();
  const [searchConfigured, setSearchConfigured] = useState(() => Boolean(getTavilyKey(accountId)));
  const [initial] = useState(() => {
    const history = loadSessions();
    const projects = loadProjects();
    const last = loadCollection<{ id: string; conversationId?: string; projectViewId?: string }>('settings').find(item => item.id === 'current-conversation');
    const active = history.find(session => session.id === last?.conversationId) || history[0] || emptySession();
    return { sessions: history.length ? history : [active], currentId: active.id, projects,
      projectViewId: projects.some(project => project.id === last?.projectViewId) ? last!.projectViewId! : null };
  });
  const [sessions, setSessions] = useState<Session[]>(initial.sessions);
  const [projects, setProjects] = useState<Project[]>(initial.projects);
  const [projectViewId, setProjectViewId] = useState<string | null>(initial.projectViewId);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [currentId, setCurrentId] = useState(initial.currentId);
  const [drafts, setDrafts] = useState<Record<string, ComposerDraft>>({});
  const { text: input, files, pendingUploads } = drafts[currentId] || emptyDraft;
  const [runningIds, setRunningIds] = useState<ReadonlySet<string>>(() => new Set());
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [customModels, setCustomModels] = useState(() => loadCustomModels(accountId));
  const [customSettingsOpen, setCustomSettingsOpen] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof localStorage === 'undefined') return 'zhipu-glm';
    const saved = localStorage.getItem(`agent-model:${accountId}`) || localStorage.getItem('agent-model');
    return saved === 'zhipu-flashx' ? 'zhipu-flash' : saved || 'zhipu-glm';
  });
  const modelOptions = [
    ...models,
    ...customModels.map(model => ({
      id: model.id, label: model.label, provider: model.provider, free: false,
      vision: model.vision, available: Boolean(getModelKey(accountId, model)),
    })),
  ];
  const [kb, setKb] = useState<KBEntry[]>(() => loadKB());
  const [kbEnabled, setKbEnabled] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return true;
    const v = localStorage.getItem('agent-kb-enabled');
    return v === null ? true : v === '1';
  });
  const [kbOpen, setKbOpen] = useState(false);
  const [appearance, setAppearance] = useState<Appearance>(() => loadAppearance());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [imports, setImports] = useState<Partial<Record<WorkbenchMode, WorkflowPrefill & { id: string; source: string }>>>({});
  const [workflow, setWorkflow] = useState<WorkbenchMode | null>(null);
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<number | null>(null);
  const generationJobs = useRef(new Map<string, AbortController>());
  const lastWritableSessions = useRef(new Map<string, Session>());
  const streaming = runningIds.has(currentId);

  function showNote(msg: string) {
    setNote(msg);
    if (noteTimer.current) window.clearTimeout(noteTimer.current);
    noteTimer.current = window.setTimeout(() => setNote(null), 4500);
  }

  const loadModels = useCallback((signal?: AbortSignal) => authHeaders()
    .then(headers => fetch('/api/agent/models', { headers, signal }))
    .then(response => {
      if (!response.ok) throw new Error(response.status === 401 ? '登录已过期，请重新登录后加载模型。' : '模型列表加载失败，请重试。');
      return response.json() as Promise<ModelInfo[]>;
    })
    .then(list => {
      if (!Array.isArray(list)) throw new Error('模型列表格式异常，请重试。');
      if (signal?.aborted) return;
      setModels(list);
      const firstAvailable = list.find(model => model.available);
      setSelectedModel(previous => {
        const custom = loadCustomModels(accountId).find(model => model.id === previous);
        if (custom) return previous;
        if (list.some(model => model.id === previous && model.available)) return previous;
        return firstAvailable?.id || (list.some(model => model.id === previous) ? previous : list[0]?.id || 'zhipu-glm');
      });
    })
    .catch((error: unknown) => {
      if (!signal?.aborted) setModelsError(error instanceof Error ? error.message : '模型列表加载失败，请检查网络后重试。');
    })
    .finally(() => { if (!signal?.aborted) setModelsLoading(false); }), [accountId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadModels(controller.signal);
    return () => controller.abort();
  }, [loadModels]);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const update = (event: MediaQueryListEvent) => setSidebarOpen(event.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    localStorage.setItem(`agent-model:${accountId}`, selectedModel);
  }, [accountId, selectedModel]);

  function saveModel(model: CustomModel, key: string) {
    const next = [...customModels.filter(item => item.id !== model.id), model];
    setModelKey(accountId, model, key);
    saveCustomModels(accountId, next);
    setCustomModels(next);
    setSelectedModel(model.id);
  }

  function deleteModel(id: string) {
    const next = customModels.filter(model => model.id !== id);
    saveCustomModels(accountId, next);
    removeModelKey(accountId, id);
    setCustomModels(next);
    if (selectedModel === id) {
      const fallback = models.find(model => model.available)?.id || next.find(model => getModelKey(accountId, model))?.id;
      setSelectedModel(fallback || 'zhipu-glm');
    }
  }

  const modelRequest = useCallback((id = selectedModel) => {
    if (!id.startsWith('custom-')) return undefined;
    const model = customModels.find(entry => entry.id === id);
    const key = model && getModelKey(accountId, model);
    if (!model || !key) throw new Error('请在自定义模型中重新填写 API Key。');
    return customModelRequest(model, key);
  }, [accountId, customModels, selectedModel]);

  // The backend owns running records until it saves the final answer.
  useEffect(() => {
    const protectedIds = new Set([...runningIds, ...generationJobs.current.keys()]);
    const writable = new Map(sessions.filter(session => !protectedIds.has(session.id)).map(session => [session.id, session]));
    const previous = lastWritableSessions.current;
    lastWritableSessions.current = writable;
    if (writable.size !== previous.size || [...writable].some(([id, session]) => previous.get(id) !== session)) {
      saveSessions(sessions, protectedIds);
    } else {
      stageRecovery('sessions', sessions);
    }
  }, [sessions, runningIds]);

  useEffect(() => { saveProjects(projects); }, [projects]);

  useEffect(() => {
    if (!currentId) return;
    void saveCollection('settings', [{ id: 'current-conversation', conversationId: currentId, projectViewId }], false).catch(() => {});
  }, [currentId, projectViewId]);

  useEffect(() => {
    const jobs = generationJobs.current;
    return () => { jobs.forEach(controller => controller.abort()); };
  }, []);

  // Apply the saved appearance on load and re-apply whenever it changes.
  // Also re-apply on OS color-scheme change when the user picked 'system'.
  useEffect(() => {
    applyAppearance(appearance);
    try {
      // Don't persist the resolved `dark` flag (it depends on the OS at load
      // time); persist the requested mode instead.
      const { dark: _resolved, ...persisted } = appearance;
      void _resolved;
      localStorage.setItem('agent-appearance', JSON.stringify(persisted));
    } catch {
      /* ignore */
    }
    const unsubscribe = watchSystemTheme(appearance, () => {
      // The OS color-scheme changed while we're in 'system' mode — just
      // re-resolve the dark flag. No need to mutate other fields.
      setAppearance((prev) => ({ ...prev, dark: isDarkMode(prev) }));
    });
    return unsubscribe;
  }, [appearance]);

  useEffect(() => {
    try {
      localStorage.setItem('agent-kb-enabled', kbEnabled ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [kbEnabled]);

  const current = sessions.find((s) => s.id === currentId) || null;
  const viewedProject = projects.find(project => project.id === projectViewId);
  const currentProject = viewedProject || projects.find(project => project.id === current?.projectId);

  function closeMobileSidebar() { if (window.matchMedia('(max-width: 767px)').matches) setSidebarOpen(false); }

  function selectConversation(id: string) {
    setCurrentId(id); setProjectViewId(null); closeMobileSidebar();
  }

  function openProject(id: string) {
    if (!projects.some(project => project.id === id)) return;
    setProjectViewId(id); closeMobileSidebar();
  }

  const updateDraft = useCallback((id: string, update: (draft: ComposerDraft) => ComposerDraft) => {
    setDrafts(previous => ({ ...previous, [id]: update(previous[id] || emptyDraft) }));
  }, []);

  function setInput(text: string) {
    updateDraft(currentId, draft => ({ ...draft, text }));
  }

  function newChat(projectId?: string) {
    const s = emptySession(projectId && projects.some(project => project.id === projectId) ? projectId : undefined);
    setSessions((prev) => [s, ...prev]);
    setCurrentId(s.id); setProjectViewId(null);
    closeMobileSidebar();
  }

  function deleteSession(id: string) {
    if (generationJobs.current.has(id)) return;
    const next = sessions.filter(session => session.id !== id);
    if (!next.length) next.push(emptySession());
    setSessions(next);
    if (id === currentId) setCurrentId(next[0].id);
    setDrafts(previous => {
      const nextDrafts = { ...previous };
      delete nextDrafts[id];
      return nextDrafts;
    });
  }

  function renameSession(id: string, title: string) {
    if (generationJobs.current.has(id) || !title.trim()) return;
    setSessions(previous => previous.map(session => session.id === id ? { ...session, title: title.trim().slice(0,80), titleEdited: true, updatedAt: Date.now() } : session));
  }

  function pinSession(id: string) {
    if (generationJobs.current.has(id)) return;
    setSessions(previous => previous.map(session => session.id === id ? { ...session, pinnedAt: session.pinnedAt ? undefined : Date.now() } : session));
  }

  function moveSession(id: string, projectId?: string) {
    if (generationJobs.current.has(id) || (projectId && !projects.some(project => project.id === projectId))) return;
    setSessions(previous => previous.map(session => session.id === id ? { ...session, projectId, updatedAt: Date.now() } : session));
  }

  function createProject(name: string, sessionId?: string): string {
    const now = Date.now();
    const project: Project = { id: crypto.randomUUID(), name: name.trim().slice(0,80), createdAt: now, updatedAt: now };
    setProjects(previous => [...previous, project]);
    if (sessionId && !generationJobs.current.has(sessionId)) {
      setSessions(previous => previous.map(session => session.id === sessionId ? { ...session, projectId: project.id, updatedAt: now } : session));
    }
    setProjectViewId(project.id); closeMobileSidebar();
    return project.id;
  }

  function renameProject(id: string, name: string) {
    if (!name.trim()) return;
    setProjects(previous => previous.map(project => project.id === id ? { ...project, name: name.trim().slice(0,80), updatedAt: Date.now() } : project));
  }

  function deleteProject(id: string) {
    if (sessions.some(session => session.projectId === id && generationJobs.current.has(session.id))) return;
    setProjects(previous => previous.filter(project => project.id !== id));
    setSessions(previous => previous.map(session => session.projectId === id ? { ...session, projectId: undefined, updatedAt: Date.now() } : session));
    if (projectViewId === id) setProjectViewId(null);
  }

  const handleFiles = useCallback(async (list: File[]) => {
    if (!list.length) return;
    const added: AttachedFile[] = [];
    updateDraft(currentId, draft => ({ ...draft, pendingUploads: draft.pendingUploads + 1 }));
    for (const file of list) {
      try {
        if (!/^image\/(png|jpeg|webp)$/i.test(file.type) && !/\.(pdf|docx?|txt|md|markdown|csv|jpe?g|png|webp)$/i.test(file.name)) {
          throw new Error(`${file.name}：请选择 PDF、Word、文本、CSV 或 PNG、JPEG、WebP 图片。`);
        }
        const stored = await uploadFile(file);
        added.push(stored.kind === 'image' ? { ...stored, dataUrl: await fileToImageDataUrl(file) } : stored);
      } catch (error) {
        showNote(error instanceof Error ? error.message : '附件上传失败');
      }
    }
    setDrafts(previous => {
      const draft = previous[currentId];
      if (!draft) return previous;
      return { ...previous, [currentId]: { ...draft, files: [...draft.files, ...added], pendingUploads: draft.pendingUploads - 1 } };
    });
  }, [currentId, updateDraft]);

  const removeFile = useCallback((id: string) => {
    updateDraft(currentId, draft => ({ ...draft, files: draft.files.filter(file => file.id !== id) }));
  }, [currentId, updateDraft]);

  const runGeneration = useCallback(async (
    session: Session,
    customModel: ReturnType<typeof modelRequest>,
    onToken?: (text: string) => void,
    resumeRevision?: number,
  ) => {
    const id = session.id;
    if (generationJobs.current.has(id)) throw new Error('此对话正在生成。');
    const history = session.messages.slice(0, -1);
    const userMessage = history.at(-1)!;
    const assistant = session.messages.at(-1)!;
    const resuming = resumeRevision !== undefined;
    const activeSession: Session = resuming
      ? { ...session, messages: [...history, { ...assistant, status: 'generating' }] }
      : session;
    const generation = userMessage.generation;
    const controller = new AbortController();
    generationJobs.current.set(id, controller);
    setRunningIds(new Set(generationJobs.current.keys()));
    setSessions(previous => previous.some(item => item.id === id)
      ? previous.map(item => item.id === id ? activeSession : item)
      : [activeSession, ...previous]);

    let placeholderSaved = resuming;
    let acknowledgedSession: Session | undefined;
    let receivedDone = false;
    let acc = resuming ? assistant.content : '';
    let failure = '';
    const tools = new Map((resuming ? assistant.toolCalls || [] : []).map(tool => [tool.id, tool]));
    const fallback = () => acc || (failure ? '⚠️ ' + failure : '本次生成未完成，请重试。');
    const updateAnswer = (status: ChatMessage['status'], content = acc) => {
      setSessions(previous => previous.map(item => item.id === id
        ? { ...item, messages: item.messages.map(message => message.id === assistant.id
          ? { ...message, content, status, toolCalls: [...tools.values()] }
          : message) }
        : item));
    };

    try {
      if (!resuming) await saveCollection('sessions', [session], false);
      placeholderSaved = true;
      controller.signal.throwIfAborted();
      for await (const event of streamChat(history, {
        model: resuming ? assistant.continuation?.model : selectedModel, customModel, signal: controller.signal,
        tavilyKey: generation || onToken ? undefined : getTavilyKey(accountId) || undefined,
        knowledge: kbEnabled && !generation?.documentTool ? kbToText(kb, userMessage.content) : '',
        workflow: generation?.workflow, documentTool: generation?.documentTool,
        conversationId: id, assistantMessageId: assistant.id,
        resumeRevision,
        onSaved: record => { if (record.id === id) acknowledgedSession = record.payload as unknown as Session; },
      })) {
        switch (event.type) {
          case 'token':
          case 'content':
            acc = event.type === 'content' ? event.content : acc + event.content;
            updateAnswer('generating');
            onToken?.(acc);
            break;
          case 'tool_start':
            tools.set(event.id, { id: event.id, name: event.name, arguments: event.arguments, status: 'running' });
            updateAnswer('generating');
            break;
          case 'tool_end': {
            const tool = tools.get(event.id);
            if (tool) tools.set(event.id, { ...tool, status: 'done', result: event.result });
            updateAnswer('generating');
            break;
          }
          case 'error':
            failure = event.message;
            if (!acc) updateAnswer('failed', fallback());
            break;
          case 'done':
            receivedDone = true;
            break;
        }
      }
    } catch (error) {
      failure = controller.signal.aborted ? '已停止生成。'
        : error instanceof Error ? error.message : '生成失败，请重试。';
      updateAnswer(controller.signal.aborted ? 'interrupted' : 'failed', fallback());
    } finally {
      try {
        if (placeholderSaved) {
          const saved = receivedDone && acknowledgedSession
            ? acknowledgedSession
            : await refreshConversation(id) as unknown as Session;
          const status = controller.signal.aborted ? 'interrupted' as const : 'failed' as const;
          saved.messages = saved.messages.map(message => message.id === assistant.id && message.status === 'generating'
            ? { ...message, status, content: acc || message.content || fallback(), toolCalls: [...tools.values()] } : message);
          setSessions(previous => previous.map(item => item.id === id ? saved : item));
        }
      } catch (error) {
        updateAnswer('interrupted', fallback());
        reportSyncError(error instanceof Error ? error.message : '无法确认对话保存状态');
      } finally {
        generationJobs.current.delete(id);
        setRunningIds(new Set(generationJobs.current.keys()));
      }
    }
    if (failure) throw new Error(failure);
    return acc;
  }, [accountId, selectedModel, kb, kbEnabled]);

  const submit = useCallback((
    text: string, attachFiles: AttachedFile[], baseHistory?: ChatMessage[],
    onStart?: () => void, generation?: ChatMessage['generation'],
  ) => {
    if ((!text.trim() && !attachFiles.length) || !current || generationJobs.current.has(current.id)) return;
    if (!getPrivacy()) { showNote('当前禁止向模型外发资料，请在「账号与隐私」中查看并明确授权。'); return; }

    let customModel;
    try { customModel = modelRequest(); }
    catch (error) { showNote((error as Error).message); return; }
    const userMessage = makeMsg('user', text);
    if (attachFiles.length) userMessage.files = attachFiles;
    if (generation) userMessage.generation = generation;
    const assistant: ChatMessage = { ...makeMsg('assistant'), status: 'generating' };
    if (generation) assistant.exportName = current.title;
    const nextSession: Session = {
      ...current,
      title: !current.messages.length && !current.titleEdited ? firstLine(text) : current.title,
      messages: [...(baseHistory ?? current.messages), userMessage, assistant],
      updatedAt: Date.now(),
    };
    onStart?.();
    void runGeneration(nextSession, customModel).catch(() => { /* The reply shows generation errors. */ });
  }, [current, modelRequest, runGeneration]);

  const handleSend = useCallback(() => {
    if (pendingUploads) return;
    submit(input.trim(), files, undefined, () => updateDraft(currentId, () => emptyDraft));
  }, [currentId, input, files, pendingUploads, submit, updateDraft]);

  const stop = useCallback(() => {
    generationJobs.current.get(currentId)?.abort();
  }, [currentId]);

  function continueAnswer(assistantId: string) {
    if (!current || generationJobs.current.has(current.id)) return;
    const assistant = current.messages.at(-1);
    if (assistant?.id !== assistantId || assistant.status !== 'interrupted' || !assistant.continuation) return;
    if (!getPrivacy()) { showNote('请先在「账号与隐私」允许第三方模型处理资料。'); return; }
    const revision = conversationRevision(current.id);
    if (!revision) { showNote('请刷新对话，再继续生成。'); return; }
    try {
      const customModel = modelRequest(assistant.continuation.model);
      setWorkbenchOpen(false); setWorkflow(null); setContractOpen(false);
      void runGeneration(current, customModel, undefined, revision)
        .catch(error => showNote(error instanceof Error ? error.message : '续写失败，请重试。'));
    } catch (error) {
      showNote(error instanceof Error ? error.message : '无法继续生成。');
    }
  }

  /** 重新生成：截断指定回答及之后的消息，基于其前一条用户消息再次提交。 */
  const regenerate = useCallback((assistantId: string) => {
    if (!current || streaming) return;
    const messages = current.messages;
    const index = messages.findIndex(message => message.id === assistantId);
    if (index < 1) return;
    let userIndex = index - 1;
    while (userIndex >= 0 && messages[userIndex].role !== 'user') userIndex--;
    if (userIndex < 0) return;
    const user = messages[userIndex];
    submit(user.content, user.files || [], messages.slice(0, userIndex), undefined, user.generation);
  }, [current, streaming, submit]);

  /** 编辑用户消息后原地重发：截断该条及之后的消息，用新内容重新提交。 */
  const resendEdited = useCallback((msgId: string, newContent: string) => {
    if (!current || streaming || !newContent.trim()) return;
    const messages = current.messages;
    const index = messages.findIndex(message => message.id === msgId && message.role === 'user');
    if (index < 0) return;
    const user = messages[index];
    submit(newContent.trim(), user.files || [], messages.slice(0, index), undefined, user.generation);
  }, [current, streaming, submit]);

  const generateText = useCallback<WorkbenchGenerate>((prompt, onToken, options) => {
    if (!getPrivacy()) throw new Error('当前禁止向模型外发资料，请先在账号与隐私中明确授权。');
    const customModel = modelRequest();
    const user = makeMsg('user', prompt);
    if (options?.files?.length) user.files = options.files;
    if (options?.workflow || options?.documentTool) {
      user.generation = { workflow: options.workflow, documentTool: options.documentTool };
    }
    const title = options?.title || firstLine(prompt);
    const assistant: ChatMessage = { ...makeMsg('assistant'), status: 'generating' };
    if (options) assistant.exportName = title;
    const now = Date.now();
    const session: Session = { id: newSessionId(), title, messages: [user, assistant], createdAt: now, updatedAt: now };
    setCurrentId(session.id);
    setProjectViewId(null);
    return runGeneration(session, customModel, onToken);
  }, [modelRequest, runGeneration]);

  const latestReply = current?.messages.at(-1);
  const continueCurrentReply = !streaming && latestReply?.status === 'interrupted' && latestReply.continuation
    ? () => continueAnswer(latestReply.id)
    : undefined;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <Sidebar
        sessions={sessions}
        projects={projects}
        currentId={currentId}
        projectViewId={projectViewId}
        onSelect={selectConversation}
        onNew={newChat}
        onDelete={deleteSession}
        onRename={renameSession}
        onPin={pinSession}
        onMove={moveSession}
        onCreateProject={createProject}
        onRenameProject={renameProject}
        onDeleteProject={deleteProject}
        onOpenProject={openProject}
        right={appearance.sidebarSide === 'right'}
        footer={<AccountControls disabled={runningIds.size > 0 || Object.values(drafts).some(draft => draft.pendingUploads > 0)} appearance={appearance} onAppearanceChange={setAppearance}
          searchConfigured={searchConfigured} onSearchKeyChange={setSearchConfigured} />}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        runningIds={runningIds}
      />
      <main className={`flex min-w-0 flex-1 flex-col ${appearance.sidebarSide === 'right' ? 'order-1' : 'order-2'}`}>
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          {!sidebarOpen && <button type="button" onClick={() => setSidebarOpen(true)} aria-label="展开侧边栏" className="mr-1 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><PanelLeftOpen className="h-4 w-4" /></button>}
          <span className="text-sm font-semibold">小知</span>
          {currentProject && <><ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /><button type="button" onClick={() => openProject(currentProject.id)} className="max-w-40 truncate rounded px-1 py-0.5 text-xs text-muted-foreground hover:bg-muted">{currentProject.name}</button></>}
          <span className="text-[0.72rem] text-muted-foreground">知识产权合规助理</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.7rem] text-primary">
            私人云端空间
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setKbOpen(true)}
              className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[0.78rem] text-muted-foreground hover:border-primary/40 hover:text-foreground"
              title="专业知识库"
            >
              <BookOpen className="h-3.5 w-3.5" />
              知识库
            </button>
            <button
              onClick={() => setWorkbenchOpen(true)}
              className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[0.78rem] text-muted-foreground hover:border-primary/40 hover:text-foreground"
              title="事务台"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              事务台
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {note && (
            <div className="mx-auto mt-3 w-full max-w-[var(--chat-max-width)] px-4">
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-[0.8rem] text-foreground">
                {note}
              </div>
            </div>
          )}
          {current && !viewedProject && current.messages.length > 0 ? (
            <MessageList key={current.id} messages={current.messages} avatar={appearance.avatar}
              streaming={streaming} onContinue={continueCurrentReply}
              onResend={streaming ? undefined : resendEdited} onRegenerate={streaming ? undefined : regenerate} />
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {viewedProject
                ? <ProjectOverview project={viewedProject} sessions={sessions.filter(session => session.projectId === viewedProject.id)}
                    onNew={() => newChat(viewedProject.id)} onSelect={selectConversation} runningIds={runningIds} />
                : <EmptyState onPick={setInput} avatar={appearance.avatar} />}
            </div>
          )}
        </div>

        {!viewedProject && <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onStop={stop}
          uploading={pendingUploads > 0}
          onFiles={handleFiles}
          files={files}
          onRemoveFile={removeFile}
          streaming={streaming}
          disabled={!current}
          onWorkflow={setWorkflow}
          onWorkflowUpload={() => setUploadOpen(true)}
          onOpenContract={() => setContractOpen(true)}
          models={modelOptions}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          modelsLoading={modelsLoading}
          modelsError={modelsError}
          onRetryModels={() => { setModelsLoading(true); setModelsError(''); void loadModels(); }}
          onManageCustomModels={() => setCustomSettingsOpen(true)}
        />}
      </main>

      <KnowledgePanel
        open={kbOpen}
        onClose={() => setKbOpen(false)}
        entries={kb}
        onChange={entries => { setKb(entries); saveKB(entries); }}
        enabled={kbEnabled}
        onToggleEnabled={setKbEnabled}
      />

      {uploadOpen && <WorkflowUpload model={selectedModel} modelRequest={modelRequest}
        onClose={() => setUploadOpen(false)} onImport={(mode, result, source) => {
          setImports(previous => ({ ...previous, [mode]: { ...result, id: crypto.randomUUID(), source } }));
          setUploadOpen(false);
          setWorkflow(mode);
        }} />}
      <Workbench entries={kb} imports={imports}
        workflow={workflow}
        open={workbenchOpen || !!workflow}
        onClose={() => { setWorkbenchOpen(false); setWorkflow(null); }}
        onGenerate={generateText}
        generating={streaming}
        onContinue={continueCurrentReply}
        searchConfigured={searchConfigured}
        onSearchNews={async signal => {
          const key = getTavilyKey(accountId);
          if (!key) throw new Error('请在「设置 → 联网搜索」配置 Tavily API Key。');
          return fetchIpNews(key, signal);
        }}
      />

      <ContractPanel open={contractOpen} onClose={() => setContractOpen(false)} onGenerate={generateText} onContinue={continueCurrentReply} />
      {customSettingsOpen && (
        <CustomModelSettings accountId={accountId} models={customModels} onClose={() => setCustomSettingsOpen(false)} onSave={saveModel} onDelete={deleteModel} />
      )}
    </div>
  );
}
