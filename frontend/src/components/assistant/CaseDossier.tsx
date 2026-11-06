import { useEffect, useMemo, useRef, useState } from 'react';
import { FolderOpen, X, Check, Sparkles, Eraser, Library, Search, Trash2, Pencil, Upload } from 'lucide-react';
import {
  type CaseDossier as Dossier,
  type Session,
  DOSSIER_CAUSES,
  EMPTY_DOSSIER,
  IMAGE_DOSSIER_RAW,
} from '@/types/agent';
import { type SavedDossier, dossierFilled, dossierSummary, relativeWhen } from '@/lib/dossiers';

interface Props {
  open: boolean;
  onClose: () => void;
  session: Session | null;
  onChange: (d: Dossier) => void;
  /** True while smart recognition is running. */
  busy?: boolean;
  /** Re-run smart recognition on the saved raw material. */
  onReExtract?: () => void;
  /** The user's saved case files. */
  library: SavedDossier[];
  /** Load a saved case file into the current conversation. */
  onUseSaved: (item: SavedDossier) => void;
  onRenameSaved: (id: string, name: string) => void;
  onDeleteSaved: (id: string) => void;
  /** Upload new material straight from the library tab. */
  onUploadFile: (f: File) => void;
}

function filledCount(d: Dossier): number {
  return [d.parties, d.cause, d.facts, d.claims, d.evidence].filter((v) => v.trim()).length;
}

