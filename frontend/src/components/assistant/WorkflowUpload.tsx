import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { workflowNames } from './IpWorkflow';
import { importWorkflow } from '@/lib/workflow-import';
import { getPrivacy } from '@/lib/cloud-store';
import type { CustomModelRequest } from '@/lib/custom-models';
import type { WorkflowMode, WorkflowPrefill } from '../../../../shared/workflow-fields.mjs';

interface Props {
  model: string;
  modelRequest: () => CustomModelRequest | undefined;
  onClose: () => void;
  onImport: (mode: WorkflowMode, result: WorkflowPrefill, source: string) => void;
}

export function WorkflowUpload({ model, modelRequest, onClose, onImport }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState<WorkflowMode | null>(null);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function open(mode: WorkflowMode) {
    if (!files.length || request.current) return;
    if (!getPrivacy()) { setError('请先在「设置 → 账号与隐私」允许第三方模型处理资料。'); return; }
    const controller = new AbortController();
    request.current = controller;
    setBusy(mode);
    setError('');
    try {
      const result = await importWorkflow(files, mode, model, modelRequest(), controller.signal);
      if (!controller.signal.aborted) onImport(mode, result, files.map(file => file.name).join('、'));
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '解析失败，请重试。');
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(null);
    }
  }

  return <Dialog open onOpenChange={open => { if (!open) { request.current?.abort(); onClose(); } }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto">
      <DialogTitle>上传文件填表</DialogTitle>
      <DialogDescription>选择本地材料，再选择用途。所选模型将读取文件，填入对应表单并替换该功能的当前草稿。</DialogDescription>
      <label className="grid gap-2 rounded-xl border border-dashed border-border p-4 text-sm">
        选择文件
        <input type="file" multiple disabled={!!busy} accept=".pdf,.doc,.docx,.txt,.md,.markdown,image/*"
          onChange={e => { setFiles(Array.from(e.target.files || [])); setError(''); }} />
        <span className="text-xs text-muted-foreground">支持 PDF、Word、TXT、Markdown 和图片，每个文件最多 4 MiB。图片和扫描页需要视觉模型。</span>
      </label>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(workflowNames) as WorkflowMode[]).map(mode => <button key={mode} type="button"
          disabled={!files.length || !!busy} onClick={() => void open(mode)}
          className="rounded-lg border p-3 text-sm hover:border-primary hover:text-primary disabled:opacity-50">
          {workflowNames[mode]}
        </button>)}
      </div>
      {busy && <p role="status" className="text-sm">正在为「{workflowNames[busy]}」识别材料…</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </DialogContent>
  </Dialog>;
}
