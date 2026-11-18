import { authHeaders } from './cloudbase';
import { fileToImageDataUrl } from './image-file';
import type { CustomModelRequest } from './custom-models';
import type { WorkflowMode, WorkflowPrefill } from '../../../shared/workflow-fields.mjs';

async function readPdf(file: File, signal: AbortSignal, images: string[]) {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const job = pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false });
  const abort = () => { void job.destroy(); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    signal.throwIfAborted();
    const pdf = await job.promise;
    let text = '';
    for (let n = 1; n <= pdf.numPages; n++) {
      signal.throwIfAborted();
      const page = await pdf.getPage(n);
      const layer = await page.getTextContent();
      const words = layer.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').trim();
      if (words) text += '\n第 ' + n + ' 页\n' + words;
      else {
        if (images.length >= 8) throw new Error('一次可识别 8 张图片或扫描页，请拆分材料。');
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(2, 1600 / Math.max(base.width, base.height)) });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('无法读取 PDF 扫描页。');
        await page.render({ canvasContext: ctx, viewport }).promise;
        images.push(canvas.toDataURL('image/jpeg', 0.8));
        text += '\n第 ' + n + ' 页见图片 ' + images.length;
      }
      page.cleanup();
      if (text.length > 40000) throw new Error('材料超过 4 万字，请拆分文件。');
    }
    return text;
  } finally {
    signal.removeEventListener('abort', abort);
    await job.destroy();
  }
}

export async function importWorkflow(files: File[], mode: WorkflowMode, model: string,
  customModel: CustomModelRequest | undefined, signal: AbortSignal): Promise<WorkflowPrefill> {
  const images: string[] = [];
  const parts: string[] = [];
  const headers = await authHeaders();
  for (const file of files) {
    signal.throwIfAborted();
    if (file.size > 4 * 1024 * 1024) throw new Error(file.name + ' 超过 4 MiB，请压缩或拆分。');
    let text: string;
    if (/\.pdf$/i.test(file.name)) text = await readPdf(file, signal, images);
    else if (file.type.startsWith('image/')) {
      if (images.length >= 8) throw new Error('一次可识别 8 张图片或扫描页，请拆分材料。');
      images.push(await fileToImageDataUrl(file));
      text = '见图片 ' + images.length;
    } else {
      if (!/\.(docx?|txt|md|markdown)$/i.test(file.name)) throw new Error('不支持此文件格式：' + file.name);
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/agent/files', { method: 'POST', headers, body: form, signal });
      if (!res.ok) throw new Error(file.name + ' 解析失败。');
      const parsed = await res.json();
      if (parsed.truncated) throw new Error(file.name + ' 超过 4 万字，请拆分文件。');
      text = parsed.text.trim();
      if (!text || text.startsWith('（无法从该')) throw new Error(file.name + ' 没有可解析的正文，请检查文件。');
    }
    parts.push('【' + file.name + '】\n' + text);
  }
  const text = parts.join('\n\n');
  const body = JSON.stringify({ model, customModel, mode, text, images });
  if (text.length > 40000 || new Blob([body]).size > 5 * 1024 * 1024) throw new Error('材料总量过大，请拆分后导入。');
  const res = await fetch('/api/agent/prefill', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body, signal });
  const result = await res.json().catch(() => null);
  if (!res.ok || !result?.values) throw new Error(result?.message || '文件识别失败，请重试。');
  return result;
}
