import { useState } from 'react';
import { Copy, Download } from 'lucide-react';
import { downloadReport } from '@/lib/report-export';
import { Markdown } from './Markdown';

export function ReportDownloads({ title, report, busy, copy }: { title: string; report: string; busy?: boolean; copy?: boolean }) {
  const [error, setError] = useState('');
  const [copiedReport, setCopiedReport] = useState('');

  async function save(format: 'md' | 'docx') {
    setError('');
    try {
      await downloadReport(title, report, format);
    } catch {
      setError('导出失败，请重试。');
    }
  }

  async function copyReport() {
    setError('');
    try {
      await navigator.clipboard.writeText(report);
      setCopiedReport(report);
    } catch {
      setError('复制失败，请重试。');
    }
  }

  return (
    <div>
      <div className="mt-2 flex flex-wrap gap-2">
        {copy && <button type="button" disabled={busy} onClick={() => void copyReport()}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted disabled:opacity-45">
          <Copy className="size-3.5" />{copiedReport === report ? '已复制' : '复制'}
        </button>}
        {(['md', 'docx'] as const).map(format => (
          <button key={format} type="button" disabled={busy} onClick={() => void save(format)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted disabled:opacity-45">
            <Download className="size-3.5" />导出 {format === 'md' ? 'Markdown' : 'Word'}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ReportPreview({ title, report, busy, copy }: { title: string; report: string; busy?: boolean; copy?: boolean }) {
  return (
    <section aria-label="生成结果" className="rounded-xl border border-border bg-card p-3 text-sm">
      <Markdown content={report} />
      <div className="mt-3 border-t border-border">
        <ReportDownloads title={title} report={report} busy={busy} copy={copy} />
      </div>
    </section>
  );
}
