import { useState } from 'react';
import { Calculator, Clock, Globe, Wrench, Copyright, ChevronDown, Loader2 } from 'lucide-react';
import type { ToolCallView } from '@/types/agent';
import { TOOL_META } from '@/types/agent';

const ICONS: Record<string, typeof Calculator> = {
  Calculator,
  Clock,
  Globe,
  Wrench,
  Copyright,
};

function ToolIcon({ name }: { name: string }) {
  const meta = TOOL_META[name];
  const Icon = ICONS[meta?.icon] ?? Wrench;
  return <Icon className="h-3.5 w-3.5" />;
}

export function ToolCallCard({ tool }: { tool: ToolCallView }) {
  const [open, setOpen] = useState(false);
  const meta = TOOL_META[tool.name];
  const label = meta?.label ?? tool.name;
  const tone = meta?.tone ?? 'text-muted-foreground';
  const running = tool.status === 'running';

  try {
    JSON.parse(tool.arguments || '{}');
  } catch {
    /* arguments may be streamed partially — ignore */
  }

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/40 text-[0.82rem]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span className={`flex h-5 w-5 items-center justify-center rounded bg-background ${tone}`}>
          <ToolIcon name={tool.name} />
        </span>
        <span className={`font-medium ${tone}`}>{label}</span>
        {running ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <span className="text-[0.72rem] opacity-70">已完成</span>
        )}
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-border px-3 py-2 text-foreground">
          <div className="mb-1 text-[0.7rem] uppercase tracking-wide opacity-60">参数</div>
          <pre className="mb-2 whitespace-pre-wrap break-words font-mono text-[0.78rem]">
            {tool.arguments || '{}'}
          </pre>
          {tool.result != null && (
            <>
              <div className="mb-1 text-[0.7rem] uppercase tracking-wide opacity-60">结果</div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[0.78rem]">
                {tool.result}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
