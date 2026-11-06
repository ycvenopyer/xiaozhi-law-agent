import { useMemo, useState } from 'react';
import { BookOpen, Plus, Trash2, Pencil, X, Check } from 'lucide-react';
import { kbToText, type KBEntry, type KBCategory, type KBKind } from '@/lib/knowledge';

const CATEGORIES: KBCategory[] = ['商标法', '专利法', '著作权法', '反不正当竞争法', '其他'];
type KindFilter = 'all' | KBKind;
const KIND_TABS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'law', label: '法条' },
  { id: 'case', label: '案例' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  entries: KBEntry[];
  onChange: (entries: KBEntry[]) => void;
  enabled: boolean;
  onToggleEnabled: (v: boolean) => void;
}

export function KnowledgePanel({ open, onClose, entries, onChange, enabled, onToggleEnabled }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<KBEntry | null>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');

  const visible = useMemo(
    () => (kindFilter === 'all' ? entries : entries.filter((e) => e.kind === kindFilter)),
    [entries, kindFilter]
  );

  function startNew() {
    setDraft({ id: crypto.randomUUID(), title: '', category: '商标法', kind: 'law', content: '' });
    setEditingId('new');
  }

  function startEdit(e: KBEntry) {
    setDraft({ ...e });
    setEditingId(e.id);
  }

  function save() {
    if (!draft) return;
    const title = draft.title.trim() || '未命名条目';
    const content = draft.content.trim();
    if (!content) {
      // empty content is useless as a reference; ignore the save
      setDraft(null);
      setEditingId(null);
      return;
    }
    if (editingId === 'new') {
      onChange([...entries, { ...draft, title }]);
    } else {
      onChange(entries.map((e) => (e.id === draft.id ? { ...draft, title } : e)));
    }
    setDraft(null);
    setEditingId(null);
  }

  function remove(id: string) {
    onChange(entries.filter((e) => e.id !== id));
    if (editingId === id) {
      setDraft(null);
      setEditingId(null);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-card shadow-xl transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">专业知识库</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.68rem] text-primary">
            {entries.length} 条
          </span>
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-[0.78rem]">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggleEnabled(e.target.checked)}
              className="accent-primary"
            />
            <span>在回答时引用知识库</span>
          </label>
          <button
            onClick={startNew}
            className="ml-auto flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[0.72rem] text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> 新增
          </button>
        </div>

        <div className="flex items-center gap-1.5 border-b border-border px-4 py-2">
          {KIND_TABS.map((t) => {
            const count =
              t.id === 'all'
                ? entries.length
                : entries.filter((e) => e.kind === t.id).length;
            const active = kindFilter === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setKindFilter(t.id)}
                className={`rounded-full px-3 py-1 text-[0.72rem] transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {t.label}
                <span className={`ml-1 ${active ? 'text-primary-foreground/80' : 'text-muted-foreground/70'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {editingId && draft ? (
            <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="标题，如：商标法 第五十七条"
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[0.85rem] outline-none"
              />
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as KBCategory })}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[0.8rem] outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <span className="text-[0.75rem] text-muted-foreground">类型</span>
                <select
                  value={draft.kind}
                  onChange={(e) => setDraft({ ...draft, kind: e.target.value as KBKind })}
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-[0.8rem] outline-none"
                >
                  <option value="law">法条</option>
                  <option value="case">案例</option>
                </select>
              </div>
              <textarea
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                placeholder="法条或案例正文……"
                rows={6}
                className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setDraft(null);
                    setEditingId(null);
                  }}
                  className="rounded-md px-2 py-1 text-[0.75rem] text-muted-foreground hover:bg-muted"
                >
                  取消
                </button>
                <button
                  onClick={save}
                  className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[0.75rem] text-primary-foreground hover:opacity-90"
                >
                  <Check className="h-3.5 w-3.5" /> 保存
                </button>
              </div>
            </div>
          ) : null}

          {visible.map((e) => {
            const isCase = e.kind === 'case';
            const on = e.enabled !== false;
            return (
              <div
                key={e.id}
                className={`rounded-xl border bg-background p-3 ${
                  on ? 'border-border' : 'border-border/50 opacity-60'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[0.66rem] ${
                      isCase
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-sky-50 text-sky-700'
                    }`}
                  >
                    {isCase ? '案例' : '法条'}
                  </span>
                  <span className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[0.66rem] text-muted-foreground">
                    {e.category}
                  </span>
                  <span className="text-[0.85rem] font-medium leading-snug">{e.title}</span>
                  <div className="ml-auto flex shrink-0 gap-1">
                    <button
                      onClick={() => startEdit(e)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="编辑"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => remove(e.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="删除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 line-clamp-3 text-[0.76rem] leading-relaxed text-muted-foreground">
                  {e.content}
                </p>
                <label className="mt-2 flex items-center gap-1.5 text-[0.72rem] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(ev) =>
                      onChange(
                        entries.map((x) =>
                          x.id === e.id ? { ...x, enabled: ev.target.checked } : x
                        )
                      )
                    }
                    className="accent-primary"
                  />
                  纳入回答
                </label>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border px-4 py-2 text-[0.7rem] text-muted-foreground">
          知识库仅保存在本机浏览器，用于让回答更专业、有出处。
        </div>
      </aside>
    </div>
  );
}

export { kbToText };
