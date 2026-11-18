import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, FolderOpen, PanelLeftOpen, ChevronRight } from 'lucide-react';
import { Sidebar } from '@/components/assistant/Sidebar';
import { ProjectOverview } from '@/components/assistant/ProjectOverview';
import { MessageList } from '@/components/assistant/MessageList';
import { ChatInput, type RetrieveMode } from '@/components/assistant/ChatInput';
import { EmptyState } from '@/components/assistant/EmptyState';
import { KnowledgePanel } from '@/components/assistant/KnowledgePanel';
import { streamChat, uploadFile, extractDossier } from '@/lib/agent-client';
import { loadSessions, saveSessions, newSessionId } from '@/lib/sessions';
import { loadProjects, saveProjects } from '@/lib/projects';
import {
  loadDossiers,
  saveDossiers,
  newDossierId,
  suggestName,
  type SavedDossier,
} from '@/lib/dossiers';
import { loadKB, saveKB, kbToText, type KBEntry } from '@/lib/knowledge';
import { CaseDossier } from '@/components/assistant/CaseDossier';
import { AppearancePanel } from '@/components/assistant/AppearancePanel';
import { Workbench } from '@/components/assistant/Workbench';
import { ContractPanel } from '@/components/assistant/ContractPanel';
import { loadAppearance, applyAppearance, watchSystemTheme, isDarkMode, type Appearance } from '@/lib/appearance';
import type {
  AgentEvent,
  AttachedFile,
  ChatMessage,
  Session,
  ToolCallView,
  ModelInfo,
  Project,
  CaseDossier as Dossier,
} from '@/types/agent';
import { DOSSIER_CAUSES, EMPTY_DOSSIER, IMAGE_DOSSIER_RAW } from '@/types/agent';
import { dossierToText } from '@/types/agent';
import { AccountControls } from '@/components/assistant/CloudAccount';
import { authHeaders } from '@/lib/cloudbase';
import { flushCloudStore, getPrivacy, loadCollection, refreshConversation, reportSyncError, saveCollection, stageRecovery } from '@/lib/cloud-store';

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

/**
 * Read an image file and return a (downscaled) base64 data URL suitable for a
 * vision model. Large photos are resized to a max edge of 1024px and re-encoded
 * as JPEG to keep the request within model context limits.
 */
function fileToImageDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('解析图片失败'));
      img.onload = () => {
        const maxEdge = 1024;
        let { width, height } = img;
        if (width > maxEdge || height > maxEdge) {
          const scale = Math.min(maxEdge / width, maxEdge / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Map a free-form cause of action onto the fixed dropdown options. */
function matchCause(v: string): string {
  if (DOSSIER_CAUSES.includes(v)) return v;
  if (/商标/.test(v)) return '商标侵权';
  if (/专利/.test(v)) return '专利侵权';
  if (/著作权|版权/.test(v)) return '著作权侵权';
  if (/不正当竞争/.test(v)) return '不正当竞争';
  if (/商业秘密/.test(v)) return '商业秘密';
  return v;
}

/** Merge LLM-extracted dossier fields into the existing case file. */
function mergeDossier(
  existing: Dossier | undefined,
  extracted: Record<string, unknown>,
  raw?: string
): Dossier {
  const merged: Dossier = { ...EMPTY_DOSSIER, ...(existing || {}) };
  // 重新识别同一份材料时，新结果应当覆盖旧结果（旧结果往往只填了部分字段）；
  // 上传新材料时同样以新结果为准。仅在识别不出内容时保留原值。
  for (const k of ['parties', 'cause', 'facts', 'claims', 'evidence'] as const) {
    const v = extracted[k];
    if (v == null) continue;
    const norm = Array.isArray(v)
      ? v.map((x) => String(x ?? '').trim()).filter(Boolean).join('；')
      : String(v).trim();
    if (!norm) continue;
    merged[k] = k === 'cause' ? matchCause(norm) : norm;
  }
  if (raw) merged.raw = raw;
  return merged;
}

// Local fallback: split the raw text by common Chinese case-file section
// headings so the panel still shows something usable when the LLM fails or
// returns empty fields. Title patterns are intentionally loose so different
// drafts ("一、当事人" / "1. 当事人" / "当事人：" etc.) all match.
function heuristicExtract(text: string): Record<string, string> {
  const SECTION_PATTERNS: { key: string; re: RegExp }[] = [
    { key: 'parties', re: /(^|\n)\s*(?:[一二三四五六七八九十]?[、.]|\d+[、.．])?\s*(?:当事人|原被告|诉讼参与人|原\s*告|被\s*告)[：:\s]/ },
    { key: 'cause', re: /(^|\n)\s*(?:[一二三四五六七八九十]?[、.]|\d+[、.．])?\s*(?:案由|纠纷类型)[：:\s]/ },
    { key: 'facts', re: /(^|\n)\s*(?:[一二三四五六七八九十]?[、.]|\d+[、.．])?\s*(?:基本事实|基本案情|案情简介|案情概述|事实与理由|案件事实|本院(?:经审理)?查明|经审理查明|查明事实|事实)[：:，,\s]/ },
    { key: 'claims', re: /(^|\n)\s*(?:[一二三四五六七八九十]?[、.]|\d+[、.．])?\s*(?:诉讼请求|诉请|诉求|请求事项|请求判令|判决如下|判项|判令)[：:\s]/ },
    { key: 'evidence', re: /(^|\n)\s*(?:[一二三四五六七八九十]?[、.]|\d+[、.．])?\s*(?:证据清单|证据目录|证据材料|证据列表|证据)[：:\s]/ },
  ];
  const positions: { key: string; start: number; headerLen: number }[] = [];
  for (const { key, re } of SECTION_PATTERNS) {
    const m = text.match(re);
    if (m && m.index !== undefined) {
      positions.push({ key, start: m.index + (m[1] ? m[1].length : 0), headerLen: m[0].length - (m[1] ? m[1].length : 0) });
    }
  }
  if (!positions.length) return {};
  positions.sort((a, b) => a.start - b.start);
  const out: Record<string, string> = {};
  for (let i = 0; i < positions.length; i++) {
    const cur = positions[i];
    const next = positions[i + 1];
    const headerEnd = cur.start + cur.headerLen;
    const bodyEnd = next ? next.start : text.length;
    const body = text.slice(headerEnd, bodyEnd).replace(/^\s*[:：]?\s*/, '');
    out[cur.key] = body.replace(/\s+\n/g, '\n').trim().slice(0, 1500);
  }
  return out;
}


export default function Index() {
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
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof localStorage === 'undefined') return 'zhipu-glm';
    return localStorage.getItem('agent-model') || 'zhipu-glm';
  });
  const [kb, setKb] = useState<KBEntry[]>(() => loadKB());
  const [kbEnabled, setKbEnabled] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return true;
    const v = localStorage.getItem('agent-kb-enabled');
    return v === null ? true : v === '1';
  });
  const [kbOpen, setKbOpen] = useState(false);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [appearance, setAppearance] = useState<Appearance>(() => loadAppearance());
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [dossierBusy, setDossierBusy] = useState(false);
  const [library, setLibrary] = useState<SavedDossier[]>(() => loadDossiers());
  const modelName = models.find(model => model.id === selectedModel)?.label || selectedModel;
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
      setSelectedModel(previous => list.some(model => model.id === previous && model.available) ? previous : firstAvailable?.id || previous);
    })
    .catch((error: unknown) => {
      if (!signal?.aborted) setModelsError(error instanceof Error ? error.message : '模型列表加载失败，请检查网络后重试。');
    })
    .finally(() => { if (!signal?.aborted) setModelsLoading(false); }), []);

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

  // Persist the chosen model and keep the sidebar label in sync.
  useEffect(() => {
    localStorage.setItem('agent-model', selectedModel);
  }, [selectedModel]);

  // Persist whenever sessions change.
  useEffect(() => {
    if (sessions.length) stageRecovery('sessions', sessions);
    if (!streaming) saveSessions(sessions);
  }, [sessions, streaming]);

  useEffect(() => { saveProjects(projects); }, [projects]);

  useEffect(() => {
    if (!currentId) return;
    void saveCollection('settings', [{ id: 'current-conversation', conversationId: currentId, projectViewId }], false).catch(() => {});
  }, [currentId, projectViewId]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

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

  // Persist the knowledge base and its enable flag locally.
  useEffect(() => {
    saveKB(kb);
  }, [kb]);
  useEffect(() => {
    try {
      localStorage.setItem('agent-kb-enabled', kbEnabled ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [kbEnabled]);

  // Persist the dossier library so previously recognized case files stay
  // available for review and reuse across conversations.
  useEffect(() => {
    saveDossiers(library);
  }, [library]);

  const current = sessions.find((s) => s.id === currentId) || null;
  const viewedProject = projects.find(project => project.id === projectViewId);
  const currentProject = viewedProject || projects.find(project => project.id === current?.projectId);
  const workspaceBusy = streaming || dossierBusy;

  function closeMobileSidebar() { if (window.matchMedia('(max-width: 767px)').matches) setSidebarOpen(false); }

  function selectConversation(id: string) {
    if (workspaceBusy) return;
    setCurrentId(id); setProjectViewId(null); closeMobileSidebar();
  }

  function openProject(id: string) {
    if (workspaceBusy || !projects.some(project => project.id === id)) return;
    setProjectViewId(id); closeMobileSidebar();
  }

  const updateCurrent = useCallback(
    (updater: (s: Session) => Session) => {
      setSessions((prev) => prev.map((s) => (s.id === currentId ? updater(s) : s)));
    },
    [currentId]
  );

  function newChat(projectId?: string) {
    if (workspaceBusy) return;
    const s = emptySession(projectId && projects.some(project => project.id === projectId) ? projectId : undefined);
    setSessions((prev) => [s, ...prev]);
    setCurrentId(s.id); setProjectViewId(null);
    setFiles([]);
    setInput('');
    closeMobileSidebar();
  }

  function deleteSession(id: string) {
    if (workspaceBusy) return;
    const next = sessions.filter(session => session.id !== id);
    if (!next.length) next.push(emptySession());
    setSessions(next);
    if (id === currentId) { setCurrentId(next[0].id); setInput(''); setFiles([]); }
  }

  function renameSession(id: string, title: string) {
    if (workspaceBusy || !title.trim()) return;
    setSessions(previous => previous.map(session => session.id === id ? { ...session, title: title.trim().slice(0,80), titleEdited: true, updatedAt: Date.now() } : session));
  }

  function pinSession(id: string) {
    if (workspaceBusy) return;
    setSessions(previous => previous.map(session => session.id === id ? { ...session, pinnedAt: session.pinnedAt ? undefined : Date.now() } : session));
  }

  function moveSession(id: string, projectId?: string) {
    if (workspaceBusy || (projectId && !projects.some(project => project.id === projectId))) return;
    setSessions(previous => previous.map(session => session.id === id ? { ...session, projectId, updatedAt: Date.now() } : session));
  }

  function createProject(name: string, sessionId?: string): string {
    const now = Date.now();
    const project: Project = { id: crypto.randomUUID(), name: name.trim().slice(0,80), createdAt: now, updatedAt: now };
    setProjects(previous => [...previous, project]);
    if (sessionId) setSessions(previous => previous.map(session => session.id === sessionId ? { ...session, projectId: project.id, updatedAt: now } : session));
    setProjectViewId(project.id); closeMobileSidebar();
    return project.id;
  }

  function renameProject(id: string, name: string) {
    if (workspaceBusy || !name.trim()) return;
    setProjects(previous => previous.map(project => project.id === id ? { ...project, name: name.trim().slice(0,80), updatedAt: Date.now() } : project));
  }

  function deleteProject(id: string) {
    if (workspaceBusy) return;
    setProjects(previous => previous.filter(project => project.id !== id));
    setSessions(previous => previous.map(session => session.projectId === id ? { ...session, projectId: undefined, updatedAt: Date.now() } : session));
    if (projectViewId === id) setProjectViewId(null);
  }

  const handleFiles = useCallback(async (list: FileList) => {
    const added: AttachedFile[] = [];
    for (const f of Array.from(list)) {
      if (f.type.startsWith('image/')) {
        try {
          const stored = await uploadFile(f);
          const dataUrl = await fileToImageDataUrl(f);
          added.push({
            ...stored,
            name: f.name,
            size: f.size,
            kind: 'image',
            dataUrl,
            text: '',
            charCount: 0,
            truncated: false,
            type: f.type,
          });
        } catch (error) {
          showNote(error instanceof Error ? error.message : '图片上传失败');
        }
      } else {
        try {
          added.push(await uploadFile(f));
        } catch (error) {
          showNote(error instanceof Error ? error.message : '文件上传失败');
        }
      }
    }
    if (added.length) setFiles((prev) => [...prev, ...added]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  /**
   * Save a freshly recognized case file into the library. If the current
   * conversation already links to a library entry, that entry is updated in
   * place instead of piling up duplicates from repeated uploads.
   */
  const archiveDossier = useCallback(
    (dossier: Dossier, raw: string, sessionId?: string) => {
      setLibrary((prev) => {
        const existingIdx = prev.findIndex((it) => it.sourceSessionId === (sessionId || current?.id));
        const now = Date.now();
        if (existingIdx >= 0) {
          const next = [...prev];
          const old = next[existingIdx];
          next[existingIdx] = {
            ...old,
            dossier,
            raw,
            name: old.name || suggestName(dossier),
            updatedAt: now,
          };
          return [next[existingIdx], ...next.filter((_, i) => i !== existingIdx)];
        }
        const item: SavedDossier = {
          id: newDossierId(),
          name: suggestName(dossier, prev.length),
          dossier,
          raw,
          sourceSessionId: sessionId || current?.id,
          createdAt: now,
          updatedAt: now,
        };
        return [item, ...prev];
      });
    },
    [current?.id]
  );

  /** Open a saved case file in the dossier panel of the current conversation. */
  const useSavedDossier = useCallback(
    (item: SavedDossier) => {
      if (streaming) { showNote('请等待当前回答保存后再切换卷宗。'); return; }
      const next: Dossier = { ...item.dossier, raw: item.raw };
      updateCurrent((s) => ({ ...s, dossier: next }));
      setLibrary((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, sourceSessionId: current?.id, updatedAt: Date.now() } : it))
      );
      showNote(`已启用卷宗「${item.name}」，本对话将结合该案卷作答`);
    },
    [updateCurrent, current?.id, streaming]
  );

  const renameSavedDossier = useCallback((id: string, name: string) => {
    setLibrary((prev) =>
      prev.map((it) => (it.id === id ? { ...it, name: name.trim() || it.name, updatedAt: Date.now() } : it))
    );
  }, []);

  const deleteSavedDossier = useCallback((id: string) => {
    setLibrary((prev) => prev.filter((it) => it.id !== id));
  }, []);

  /** Mirror edits made in the panel back into the linked library entry. */
  const handleDossierChange = useCallback(
    (d: Dossier) => {
      if (streaming) { showNote('请等待当前回答保存后再修改卷宗。'); return; }
      updateCurrent((s) => ({ ...s, dossier: d }));
      setLibrary((prev) => {
        const idx = prev.findIndex((it) => it.sourceSessionId === current?.id);
        if (idx < 0) return prev;
        const next = [...prev];
        const old = next[idx];
        next[idx] = {
          ...old,
          dossier: d,
          name: old.name || suggestName(d),
          updatedAt: Date.now(),
        };
        return [next[idx], ...next.filter((_, i) => i !== idx)];
      });
    },
    [updateCurrent, current?.id, streaming]
  );

  const handleDossierUpload = useCallback(
    async (input: File | { text: string; name?: string }) => {
      if (!current || dossierBusy || streaming) return;
      setDossierBusy(true);
      try {
        const payload: { text?: string; images?: string[]; model?: string } = { model: selectedModel };
        const sourceFiles: AttachedFile[] = [];
        let raw = '';
        if (!(input instanceof File)) {
          if (!input.text.trim()) throw new Error('粘贴内容为空');
          payload.text = input.text;
          raw = input.text;
        } else {
          const file = input;
          if (file.type.startsWith('image/')) {
            sourceFiles.push(await uploadFile(file));
            payload.images = [await fileToImageDataUrl(file)];
            raw = IMAGE_DOSSIER_RAW;
          } else {
            const parsed = await uploadFile(file);
            sourceFiles.push(parsed);
            if (!parsed.text.trim()) throw new Error('未能从文件提取文本（可能是扫描件或空文件）');
            payload.text = parsed.text;
            raw = parsed.text;
          }
        }
        // 1) Try LLM extraction; the local heading-based splitter then runs
        //    regardless and tops up any fields the model left empty.
        let fields: Record<string, string> = {};
        let fallback = false;
        try {
          if (!getPrivacy()) throw new Error('禁止外发模式，使用本地章节提取');
          fields = await extractDossier(payload);
          const filled = ['parties', 'cause', 'facts', 'claims', 'evidence'].filter(
            (k) => (fields[k] || '').trim()
          ).length;
          if (filled === 0) fallback = true;
        } catch {
          fields = {};
          fallback = true;
        }
        const heur = heuristicExtract(raw);
        for (const k of ['parties', 'cause', 'facts', 'claims', 'evidence'] as const) {
          if (!fields[k]?.trim() && heur[k]?.trim()) fields[k] = heur[k];
        }
        const next = mergeDossier(current.dossier, fields, raw);
        if (sourceFiles.length) next.sourceFiles = [...(next.sourceFiles || []), ...sourceFiles];
        updateCurrent((s) => ({ ...s, dossier: next }));
        archiveDossier(next, raw);
        setDossierOpen(true);
        showNote(
          fallback
            ? '模型提取失败，已按章节标题做本地兜底拆分，请人工核对'
            : '卷宗已自动识别，已填入卷宗面板并存入库中'
        );
      } catch (e) {
        showNote((e as Error).message || '卷宗识别失败');
      } finally {
        setDossierBusy(false);
      }
    },
    [current, dossierBusy, updateCurrent, archiveDossier, selectedModel, streaming]
  );

  /** Re-run smart recognition on the saved raw material (text-based only). */
  const handleDossierReExtract = useCallback(() => {
    const raw = current?.dossier?.raw?.trim();
    if (!raw || raw === IMAGE_DOSSIER_RAW || dossierBusy) return;
    handleDossierUpload({ text: raw });
  }, [current, dossierBusy, handleDossierUpload]);

  const submit = useCallback(
    async (text: string, attachFiles: AttachedFile[], baseHistory?: ChatMessage[]) => {
      if ((!text.trim() && !attachFiles.length) || streaming || !current) return;
      if (!getPrivacy()) { showNote('当前禁止向模型外发资料，请在「账号与隐私」中查看并明确授权。'); return; }

      const userMsg: ChatMessage = makeMsg('user', text);
      if (attachFiles.length) userMsg.files = attachFiles;
      const assistantMsg: ChatMessage = makeMsg('assistant');
      assistantMsg.status = 'generating';

      const isFirst = !current || current.messages.length === 0;

      const nextSession: Session = {
        ...current,
        title: isFirst && !current.titleEdited ? firstLine(text) : current.title,
        messages: [...(baseHistory ?? current.messages), userMsg, assistantMsg],
        updatedAt: Date.now(),
      };
      const nextSessions = sessions.map(session => session.id === current.id ? nextSession : session);
      setSessions(nextSessions);

      setStreaming(true);

      const ac = new AbortController();
      abortRef.current = ac;
      const toolMap = new Map<string, ToolCallView>();
      let acc = '';

      try {
        await saveCollection('sessions', nextSessions);
        await flushCloudStore();
        for await (const ev of streamChat(
          baseHistory ? [...baseHistory, userMsg] : [...current!.messages, userMsg],
          {
          model: selectedModel,
          signal: ac.signal,
          knowledge: kbEnabled ? kbToText(kb) : '',
          dossier: current!.dossier ? dossierToText(current!.dossier) : '',
          conversationId: current.id,
          assistantMessageId: assistantMsg.id,
        })) {
          applyEvent(ev);
        }
      } catch (e) {
        applyEvent({ type: 'error', message: (e as Error).message || '生成失败' });
      } finally {
        try {
          const saved = await refreshConversation(current.id) as unknown as Session;
          saved.messages = saved.messages.map(message => message.id === assistantMsg.id && message.status === 'generating'
            ? { ...message, status: 'failed', content: message.content || '本次生成未完成，请核对模型授权与配置后重试。' } : message);
          setSessions(previous => previous.map(session => session.id === current.id ? saved : session));
        } catch (error) {
          reportSyncError(error instanceof Error ? error.message : '无法确认对话保存状态');
        }
        setStreaming(false);
        abortRef.current = null;
      }

      function applyEvent(ev: AgentEvent) {
        switch (ev.type) {
          case 'token':
            acc += ev.content;
            updateCurrent((s) => ({
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantMsg.id ? { ...m, content: acc } : m
              ),
            }));
            break;
          case 'tool_start': {
            const t: ToolCallView = {
              id: ev.id,
              name: ev.name,
              arguments: ev.arguments,
              status: 'running',
            };
            toolMap.set(ev.id, t);
            updateCurrent((s) => ({
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, toolCalls: [...(m.toolCalls || []), t] }
                  : m
              ),
            }));
            break;
          }
          case 'tool_end': {
            const t = toolMap.get(ev.id);
            if (t) {
              t.status = 'done';
              t.result = ev.result;
              updateCurrent((s) => ({
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, toolCalls: [...(m.toolCalls || []).filter((x) => x.id !== ev.id), t] }
                    : m
                ),
              }));
            }
            break;
          }
          case 'error':
            if (acc.trim() === '') {
              updateCurrent((s) => ({
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantMsg.id ? { ...m, content: '⚠️ ' + ev.message } : m
                ),
              }));
            }
            break;
          case 'done':
          default:
            break;
        }
      }
    },
    [streaming, current, selectedModel, updateCurrent, kb, kbEnabled, sessions]
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if ((!text && files.length === 0) || streaming) return;
    if (!getPrivacy()) { showNote('当前禁止向模型外发资料，请在「账号与隐私」中查看并明确授权。'); return; }
    submit(text, files);
    setInput('');
    setFiles([]);
  }, [input, files, streaming, submit]);

  const handleRetrieve = useCallback((mode: RetrieveMode, payload: Parameters<React.ComponentProps<typeof ChatInput>['onRetrieve']>[1]) => {
    const fields = mode === 'law'
      ? [['关键词', payload.keyword], ['法典名称', payload.code], ['条文序号', payload.article]]
      : [['关键词', payload.keyword], ['案由', payload.cause], ['案件类型', payload.caseType], ['审理程序', payload.procedure], ['法院层级', payload.courtLevel], ['年份', payload.year]];
    const conditions = fields.filter(([, value]) => value).map(([name, value]) => `${name}：${value}`).join('\n');
    const task = mode === 'law'
      ? '请根据下列条件，从本次提供的知识库、卷宗和附件中检索相关法条，列出法律名称、条文序号、材料中的原文及适用要点。'
      : '请根据下列条件，从本次提供的知识库、卷宗和附件中检索类似案例，列出材料中的案号、法院、关键事实、争议焦点、裁判理由，以及与本案的异同。';
    const detail = payload.depth === 'deep'
      ? '请逐项分析，说明匹配与不匹配的条件、证据来源和需要补充核实的信息。'
      : '请优先列出最相关的结果，简要说明理由。';
    if (!getPrivacy()) { showNote('当前禁止向模型外发资料，请在「账号与隐私」中查看并明确授权。'); return; }
    void submit(`${task}\n${conditions}\n${detail}\n当前不提供网页搜索。仅引用所提供材料中实际存在的条文、案号和链接；没有匹配资料时明确说明，并给出后续人工核验的方向。`, files);
    setFiles([]);
  }, [files, submit]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  /** 重新生成：截断指定回答及之后的消息，基于其前一条用户消息再次提交。 */
  const regenerate = useCallback(
    (assistantId: string) => {
      if (!current || streaming) return;
      const msgs = current.messages;
      const idx = msgs.findIndex((m) => m.id === assistantId);
      if (idx < 1) return;
      let userIdx = idx - 1;
      while (userIdx >= 0 && msgs[userIdx].role !== 'user') userIdx--;
      if (userIdx < 0) return;
      const userMsg = msgs[userIdx];
      if (!userMsg.content.trim()) return;
      // submit 会把新用户消息拼在历史之后，这里只需取该提问之前的部分
      const history = msgs.slice(0, userIdx);
      updateCurrent((s) => ({
        ...s,
        messages: s.messages.slice(0, userIdx),
        updatedAt: Date.now(),
      }));
      submit(userMsg.content, userMsg.files || [], history);
    },
    [current, streaming, updateCurrent, submit]
  );

  /** 编辑用户消息后原地重发：截断该条及之后的消息，用新内容重新提交。 */
  const resendEdited = useCallback(
    (msgId: string, newContent: string) => {
      if (!current || streaming) return;
      const text = newContent.trim();
      if (!text) return;
      const msgs = current.messages;
      const idx = msgs.findIndex((m) => m.id === msgId);
      if (idx < 0 || msgs[idx].role !== 'user') return;
      const originalFiles = msgs[idx].files || [];
      const history = msgs.slice(0, idx);
      updateCurrent((s) => ({
        ...s,
        messages: s.messages.slice(0, idx),
        updatedAt: Date.now(),
      }));
      submit(text, originalFiles, history);
    },
    [current, streaming, updateCurrent, submit]
  );

  /** 让助理基于当前模型/知识库/卷宗生成一段纯文本（用于事务台）。 */
  const generateText = useCallback(
    async (prompt: string, onToken: (text: string) => void): Promise<string> => {
      if (streaming) throw new Error('请等待当前生成结束。');
      if (!getPrivacy()) throw new Error('当前禁止向模型外发资料，请先在账号与隐私中明确授权。');
      const userMessage = makeMsg('user', prompt);
      const assistantMessage = { ...makeMsg('assistant'), status: 'generating' as const };
      const session: Session = { id: newSessionId(), title: firstLine(prompt), messages: [userMessage, assistantMessage], createdAt: Date.now(), updatedAt: Date.now() };
      const nextSessions = [session, ...sessions];
      setSessions(nextSessions); setStreaming(true);
      const controller = new AbortController(); abortRef.current = controller;
      let acc = '';
      try {
        await saveCollection('sessions', nextSessions); await flushCloudStore();
        for await (const ev of streamChat([userMessage], {
          model: selectedModel, signal: controller.signal,
          knowledge: kbEnabled ? kbToText(kb) : '',
          dossier: current?.dossier ? dossierToText(current.dossier) : '',
          conversationId: session.id, assistantMessageId: assistantMessage.id,
        })) {
          if (ev.type === 'error') throw new Error(ev.message);
          if (ev.type === 'token') { acc += ev.content; onToken(acc); }
        }
        return acc;
      } finally {
        try {
          const saved = await refreshConversation(session.id) as unknown as Session;
          saved.messages = saved.messages.map(message => message.id === assistantMessage.id && message.status === 'generating'
            ? { ...message, status: 'failed', content: message.content || '本次生成未完成，请核对模型授权与配置后重试。' } : message);
          setSessions(previous => previous.map(item => item.id === session.id ? saved : item));
        } catch (error) { reportSyncError(error instanceof Error ? error.message : '无法确认保存状态'); }
        setStreaming(false); abortRef.current = null;
      }
    },
    [selectedModel, kb, kbEnabled, current, sessions, streaming]
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
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
        modelName={modelName}
        onOpenAppearance={() => setAppearanceOpen(true)}
        onOpenWorkbench={() => setWorkbenchOpen(true)}
        right={appearance.sidebarSide === 'right'}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        disabled={workspaceBusy}
      />
      <main className={`flex min-w-0 flex-1 flex-col ${appearance.sidebarSide === 'right' ? 'order-1' : 'order-2'}`}>
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          {!sidebarOpen && <button type="button" onClick={() => setSidebarOpen(true)} aria-label="展开侧边栏" className="mr-1 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><PanelLeftOpen className="h-4 w-4" /></button>}
          <span className="text-sm font-semibold">小知</span>
          {currentProject && <><ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /><button type="button" disabled={workspaceBusy} onClick={() => openProject(currentProject.id)} className="max-w-40 truncate rounded px-1 py-0.5 text-xs text-muted-foreground hover:bg-muted">{currentProject.name}</button></>}
          <span className="text-[0.72rem] text-muted-foreground">知识产权办案助理</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.7rem] text-primary">
            私人云端空间
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <AccountControls disabled={streaming || dossierBusy} />
            <button
              onClick={() => setKbOpen(true)}
              className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[0.78rem] text-muted-foreground hover:border-primary/40 hover:text-foreground"
              title="专业知识库"
            >
              <BookOpen className="h-3.5 w-3.5" />
              知识库
            </button>
            <button
              onClick={() => setDossierOpen(true)}
              className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[0.78rem] text-muted-foreground hover:border-primary/40 hover:text-foreground"
              title="案情卷宗"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              卷宗
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {note && (
            <div className="mx-auto mt-3 w-full max-w-[var(--chat-max-width)] px-4">
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-[0.8rem] text-foreground">
                {note}
              </div>
            </div>
          )}
          {viewedProject ? <ProjectOverview project={viewedProject} sessions={sessions.filter(session => session.projectId === viewedProject.id)} onNew={() => newChat(viewedProject.id)} onSelect={selectConversation} disabled={workspaceBusy} /> : current && current.messages.length > 0 ? (
            <MessageList messages={current.messages} avatar={appearance.avatar} onResend={resendEdited} onRegenerate={regenerate} />
          ) : (
            <EmptyState onPick={(t) => { setInput(t); }} avatar={appearance.avatar} />
          )}
        </div>

        {!viewedProject && <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onStop={stop}
          onFiles={handleFiles}
          files={files}
          onRemoveFile={removeFile}
          streaming={streaming}
          disabled={streaming || !current}
          onRetrieve={handleRetrieve}
          onOpenContract={() => setContractOpen(true)}
          onDossierFile={handleDossierUpload}
          dossierBusy={dossierBusy}
          models={models}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          modelsLoading={modelsLoading}
          modelsError={modelsError}
          onRetryModels={() => { setModelsLoading(true); setModelsError(''); void loadModels(); }}
        />}
      </main>

      <KnowledgePanel
        open={kbOpen}
        onClose={() => setKbOpen(false)}
        entries={kb}
        onChange={setKb}
        enabled={kbEnabled}
        onToggleEnabled={setKbEnabled}
      />

      <CaseDossier
        open={dossierOpen}
        onClose={() => setDossierOpen(false)}
        session={current}
        busy={dossierBusy || streaming}
        onReExtract={handleDossierReExtract}
        library={library}
        onUseSaved={useSavedDossier}
        onRenameSaved={renameSavedDossier}
        onDeleteSaved={deleteSavedDossier}
        onUploadFile={handleDossierUpload}
        onChange={handleDossierChange}
      />

      <AppearancePanel
        open={appearanceOpen}
        onClose={() => setAppearanceOpen(false)}
        value={appearance}
        onChange={setAppearance}
      />

      <Workbench
        open={workbenchOpen}
        onClose={() => setWorkbenchOpen(false)}
        onGenerate={generateText}
        dossierCaseName={current?.dossier?.parties}
      />

      <ContractPanel open={contractOpen} onClose={() => setContractOpen(false)} onGenerate={generateText} disabled={streaming || dossierBusy} />
    </div>
  );
}
