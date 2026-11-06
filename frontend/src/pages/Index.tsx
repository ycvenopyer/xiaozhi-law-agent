import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, FolderOpen } from 'lucide-react';
import { Sidebar } from '@/components/assistant/Sidebar';
import { MessageList } from '@/components/assistant/MessageList';
import { ChatInput, type RetrieveMode } from '@/components/assistant/ChatInput';
import { EmptyState } from '@/components/assistant/EmptyState';
import { KnowledgePanel } from '@/components/assistant/KnowledgePanel';
import { streamChat, uploadFile, extractDossier } from '@/lib/agent-client';
import { loadSessions, saveSessions, newSessionId } from '@/lib/sessions';
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
  CaseDossier as Dossier,
} from '@/types/agent';
import { DOSSIER_CAUSES, EMPTY_DOSSIER, IMAGE_DOSSIER_RAW } from '@/types/agent';
import { dossierToText } from '@/types/agent';

interface ModelInfo {
  id: string;
  label: string;
  free: boolean;
  available: boolean;
}

function makeMsg(role: ChatMessage['role'], content = ''): ChatMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: Date.now() };
}

function firstLine(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  return t.length > 22 ? t.slice(0, 22) + '…' : t || '新对话';
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

export default function Index() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentId, setCurrentId] = useState<string>('');
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [modelName, setModelName] = useState('DeepSeek V3');
  const [models, setModels] = useState<ModelInfo[]>([]);
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
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function showNote(msg: string) {
    setNote(msg);
    if (noteTimer.current) window.clearTimeout(noteTimer.current);
    noteTimer.current = window.setTimeout(() => setNote(null), 4500);
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

  // Load persisted sessions once, then open a fresh blank conversation so the
  // user can start typing immediately without pressing "新建对话" first.
  // Existing history is preserved and stays listed in the sidebar.
  useEffect(() => {
    const loaded = loadSessions();
    const fresh: Session = {
      id: newSessionId(),
      title: '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    // Drop any leftover empty draft sessions so we don't accumulate blanks.
    const history = loaded.filter((s) => s.messages.length > 0);
    setSessions([fresh, ...history]);
    setCurrentId(fresh.id);
  }, []);

  // Fetch available models and make sure the selected one is configured.
  useEffect(() => {
    fetch('/api/agent/models')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!Array.isArray(j)) return;
        setModels(j);
        const match = j.find((m: ModelInfo) => m.id === selectedModel);
        const firstFree = j.find((m: ModelInfo) => m.free && m.available);
        if (!match || !match.available || !match.free) {
          if (firstFree) setSelectedModel(firstFree.id);
        } else {
          setModelName(match.label);
        }
      })
      .catch(() => {});
  }, []);

  // Persist the chosen model and keep the sidebar label in sync.
  useEffect(() => {
    localStorage.setItem('agent-model', selectedModel);
    const m = models.find((x) => x.id === selectedModel);
    if (m) setModelName(m.label);
  }, [selectedModel, models]);

  // Persist whenever sessions change.
  useEffect(() => {
    if (sessions.length) saveSessions(sessions);
  }, [sessions]);

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

  const updateCurrent = useCallback(
    (updater: (s: Session) => Session) => {
      setSessions((prev) => prev.map((s) => (s.id === currentId ? updater(s) : s)));
    },
    [currentId]
  );

  const newChat = useCallback(() => {
    const s: Session = {
      id: newSessionId(),
      title: '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions((prev) => [s, ...prev]);
    setCurrentId(s.id);
    setFiles([]);
    setInput('');
  }, []);

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (id === currentId) {
          const fallback = next[0];
          setCurrentId(fallback ? fallback.id : '');
        }
        return next;
      });
    },
    [currentId]
  );

  const handleFiles = useCallback(async (list: FileList) => {
    const added: AttachedFile[] = [];
    for (const f of Array.from(list)) {
      if (f.type.startsWith('image/')) {
        try {
          const dataUrl = await fileToImageDataUrl(f);
          added.push({
            id: crypto.randomUUID(),
            name: f.name,
            size: f.size,
            kind: 'image',
            dataUrl,
            text: '',
            charCount: 0,
            truncated: false,
            type: f.type,
          });
        } catch {
          /* ignore unreadable images */
        }
      } else {
        try {
          added.push(await uploadFile(f));
        } catch {
          /* ignore individual failures */
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
      const next: Dossier = { ...item.dossier, raw: item.raw };
      updateCurrent((s) => ({ ...s, dossier: next }));
      setLibrary((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, sourceSessionId: current?.id, updatedAt: Date.now() } : it))
      );
      showNote(`已启用卷宗「${item.name}」，本对话将结合该案卷作答`);
    },
    [updateCurrent, current?.id]
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
    [updateCurrent, current?.id]
  );

  const handleDossierUpload = useCallback(
    async (input: File | { text: string; name?: string }) => {
      if (!current || dossierBusy) return;
      setDossierBusy(true);
      try {
        let payload: { text?: string; images?: string[] } = {};
        let raw = '';
        if (!(input instanceof File)) {
          if (!input.text.trim()) throw new Error('粘贴内容为空');
          payload.text = input.text;
          raw = input.text;
        } else {
          const file = input;
          if (file.type.startsWith('image/')) {
            payload.images = [await fileToImageDataUrl(file)];
            raw = IMAGE_DOSSIER_RAW;
          } else {
            const parsed = await uploadFile(file);
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
    [current, dossierBusy, updateCurrent, archiveDossier]
  );

  /** Re-run smart recognition on the saved raw material (text-based only). */
  const handleDossierReExtract = useCallback(() => {
    const raw = current?.dossier?.raw?.trim();
    if (!raw || raw === IMAGE_DOSSIER_RAW || dossierBusy) return;
    handleDossierUpload({ text: raw });
  }, [current, dossierBusy, handleDossierUpload]);

  const submit = useCallback(
    async (text: string, attachFiles: AttachedFile[], baseHistory?: ChatMessage[]) => {
      if (!text.trim() || streaming) return;

      const userMsg: ChatMessage = makeMsg('user', text);
      if (attachFiles.length) userMsg.files = attachFiles;
      const assistantMsg: ChatMessage = makeMsg('assistant');

      const isFirst = !current || current.messages.length === 0;

      updateCurrent((s) => ({
        ...s,
        title: isFirst ? firstLine(text) : s.title,
        messages: [...s.messages, userMsg, assistantMsg],
        updatedAt: Date.now(),
      }));

      setStreaming(true);

      const ac = new AbortController();
      abortRef.current = ac;
      const toolMap = new Map<string, ToolCallView>();
      let acc = '';

      try {
        for await (const ev of streamChat(
          baseHistory ? [...baseHistory, userMsg] : [...current!.messages, userMsg],
          {
          model: selectedModel,
          signal: ac.signal,
          knowledge: kbEnabled ? kbToText(kb) : '',
          dossier: current!.dossier ? dossierToText(current!.dossier) : '',
        })) {
          applyEvent(ev);
        }
      } catch (e) {
        applyEvent({ type: 'error', message: (e as Error).message || '生成失败' });
      } finally {
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
    [streaming, current, selectedModel, updateCurrent, kb, kbEnabled]
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if ((!text && files.length === 0) || streaming) return;
    submit(text, files);
    setInput('');
    setFiles([]);
  }, [input, files, streaming, submit]);

  const handleRetrieve = useCallback(
    (
      mode: RetrieveMode,
      payload: {
        keyword: string;
        code?: string;
        article?: string;
        cause?: string;
        caseType?: string;
        procedure?: string;
        courtLevel?: string;
        year?: string;
        depth: 'fast' | 'deep';
      }
    ) => {
      const { keyword, code, article, cause, caseType, procedure, courtLevel, year, depth } = payload;
      let prompt: string;
      if (mode === 'case') {
        const filters: string[] = [];
        if (cause) filters.push(`案由聚焦「${cause}」`);
        if (caseType) filters.push(`案件类型为「${caseType}」`);
        if (procedure) filters.push(`审判程序为「${procedure}」`);
        if (courtLevel) filters.push(`法院层级为「${courtLevel}」`);
        if (year) filters.push(`裁判年份约为「${year}」年`);
        const filterText = filters.length ? `检索条件：${filters.join('；')}。` : '';
        prompt =
          depth === 'fast'
            ? `请基于知识库与已有资料，快速给出${keyword ? `与「${keyword}」相关` : ''}的案例参考。${filterText}要求：\n1. 优先直接使用已提供的参考资料作答，不要联网检索；仅当参考资料明显不足时，才做至多 1 次简要联网核实；\n2. 每条案例简要写明法院层级与裁判要旨即可，最多 3 条，不展开长篇分析；\n3. 无法确认的案号或内容标注“需进一步核实”，严禁编造案号或裁判内容；\n4. 回答保持简短直接。`
            : `请检索${keyword ? `与「${keyword}」相关` : ''}的类似司法案例。${filterText}要求：\n1. 调用联网搜索工具，优先检索中国裁判文书网（wenshu.court.gov.cn）、最高人民法院及各级法院官网、北大法宝等权威来源；\n2. 每条案例写明审理法院（含层级）、案号、裁判要旨，并附来源链接；\n3. 尽量贴近上述筛选条件，优先选用指导性案例与高级人民法院、最高人民法院的生效裁判；\n4. 若知识库中有相关案例也一并引用并标注出处；\n5. 无法确认的内容明确标注“需进一步核实”，严禁编造案号或裁判内容。`;
      } else if (code || article) {
        const ref = [code && `《${code}》`, article && article].filter(Boolean).join('');
        prompt =
          depth === 'fast'
            ? `请基于知识库与已有资料，快速给出${ref || `与「${keyword}」相关法条`}的核心内容与适用要点。要求：\n1. 优先直接使用已提供的参考资料作答，不要联网检索；仅当参考资料明显不足时，才做至多 1 次简要联网核实；\n2. 列出法律名称、条文序号与条文要旨（不必逐字引用全文），最多 3 条；\n3. 不确定的内容标注“需进一步核实”，严禁编造文号或条文内容；\n4. 回答保持简短直接。`
            : `请检索${ref}（及相关关联法条）的准确条文文本与理解适用。要求：\n1. 调用联网搜索工具，优先检索权威来源（中国商标网、国家知识产权局、最高人民法院、北大法宝等）；\n2. 完整列出该条文的制定机关、法律名称、条文序号与全文；若用户未指定具体条文，请围绕「${keyword || code}」给出最相关的 2-4 条法条；\n3. 每条法条附来源链接，并简要说明适用要点；\n4. 无法确认的内容明确标注“需进一步核实”，严禁编造文号或条文内容。`;
      } else {
        prompt =
          depth === 'fast'
            ? `请基于知识库与已有资料，快速给出与「${keyword}」相关的法条要点。要求：\n1. 优先直接使用已提供的参考资料作答，不要联网检索；仅当参考资料明显不足时，才做至多 1 次简要联网核实；\n2. 列出 2-3 条最相关法条（法律名称 + 条文序号 + 要旨），不必逐字引用全文；\n3. 不确定的内容标注“需进一步核实”，严禁编造文号；\n4. 回答保持简短直接。`
            : `请检索与「${keyword}」相关的法律法规与法条。要求：\n1. 调用联网搜索工具，优先检索权威来源（中国商标网、国家知识产权局、最高人民法院、北大法宝等）；\n2. 每条法条写明制定机关、法律名称与条文序号，并附来源链接；\n3. 若知识库中有相关内容也一并引用并标注出处；\n4. 无法确认的内容明确标注“需进一步核实”，严禁编造文号。`;
      }
      submit(prompt, []);
    },
    [submit]
  );

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

  /** 让助理基于当前模型/知识库/卷宗生成一段纯文本（用于事务台的邮件与新闻）。 */
  const generateText = useCallback(
    async (prompt: string, onToken: (text: string) => void): Promise<string> => {
      let acc = '';
      for await (const ev of streamChat([makeMsg('user', prompt)], {
        model: selectedModel,
        knowledge: kbEnabled ? kbToText(kb) : '',
        dossier: current?.dossier ? dossierToText(current.dossier) : '',
      })) {
        if (ev.type === 'token') {
          acc += ev.content;
          onToken(acc);
        }
      }
      return acc;
    },
    [selectedModel, kb, kbEnabled, current]
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar
        sessions={sessions}
        currentId={currentId}
        onSelect={setCurrentId}
        onNew={newChat}
        onDelete={deleteSession}
        modelName={modelName}
        onOpenAppearance={() => setAppearanceOpen(true)}
        onOpenWorkbench={() => setWorkbenchOpen(true)}
        right={appearance.sidebarSide === 'right'}
      />
      <main className={`flex min-w-0 flex-1 flex-col ${appearance.sidebarSide === 'right' ? 'order-1' : 'order-2'}`}>
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <span className="text-sm font-semibold">小知</span>
          <span className="text-[0.72rem] text-muted-foreground">知识产权办案助理</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.7rem] text-primary">
            本地会话
          </span>
          <div className="ml-auto flex items-center gap-1.5">
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
            <span className="text-[0.72rem] text-muted-foreground">模型</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={streaming}
              className="rounded-md border border-border bg-card px-2 py-1 text-[0.78rem] outline-none disabled:opacity-50"
            >
              {models.length === 0 && <option value="zhipu-glm">智谱 GLM-4.7</option>}
              {models.map((m) => (
                <option key={m.id} value={m.id} disabled={!m.available}>
                  {m.label}
                  {m.available ? '' : '（未配置）'}
                </option>
              ))}
            </select>
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
          {current && current.messages.length > 0 ? (
            <MessageList messages={current.messages} avatar={appearance.avatar} onResend={resendEdited} onRegenerate={regenerate} />
          ) : (
            <EmptyState onPick={(t) => { setInput(t); }} avatar={appearance.avatar} />
          )}
        </div>

        <ChatInput
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
          onDossierFile={handleDossierUpload}
          dossierBusy={dossierBusy}
          onOpenContract={() => setContractOpen(true)}
        />
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
        busy={dossierBusy}
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

      <ContractPanel
        open={contractOpen}
        onClose={() => setContractOpen(false)}
        onGenerate={generateText}
      />
    </div>
  );
}
