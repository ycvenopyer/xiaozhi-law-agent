import { useRef, useState, type KeyboardEvent } from 'react';
import { Paperclip, Send, Square, X, FileText, ScanSearch, Fingerprint, ShieldCheck, FilePenLine, FileSignature } from 'lucide-react';
import type { AttachedFile, ModelInfo } from '@/types/agent';
import { ModelSelector } from './ModelSelector';

import type { WorkbenchMode } from '@/lib/agent-client';
import { workflowNames } from './IpWorkflow';
const icons = { compare: ScanSearch, infringement: Fingerprint, compliance: ShieldCheck, draft: FilePenLine };

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  uploading: boolean;
  onFiles: (files: File[]) => void;
  files: AttachedFile[];
  onRemoveFile: (id: string) => void;
  streaming: boolean;
  disabled?: boolean;
  onWorkflowUpload: () => void;
  onWorkflow: (mode: WorkbenchMode) => void;
  onOpenContract: () => void;
  models: ModelInfo[];
  selectedModel: string;
  onModelChange: (id: string) => void;
  modelsLoading: boolean;
  modelsError: string;
  onRetryModels: () => void;
  onManageCustomModels: () => void;
}

export function ChatInput(props: Props) {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!props.streaming && !props.uploading && !props.disabled) props.onSend();
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pb-5">
      <div
        className={`relative rounded-2xl border bg-card shadow-sm ${dragging ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
        onDragOver={event => {
          if (!event.dataTransfer.types.includes('Files')) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = props.disabled ? 'none' : 'copy';
          setDragging(!props.disabled);
        }}
        onDragLeave={event => {
          if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) setDragging(false);
        }}
        onDrop={event => {
          if (!event.dataTransfer.types.includes('Files')) return;
          event.preventDefault();
          setDragging(false);
          if (!props.disabled) props.onFiles(Array.from(event.dataTransfer.files));
        }}
        onPaste={event => {
          const data = event.clipboardData;
          const files = data.files.length ? Array.from(data.files) : Array.from(data.items)
            .filter(item => item.kind === 'file').map(item => item.getAsFile()).filter((file): file is File => file !== null);
          if (!files.length) return;
          event.preventDefault();
          if (!props.disabled) props.onFiles(files);
        }}
      >
        {dragging && <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl bg-card/95 text-sm text-primary">松开即可添加附件</div>}

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
                    aria-label={`移除 ${f.name}`}
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
                    aria-label={`移除 ${f.name}`}
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
            disabled={props.disabled}
            title="添加图片或文件（支持拖入或粘贴）"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button type="button" onClick={props.onWorkflowUpload} disabled={props.disabled}
            className="flex h-9 items-center gap-1 rounded-lg border border-primary/30 px-2 text-[0.78rem] text-primary hover:bg-muted disabled:opacity-40">
            <FileText className="size-3.5" />上传文件填表
          </button>
          {(Object.keys(icons) as WorkbenchMode[]).map(mode => {
            const Icon = icons[mode];
            return <button key={mode} disabled={props.disabled} onClick={() => props.onWorkflow(mode)}
              className="flex h-9 items-center gap-1 rounded-lg border border-border px-2 text-[0.78rem] text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-40">
              <Icon className="size-3.5" />{workflowNames[mode]}
            </button>;
          })}
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
            ref={fileRef}
            type="file"
            className="hidden"
            multiple
            accept="image/png,image/jpeg,image/webp,.pdf,.txt,.md,.markdown,.csv,.doc,.docx"
            onChange={(e) => {
              if (e.target.files) props.onFiles(Array.from(e.target.files));
              e.target.value = '';
            }}
          />
        </div>

        <div className="px-3 pb-1 pt-2">
          <textarea
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            onKeyDown={handleKey}
            rows={2}
            placeholder="描述你的问题，或上传材料让小知帮你分析…"
            className="max-h-40 min-h-[3rem] w-full resize-none bg-transparent px-1 py-2 text-[length:var(--font-size-body)] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center justify-end gap-2 px-3 pb-3">
          <ModelSelector models={props.models} value={props.selectedModel} onChange={props.onModelChange} loading={props.modelsLoading} error={props.modelsError} onRetry={props.onRetryModels} onManageCustom={props.onManageCustomModels} disabled={props.streaming} />
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
              disabled={props.disabled || props.uploading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
              title="发送"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-1.5 text-center text-[0.7rem] text-muted-foreground">
        <span role="status">{props.uploading ? '正在添加附件…' : '可拖入或粘贴附件'}</span> · Enter 发送 · Shift+Enter 换行 · 内容由 AI 生成，请自行核实
      </p>
    </div>
  );
}
