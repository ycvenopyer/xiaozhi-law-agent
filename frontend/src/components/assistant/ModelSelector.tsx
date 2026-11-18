import { Bot, Check, ChevronDown, Image, Loader2, RefreshCw, SlidersHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ModelInfo } from '@/types/agent';

interface Props {
  models: ModelInfo[];
  value: string;
  onChange: (id: string) => void;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onManageCustom: () => void;
  disabled?: boolean;
}

function providerName(model: ModelInfo) {
  return model.provider || (model.id.startsWith('zhipu-') ? '智谱 AI' : model.id.startsWith('sf-') ? 'SiliconFlow' : 'OpenRouter');
}

export function ModelSelector({ models, value, onChange, loading, error, onRetry, onManageCustom, disabled }: Props) {
  const selected = models.find(model => model.id === value);
  const groups = [...new Set(models.map(providerName))];
  const label = loading ? '加载模型…' : selected?.label || '选择模型';
  return <DropdownMenu modal={false}>
    <DropdownMenuTrigger asChild>
      <button type="button" disabled={disabled} aria-label={`切换模型：${label}`} className="group flex h-9 min-w-0 max-w-[calc(100%-3rem)] items-center gap-2 rounded-xl border border-border bg-background px-3 text-[0.78rem] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50" title={selected && !selected.available ? '该模型缺少平台 API Key' : label}>
        {loading ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" /> : <Bot className="h-3.5 w-3.5 shrink-0 text-primary" />}
        <span className="truncate">{label}</span>
        {selected?.vision && <Image aria-label="支持图片" className="h-3 w-3 shrink-0 text-muted-foreground" />}
        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent side="top" align="end" sideOffset={10} collisionPadding={16} className="w-[min(340px,calc(100vw-2rem))] rounded-2xl p-2 shadow-xl" aria-label="模型选择">
      <DropdownMenuLabel className="flex items-center justify-between px-2.5 py-2 text-xs"><span>选择模型</span><span className="font-normal text-muted-foreground">{models.filter(model => model.available).length} 个已配置</span></DropdownMenuLabel>
      <DropdownMenuSeparator className="mx-0" />
      {loading && <div role="status" className="flex items-center gap-2 px-3 py-5 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />正在加载模型列表…</div>}
      {error && <>
        <p role="alert" className="px-3 py-2 text-xs leading-relaxed text-destructive">{error}</p>
        <DropdownMenuItem onSelect={onRetry} className="cursor-pointer rounded-lg"><RefreshCw />重新加载</DropdownMenuItem>
      </>}
      <DropdownMenuRadioGroup value={value} onValueChange={onChange} className="max-h-[min(420px,55dvh)] overflow-y-auto">
        {groups.map(group => <div key={group}>
          <DropdownMenuLabel className="px-2.5 pb-1 pt-3 text-[0.68rem] font-normal tracking-wide text-muted-foreground">{group}</DropdownMenuLabel>
          {models.filter(model => providerName(model) === group).map(model => <DropdownMenuRadioItem key={model.id} value={model.id} disabled={!model.available} title={model.available ? model.label : `${group} 尚未配置 API Key`} className={`my-0.5 cursor-pointer rounded-lg py-2.5 pl-8 pr-2.5 text-[0.8rem] ${value === model.id ? 'bg-primary/8 text-primary' : ''}`}>
            <span className="min-w-0 flex-1 truncate">{model.label}</span>
            {!model.available ? <span className="shrink-0 text-[0.65rem] text-muted-foreground">缺少 Key</span> : <>
              {model.vision && <span className="flex shrink-0 items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[0.62rem] text-muted-foreground"><Image className="size-3" />图片</span>}
              {value === model.id && <Check className="size-3.5 shrink-0 text-primary" />}
            </>}
          </DropdownMenuRadioItem>)}
        </div>)}
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator className="mx-0" />
      <DropdownMenuItem onSelect={onManageCustom} className="cursor-pointer rounded-lg py-2.5"><SlidersHorizontal />自定义模型</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
