import { useState, useRef, type KeyboardEvent } from 'react';
import { Paperclip, Send, Square, X, FileText, Scale, Gavel, FolderUp, FileSignature } from 'lucide-react';
import type { AttachedFile } from '@/types/agent';

export type RetrieveMode = 'law' | 'case';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  onFiles: (files: FileList) => void;
  files: AttachedFile[];
  onRemoveFile: (id: string) => void;
  streaming: boolean;
  disabled?: boolean;
  onRetrieve: (
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
  ) => void;
  onDossierFile: (input: File | { text: string; name?: string }) => void;
  dossierBusy?: boolean;
  onOpenContract?: () => void;
}

export function ChatInput(props: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dossierRef = useRef<HTMLInputElement>(null);
  const kwRef = useRef<HTMLInputElement>(null);
  const [popover, setPopover] = useState<RetrieveMode | null>(null);
  const [depth, setDepth] = useState<'fast' | 'deep'>('fast');
  const [keyword, setKeyword] = useState('');
  const [code, setCode] = useState('');
  const [article, setArticle] = useState('');
  const [cause, setCause] = useState('');
  const [caseType, setCaseType] = useState('');
  const [procedure, setProcedure] = useState('');
  const [courtLevel, setCourtLevel] = useState('');
  const [year, setYear] = useState('');
  const [dossierPopover, setDossierPopover] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const dossierPasteRef = useRef<HTMLTextAreaElement>(null);

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!props.streaming) props.onSend();
    }
  }

  function openPopover(mode: RetrieveMode) {
    if (props.streaming) return;
    setKeyword('');
    setCode('');
    setArticle('');
    setCause('');
    setCaseType('');
    setProcedure('');
    setCourtLevel('');
    setYear('');
    setPopover(mode);
    setTimeout(() => kwRef.current?.focus(), 30);
  }

  function confirmRetrieve() {
    const mode = popover!;
    if (mode === 'law') {
      if (!keyword.trim() && !code.trim() && !article.trim()) {
        kwRef.current?.focus();
        return;
      }
    } else if (!keyword.trim() && !cause.trim()) {
      kwRef.current?.focus();
      return;
    }
    setPopover(null);
    props.onRetrieve(mode, {
      keyword: keyword.trim(),
      code: code.trim(),
      article: article.trim(),
      cause: cause.trim(),
      caseType: caseType.trim(),
      procedure: procedure.trim(),
      courtLevel: courtLevel.trim(),
      year: year.trim(),
      depth,
    });
    setKeyword('');
    setCode('');
    setArticle('');
    setCause('');
    setCaseType('');
    setProcedure('');
    setCourtLevel('');
    setYear('');
  }

  const popoverMeta =
    popover === 'case'
      ? { title: '检索类似案例', subtitle: '参考裁判文书网：案由 / 类型 / 程序 / 法院层级', placeholder: '主题关键词，如：商标侵权、包装装潢权益', icon: <Gavel className="h-4 w-4" /> }
      : { title: '检索法条', subtitle: '可按法典名称与条文序号精准检索', placeholder: '主题关键词，如：商标侵权赔偿、合理使用', icon: <Scale className="h-4 w-4" /> };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-5">
      <div className="relative rounded-2xl border border-border bg-card shadow-sm">
        {/* 检索弹窗 */}
        {popover && (
          <div className="absolute bottom-full left-0 mb-2 w-full max-w-md rounded-xl border border-primary/40 bg-card p-3 shadow-lg">
            <div className="mb-0.5 flex items-center gap-1.5 text-[0.82rem] font-medium text-foreground">
              {popoverMeta.icon}
              {popoverMeta.title}
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[0.72rem] text-muted-foreground">{popoverMeta.subtitle}</span>
              <div className="ml-auto flex items-center rounded-md border border-border p-0.5">
                <button
                  onClick={() => setDepth('fast')}
                  title="优先用知识库直接作答，最多1次简要核实，速度快"
                  className={`rounded px-2 py-0.5 text-[0.7rem] transition ${
                    depth === 'fast'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  快速
                </button>
                <button
                  onClick={() => setDepth('deep')}
                  title="联网检索权威来源并附链接，更全面但更慢"
                  className={`rounded px-2 py-0.5 text-[0.7rem] transition ${
                    depth === 'deep'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  深度
                </button>
              </div>
            </div>

            {popover === 'law' && (
              <div className="mb-2 grid grid-cols-2 gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="法典名称，如：商标法"
                  className="rounded-md border border-border bg-background px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
                />
                <input
                  value={article}
                  onChange={(e) => setArticle(e.target.value)}
                  placeholder="条文序号，如：第57条"
                  className="rounded-md border border-border bg-background px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
                />
              </div>
            )}

            {popover === 'case' && (
              <div className="mb-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={caseType}
                    onChange={(e) => setCaseType(e.target.value)}
                    className="rounded-md border border-border bg-background px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
                  >
                    <option value="">案件类型（不限）</option>
                    <option value="民事案件">民事案件</option>
                    <option value="刑事案件">刑事案件</option>
                    <option value="行政案件">行政案件</option>
                    <option value="执行案件">执行案件</option>
                    <option value="赔偿案件">赔偿案件</option>
                  </select>
                  <select
                    value={procedure}
                    onChange={(e) => setProcedure(e.target.value)}
                    className="rounded-md border border-border bg-background px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
                  >
                    <option value="">审判程序（不限）</option>
                    <option value="一审">一审</option>
                    <option value="二审">二审</option>
                    <option value="再审">再审</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={cause}
                    onChange={(e) => setCause(e.target.value)}
                    placeholder="案由，如：商标权纠纷"
                    className="rounded-md border border-border bg-background px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
                  />
                  <select
                    value={courtLevel}
                    onChange={(e) => setCourtLevel(e.target.value)}
                    className="rounded-md border border-border bg-background px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
                  >
                    <option value="">法院层级（不限）</option>
                    <option value="基层人民法院">基层人民法院</option>
                    <option value="中级人民法院">中级人民法院</option>
                    <option value="高级人民法院">高级人民法院</option>
                    <option value="最高人民法院">最高人民法院</option>
                  </select>
                </div>
                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="裁判年份，如：2023（可选）"
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
                />
              </div>
            )}

            <div className="flex gap-2">
              <input
                ref={kwRef}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmRetrieve();
                  }
                }}
                placeholder={popoverMeta.placeholder}
                className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-[0.85rem] outline-none focus:border-primary/50"
              />
              <button
                onClick={confirmRetrieve}
                className="rounded-md bg-primary px-3 py-1.5 text-[0.8rem] text-primary-foreground hover:opacity-90"
              >
                检索
              </button>
              <button
                onClick={() => setPopover(null)}
                className="rounded-md px-2 py-1.5 text-[0.8rem] text-muted-foreground hover:bg-muted"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {props.files.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {props.files.map((f) =>
              f.kind === 'image' && f.dataUrl ? (
                <div
                  key={f.id}
                  className="relative flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1"
                >
                  <img
                    src={f.dataUrl}
                    alt={f.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                  <span className="max-w-[120px] truncate text-[0.78rem]">{f.name}</span>
                  <button
                    onClick={() => props.onRemoveFile(f.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div
                  key={f.id}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-[0.78rem]"
                >
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span className="max-w-[160px] truncate">{f.name}</span>
                  <span className="text-muted-foreground">{Math.round(f.size / 1024)}KB</span>
                  <button
                    onClick={() => props.onRemoveFile(f.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )
            )}
          </div>
        )}
        {/* 辅助功能按钮行 */}
        <div className="flex flex-wrap items-center gap-2 px-3 pt-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            title="上传文档"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            onClick={() => openPopover('law')}
            disabled={props.streaming}
            className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-border px-2 text-[0.78rem] text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-40"
            title="检索相关法条"
          >
            <Scale className="h-3.5 w-3.5" />
            检索法条
          </button>
          <button
            onClick={() => openPopover('case')}
            disabled={props.streaming}
            className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-border px-2 text-[0.78rem] text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-40"
            title="检索类似案例"
          >
            <Gavel className="h-3.5 w-3.5" />
            检索案例
          </button>
          <button
            onClick={() => {
              if (props.streaming || props.dossierBusy) return;
              setDossierPopover(true);
              setTimeout(() => dossierPasteRef.current?.focus(), 30);
            }}
            disabled={props.streaming || props.dossierBusy}
            className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-border px-2 text-[0.78rem] text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-40"
            title="上传卷宗或粘贴文本，自动识别到卷宗面板"
          >
            <FolderUp className="h-3.5 w-3.5" />
            {props.dossierBusy ? '识别中…' : '卷宗上传'}
          </button>
          <button
            onClick={() => props.onOpenContract?.()}
            disabled={props.streaming}
            className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-border px-2 text-[0.78rem] text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-40"
            title="起草与审查合同"
          >
            <FileSignature className="h-3.5 w-3.5" />
            合同起草（审核）
          </button>
          <input
            ref={dossierRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.txt,.md,.doc,.docx"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) props.onDossierFile(f);
              e.target.value = '';
            }}
          />
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*,.pdf,.txt,.md,.doc,.docx"
            onChange={(e) => {
              if (e.target.files) props.onFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {/* 卷宗上传弹窗(上传文档/粘贴文本) */}
        {dossierPopover && (
          <div className="absolute bottom-full left-2 right-2 mb-2 rounded-xl border border-primary/40 bg-card p-3 shadow-lg">
            <div className="mb-2 flex items-center gap-1.5 text-[0.82rem] font-medium text-foreground">
              <FolderUp className="h-4 w-4" />
              卷宗上传 · 上传文档或粘贴文本
            </div>
            <div className="mb-2 flex flex-wrap gap-2">
              <button
                onClick={() => dossierRef.current?.click()}
                disabled={props.dossierBusy}
                className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[0.78rem] text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-40"
              >
                <FolderUp className="h-3.5 w-3.5" />
                选择文件
              </button>
              <span className="ml-auto text-[0.68rem] text-muted-foreground">
                支持 pdf / word / txt / md / 图片
              </span>
            </div>
            <textarea
              ref={dossierPasteRef}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={5}
              placeholder="或在此粘贴卷宗文本（合同/起诉状/答辩状/聊天记录/会议纪要等）…"
              className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => {
                  setDossierPopover(false);
                  setPastedText('');
                }}
                className="rounded-md px-2 py-1.5 text-[0.8rem] text-muted-foreground hover:bg-muted"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const txt = pastedText.trim();
                  if (!txt) {
                    dossierPasteRef.current?.focus();
                    return;
                  }
                  props.onDossierFile({ text: txt, name: '粘贴的卷宗文本' });
                  setDossierPopover(false);
                  setPastedText('');
                }}
                disabled={props.dossierBusy || !pastedText.trim()}
                className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[0.8rem] text-primary-foreground hover:opacity-90 disabled:opacity-40"
              >
                识别并填入卷宗面板
              </button>
            </div>
          </div>
        )}

        {/* 输入框行 */}
        <div className="flex items-end gap-2 p-2.5">
          <textarea
            ref={taRef}
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            onKeyDown={handleKey}
            rows={2}
            placeholder="给助理发消息，或上传文档让它帮你分析…"
            className="max-h-40 min-h-[3rem] flex-1 resize-none bg-transparent px-1 py-2 text-[0.95rem] outline-none placeholder:text-muted-foreground"
          />
          {props.streaming ? (
            <button
              onClick={props.onStop}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive text-destructive-foreground hover:opacity-90"
              title="停止生成"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={props.onSend}
              disabled={props.disabled}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
              title="发送"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-1.5 text-center text-[0.7rem] text-muted-foreground">
        Enter 发送 · Shift+Enter 换行 · 内容由 AI 生成，请自行核实
      </p>
    </div>
  );
}
