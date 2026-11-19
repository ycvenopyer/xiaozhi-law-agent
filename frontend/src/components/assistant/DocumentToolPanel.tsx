import { useState, type FormEvent } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { documentAccept, documentMaxChars, translationLanguages, type DocumentTool, type TranslationLanguage } from '../../../../shared/document-tools.mjs';
import { uploadFile, type WorkbenchGenerate } from '@/lib/agent-client';
import { getPrivacy } from '@/lib/cloud-store';
import type { AttachedFile } from '@/types/agent';
import { ReportPreview } from './ReportPreview';

const documentExtensions = new Set(documentAccept.split(','));
const field = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none';

export function DocumentToolPanel({ name, onGenerate }: { name: DocumentTool['name']; onGenerate: WorkbenchGenerate }) {
  const parse = name === 'file_parse';
  const title = parse ? '文档解析' : '专业翻译';
  const [target, setTarget] = useState<TranslationLanguage>('en');
  const [source, setSource] = useState<'file' | 'text'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<AttachedFile | null>(null);
  const [text, setText] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [report, setReport] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ready = source === 'file' ? Boolean(file) : Boolean(text.trim());

  function selectFile(next: File | null) {
    const extension = /\.[a-z]+$/i.exec(next?.name || '')?.[0].toLowerCase();
    const invalid = !!next && (!extension || !documentExtensions.has(extension));
    setFile(invalid ? null : next);
    setUploaded(null);
    setError(invalid ? '请选择 PDF、Word、TXT 或 Markdown 文件。' : '');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !ready || !confirmed) return;
    if (!getPrivacy()) {
      setError('请先在「设置 → 账号与隐私」允许第三方模型处理资料。');
      return;
    }
    setBusy(true);
    setError('');
    setReport('');
    try {
      let attachment: AttachedFile | undefined;
      if (source === 'file' && file) {
        attachment = uploaded || await uploadFile(file);
        setUploaded(attachment);
        if (attachment.truncated) throw new Error('正文超过 4 万字，请拆分文件后重试。');
        if (!attachment.text.trim() || attachment.text.startsWith('（无法从该')) {
          throw new Error('文件没有可读正文。扫描版 PDF 请先做 OCR，再上传文字版或粘贴正文。');
        }
      }
      const tool = parse ? { name } as const : { name, targetLanguage: target } as const;
      const result = await onGenerate(attachment ? '' : text.trim(), setReport, {
        documentTool: tool,
        files: attachment ? [attachment] : undefined,
        title: attachment ? title + ' · ' + attachment.name : title + (parse ? '' : ' · ' + translationLanguages[target]),
      });
      setReport(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '处理失败，请重试。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={event => void submit(event)} className="space-y-4">
      <header className="rounded-xl border border-border bg-primary/[0.04] p-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{parse
          ? '提取当事人、案号、裁判要旨、金额、引用法条和关键日期，并附可核对的原文。'
          : '保留条款和权利要求编号，使用内置知产术语处理 PCT、马德里商标和外文合同。'}</p>
      </header>
      <fieldset disabled={busy} className="space-y-3">
        {!parse && <label className="grid gap-1.5 text-sm">
          目标语言
          <select className={field} value={target} onChange={event => setTarget(event.target.value as TranslationLanguage)}>
            {Object.entries(translationLanguages).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>}
        <fieldset className="flex gap-4 text-sm">
          <legend className="mb-1.5">材料来源</legend>
          <label className="flex items-center gap-1.5"><input type="radio" checked={source === 'file'} onChange={() => setSource('file')} />上传文件</label>
          <label className="flex items-center gap-1.5"><input type="radio" checked={source === 'text'} onChange={() => setSource('text')} />粘贴正文</label>
        </fieldset>
        {source === 'file' ? <label className="grid gap-2 rounded-xl border border-dashed border-border p-4 text-sm">
          选择文档
          <input type="file" accept={documentAccept} onChange={event => selectFile(event.target.files?.[0] || null)}
            className="max-w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:py-1.5 file:text-foreground" />
          <span className="text-xs text-muted-foreground">{file?.name || 'PDF、Word、TXT、Markdown · 每个文件最多 4 MiB、4 万字'}</span>
        </label> : <label className="grid gap-1.5 text-sm">
          原文
          <textarea className={field} rows={7} maxLength={documentMaxChars} value={text}
            onChange={event => setText(event.target.value)} placeholder="粘贴已脱敏的正文" />
        </label>}
        <label className="flex items-start gap-2 text-xs leading-5">
          <input type="checkbox" className="mt-1" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
          我已脱敏，同意将本次材料交给所选模型并保存至当前账号的对话历史。
        </label>
        <button disabled={!ready || !confirmed}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-45">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
          {busy ? '正在处理…' : parse ? '解析文档' : '生成译文'}
        </button>
      </fieldset>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {report && <ReportPreview title={title} report={report} busy={busy} />}
    </form>
  );
}