export function CaseDossier({
  open,
  onClose,
  session,
  onChange,
  busy,
  onReExtract,
  library,
  onUseSaved,
  onRenameSaved,
  onDeleteSaved,
  onUploadFile,
}: Props) {
  const [tab, setTab] = useState<'current' | 'library'>('current');
  const base = session?.dossier ?? EMPTY_DOSSIER;
  const [draft, setDraft] = useState<Dossier>(base);
  const [keyword, setKeyword] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const uploadRef = useRef<HTMLInputElement>(null);

  // Re-sync the form whenever a different session is opened, or when the
  // dossier is refreshed in place (e.g. by a re-recognition run).
  useEffect(() => {
    setDraft(session?.dossier ?? EMPTY_DOSSIER);
  }, [open, session?.id, session?.dossier]);

  const count = filledCount(base);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return library;
    return library.filter((it) => {
      const hay = [it.name, it.dossier.parties, it.dossier.cause, it.dossier.facts, it.dossier.evidence]
        .join(' ')
        .toLowerCase();
      return hay.includes(kw);
    });
  }, [library, keyword]);

  const activeId = useMemo(
    () => library.find((it) => it.sourceSessionId === session?.id)?.id,
    [library, session?.id]
  );

  function save() {
    onChange({ ...draft });
    onClose();
  }

  return (
    <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
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
          <FolderOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">案情卷宗</span>
          {tab === 'current' && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.68rem] text-primary">
              {count}/5 项
            </span>
          )}
          {tab === 'library' && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[0.68rem] text-muted-foreground">
              共 {library.length} 份
            </span>
          )}
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-border px-2 pt-2">
          <TabButton active={tab === 'current'} onClick={() => setTab('current')} icon={<FolderOpen className="h-3.5 w-3.5" />}>
            当前卷宗
          </TabButton>
          <TabButton active={tab === 'library'} onClick={() => setTab('library')} icon={<Library className="h-3.5 w-3.5" />}>
            卷宗库
          </TabButton>
        </div>

        {tab === 'current' ? (
          <>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <p className="text-[0.74rem] leading-relaxed text-muted-foreground">
                填写本案基本信息。保存后，本对话中助理会始终结合这份卷宗作答，像承办律师一样贴着你的案子，而不是泛泛而谈。
              </p>

              {activeId && (
                <div className="rounded-md border border-primary/30 bg-primary/5 px-2.5 py-2 text-[0.72rem] text-foreground">
                  本对话已关联卷宗库中的一份卷宗，修改并保存后会自动同步更新。
                </div>
              )}

              <Field label="当事人">
                <textarea
                  value={draft.parties}
                  onChange={(e) => setDraft({ ...draft, parties: e.target.value })}
                  rows={2}
                  placeholder="如：原告（甲方）某公司；被告（乙方）某店铺"
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
                />
              </Field>

              <Field label="案由">
                <select
                  value={draft.cause}
                  onChange={(e) => setDraft({ ...draft, cause: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
                >
                  <option value="">请选择…</option>
                  {draft.cause && !DOSSIER_CAUSES.includes(draft.cause) && (
                    <option value={draft.cause}>{draft.cause}</option>
                  )}
                  {DOSSIER_CAUSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="核心事实">
                <textarea
                  value={draft.facts}
                  onChange={(e) => setDraft({ ...draft, facts: e.target.value })}
                  rows={4}
                  placeholder="时间线、关键行为、各方主张等"
                  className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
                />
              </Field>

              <Field label="诉讼请求">
                <textarea
                  value={draft.claims}
                  onChange={(e) => setDraft({ ...draft, claims: e.target.value })}
                  rows={3}
                  placeholder="如：停止侵权、赔偿损失 X 元、消除影响"
                  className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
                />
              </Field>

              <Field label="证据清单">
                <textarea
                  value={draft.evidence}
                  onChange={(e) => setDraft({ ...draft, evidence: e.target.value })}
                  rows={4}
                  placeholder="每项一行，可附证明目的，如：&#10;购销合同——证明使用事实&#10;侵权商品照片——证明被诉侵权"
                  className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
                />
              </Field>

              {draft.raw?.trim() && (
                <Field label="原始卷宗材料（自动识别来源，仅供参考）">
                  <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-2 text-[0.74rem] leading-relaxed text-muted-foreground">
                    {draft.raw.length > 2000 ? draft.raw.slice(0, 2000) + '…（已截断）' : draft.raw}
                  </pre>
                </Field>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-border px-4 py-3">
              <button
                onClick={onClose}
                className="rounded-md px-3 py-1.5 text-[0.8rem] text-muted-foreground hover:bg-muted"
              >
                取消
              </button>
              {onReExtract && (
                <button
                  onClick={onReExtract}
                  disabled={busy || !draft.raw?.trim() || draft.raw === IMAGE_DOSSIER_RAW}
                  title={
                    draft.raw === IMAGE_DOSSIER_RAW
                      ? '图片卷宗暂不支持一键重识别，请重新上传图片'
                      : '用 AI 重新识别原始材料，识别结果会覆盖面板中的旧内容'
                  }
                  className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-[0.8rem] text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${busy ? 'animate-pulse' : ''}`} />
                  {busy ? '识别中…' : 'AI 重新识别'}
                </button>
              )}
              <button
                onClick={() => setDraft({ ...EMPTY_DOSSIER })}
                disabled={busy}
                title="清空当前面板中的全部内容，便于粘贴新材料重新识别"
                className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-[0.8rem] text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Eraser className="h-3.5 w-3.5" /> 清空
              </button>
              <button
                onClick={save}
                className="ml-auto flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[0.8rem] text-primary-foreground hover:opacity-90"
              >
                <Check className="h-3.5 w-3.5" /> 保存卷宗
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2 border-b border-border p-3">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索当事人、案由或关键词…"
                  className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-[0.8rem] outline-none focus:border-primary/50"
                />
              </div>
              <button
                onClick={() => uploadRef.current?.click()}
                disabled={busy}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-[0.78rem] text-muted-foreground hover:border-primary/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                上传新材料识别后自动入库
              </button>
              <input
                ref={uploadRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.txt,.md,.doc,.docx"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadFile(f);
                  e.target.value = '';
                }}
              />
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {filtered.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-[0.78rem] text-muted-foreground">
                  {library.length === 0
                    ? '卷宗库还是空的。在下方输入框上传或粘贴案卷材料，识别完成后会自动存入这里。'
                    : '没有匹配的卷宗，换个关键词试试。'}
                </div>
              ) : (
                filtered.map((it) => {
                  const filled = dossierFilled(it.dossier);
                  const isActive = it.id === activeId;
                  return (
                    <div
                      key={it.id}
                      className={`rounded-lg border px-3 py-2.5 transition-colors ${
                        isActive ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {editingId === it.id ? (
                          <input
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => {
                              onRenameSaved(it.id, editingName);
                              setEditingId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onRenameSaved(it.id, editingName);
                                setEditingId(null);
                              }
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="min-w-0 flex-1 rounded border border-primary/40 bg-background px-1.5 py-0.5 text-[0.82rem] font-medium outline-none"
                          />
                        ) : (
                          <span className="min-w-0 flex-1 truncate text-[0.84rem] font-medium text-foreground" title={it.name}>
                            {it.name}
                          </span>
                        )}
                        {isActive && (
                          <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[0.62rem] text-primary-foreground">
                            使用中
                          </span>
                        )}
                      </div>

                      <p className="mt-1 line-clamp-2 text-[0.72rem] leading-relaxed text-muted-foreground">
                        {dossierSummary(it.dossier)}
                      </p>

                      <div className="mt-1.5 flex items-center gap-2 text-[0.68rem] text-muted-foreground">
                        <span className={filled === 5 ? 'text-emerald-600' : filled >= 3 ? 'text-amber-600' : ''}>
                          {filled}/5 项
                        </span>
                        <span>·</span>
                        <span>{relativeWhen(it.updatedAt)}</span>
                      </div>

                      <div className="mt-2 flex items-center gap-1.5">
                        <button
                          onClick={() => onUseSaved(it)}
                          className="rounded-md bg-primary px-2 py-1 text-[0.72rem] text-primary-foreground hover:opacity-90"
                        >
                          {isActive ? '重新启用' : '用于当前对话'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(it.id);
                            setEditingName(it.name);
                          }}
                          title="重命名"
                          className="rounded-md border border-border p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteSaved(it.id)}
                          title="删除"
                          className="rounded-md border border-border p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-border px-4 py-3">
              <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
                启用某份卷宗后，小知在本对话中的回答会始终结合该案卷内容。
              </p>
              <button
                onClick={onClose}
                className="ml-auto shrink-0 rounded-md px-3 py-1.5 text-[0.8rem] text-muted-foreground hover:bg-muted"
              >
                关闭
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-[0.8rem] transition-colors ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[0.76rem] font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}
