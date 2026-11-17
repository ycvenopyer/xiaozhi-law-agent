import { useState, useRef, type KeyboardEvent } from 'react';
import { Paperclip, Send, Square, X, FileText, FolderUp, Layers3 } from 'lucide-react';
import type { AttachedFile, ModelInfo } from '@/types/agent';
import { findSkill } from '@/lib/skills';
import { SkillIcon } from './SkillPanel';
import { ModelSelector } from './ModelSelector';

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
  onOpenSkills: () => void;
  skillId?: string;
  onClearSkill: () => void;
  onDossierFile: (input: File | { text: string; name?: string }) => void;
  dossierBusy?: boolean;
  models: ModelInfo[];
  selectedModel: string;
  onModelChange: (id: string) => void;
  modelsLoading: boolean;
  modelsError: string;
  onRetryModels: () => void;
}

export function ChatInput(props: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dossierRef = useRef<HTMLInputElement>(null);
  const [dossierPopover, setDossierPopover] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const dossierPasteRef = useRef<HTMLTextAreaElement>(null);

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!props.streaming) props.onSend();
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-5">
      <div className="relative rounded-2xl border border-border bg-card shadow-sm">
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
          <button onClick={props.onOpenSkills} disabled={props.streaming} className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 px-3 text-[0.78rem] font-medium text-primary hover:bg-primary/10 disabled:opacity-40" title="选择 Skill，也可输入 /skills">
            <Layers3 className="h-3.5 w-3.5" />Skills
          </button>
          {props.skillId && <span className="flex min-w-0 items-center gap-1.5 rounded-lg bg-muted px-2 py-1.5 text-xs">
            <SkillIcon id={props.skillId} className="h-3 w-3 text-primary" />
            本次 · {findSkill(props.skillId)?.name}
            <button onClick={props.onClearSkill} disabled={props.streaming} aria-label="取消本次技能" className="rounded p-0.5 hover:bg-background"><X className="h-3 w-3" /></button>
          </span>}
          <button
            onClick={() => fileRef.current?.click()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            title="上传文档"
          >
            <Paperclip className="h-4 w-4" />
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
        <div className="px-3 pb-1 pt-2">
          <textarea
            ref={taRef}
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            onKeyDown={handleKey}
            rows={2}
            placeholder={props.skillId ? '补充任务条件，可附上材料后发送…' : '描述你的任务，输入 /skills 选择技能，或上传材料…'}
            className="max-h-40 min-h-[3rem] w-full resize-none bg-transparent px-1 py-2 text-[0.95rem] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center justify-end gap-2 px-3 pb-3">
          <ModelSelector models={props.models} value={props.selectedModel} onChange={props.onModelChange} loading={props.modelsLoading} error={props.modelsError} onRetry={props.onRetryModels} disabled={props.streaming || props.dossierBusy} />
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
