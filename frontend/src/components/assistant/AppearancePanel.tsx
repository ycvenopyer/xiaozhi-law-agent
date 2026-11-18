import { useRef, useState } from 'react';
import { RotateCcw, Upload } from 'lucide-react';
import {
  COLOR_PRESETS,
  type Appearance,
  CHINESE_FONTS, ENGLISH_FONTS, DEFAULT_APPEARANCE,
  type Radius,
  type ChatWidth,
  type SidebarSide,
} from '@/lib/appearance';

const AVATAR_PRESETS: { id: string; name: string; src: string }[] = [
  { id: 'xiaomei', name: '默认', src: '/xiaomei-avatar.png' },
  { id: 'xiaozhi', name: '男', src: '/xiaozhi-avatar.png' },
];

interface Props {
  value: Appearance;
  onChange: (a: Appearance) => void;
}

const RADIUS_OPTIONS: { id: Radius; name: string }[] = [
  { id: 'square', name: '直角' },
  { id: 'round', name: '圆润' },
  { id: 'pill', name: '胶囊' },
];
const CHAT_WIDTH_OPTIONS: { id: ChatWidth; name: string }[] = [
  { id: 'narrow', name: '窄' },
  { id: 'standard', name: '标准' },
  { id: 'wide', name: '宽' },
];
const SIDEBAR_OPTIONS: { id: SidebarSide; name: string }[] = [
  { id: 'left', name: '左侧' },
  { id: 'right', name: '右侧' },
];

export function AppearancePanel({ value, onChange }: Props) {
  function set(patch: Partial<Appearance>) {
    onChange({ ...value, ...patch });
  }

  const [typedSize, setTypedSize] = useState<string | null>(null);
  function commitSize() {
    if (typedSize && Number.isFinite(Number(typedSize))) {
      set({ fontSize: Math.max(1, Math.min(48, Math.round(Number(typedSize)))) });
    }
    setTypedSize(null);
  }

  const fileRef = useRef<HTMLInputElement>(null);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') set({ avatar: reader.result });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div className="space-y-5">
    <p className="text-[0.74rem] leading-relaxed text-muted-foreground">
      自由调整配色、明暗、字号与圆角，所有设置会自动保存到本机浏览器，刷新后保留。
    </p>

    {/* 配色方案 */}
    <Section title="配色方案">
      <div className="grid grid-cols-3 gap-2">
        {COLOR_PRESETS.map((p) => {
          const active = value.preset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => set({ preset: p.id, customColor: p.hex })}
              className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 transition ${
                active ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/40'
              }`}
            >
              <span className="h-7 w-7 rounded-full" style={{ background: p.hex }} />
              <span className="text-[0.72rem] text-foreground">{p.name}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[0.74rem] text-muted-foreground">自定义颜色</span>
        <input
          type="color"
          value={value.customColor}
          onChange={(e) => set({ preset: 'custom', customColor: e.target.value })}
          className="h-7 w-10 cursor-pointer rounded border border-border bg-background"
        />
        <span className="ml-auto font-mono text-[0.72rem] text-muted-foreground">
          {value.customColor}
        </span>
      </div>
    </Section>

    {/* 明暗模式 */}
    <Section title="明暗模式">
      <Segmented
        options={[
          { id: 'light', name: '浅色' },
          { id: 'dark', name: '深色' },
          { id: 'system', name: '跟随系统' },
        ]}
        value={value.mode}
        onPick={(id) => set({ mode: id as 'light' | 'dark' | 'system' })}
      />
    </Section>

    {/* 头像选择 */}
    <Section title="助手头像">
      <div className="grid grid-cols-3 gap-2">
        {AVATAR_PRESETS.map((p) => {
          const active = value.avatar === p.src;
          return (
            <button
              key={p.id}
              onClick={() => set({ avatar: p.src })}
              className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 transition ${
                active ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/40'
              }`}
            >
              <img src={p.src} alt={p.name} className="h-10 w-10 rounded-full object-cover" />
            </button>
          );
        })}
        <button
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-border p-2 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Upload className="h-4 w-4" />
          </span>
          <span className="text-[0.72rem]">上传</span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </Section>

    {/* 字号 */}
    <Section title="字号">
      <div className="flex items-center gap-3">
        <input aria-label="字号滑块" className="min-w-0 flex-1 accent-primary" type="range" min={1} max={48} step={1}
          value={value.fontSize} onChange={e => { setTypedSize(null); set({ fontSize: Number(e.target.value) }); }} />
        <input aria-label="字号（像素）" type="number" min={1} max={48} step={1} className="w-16 rounded-md border bg-background px-2 py-1 text-sm"
          value={typedSize ?? value.fontSize} onChange={e => {
            setTypedSize(e.target.value);
            const n = e.target.valueAsNumber;
            if (Number.isInteger(n) && n >= 1 && n <= 48) set({ fontSize: n });
          }} onBlur={commitSize} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
      </div>
    </Section>

    {/* 圆角 */}
    <Section title="圆角">
      <Segmented
        options={RADIUS_OPTIONS}
        value={value.radius}
        onPick={(id) => set({ radius: id as Radius })}
      />
    </Section>

    <div className="border-t border-dashed border-border pt-4">
      <p className="mb-2 text-[0.74rem] font-medium text-muted-foreground">排版布局</p>
    </div>

    <div className="grid grid-cols-2 gap-3">
      {(['chineseFont', 'englishFont'] as const).map(key => (
        <label key={key} className="min-w-0 text-sm">
          {key === 'chineseFont' ? '中文字体' : '英文字体'}
          <select className="mt-1.5 w-full rounded-md border border-border bg-background px-2 py-2"
            style={{ fontFamily: '"' + value[key] + '"' }} value={value[key]}
            onChange={e => set({ [key]: e.target.value })}>
            {(key === 'chineseFont' ? CHINESE_FONTS : ENGLISH_FONTS).map(name =>
              <option key={name} value={name} style={{ fontFamily: '"' + name + '"' }}>{name}</option>)}
          </select>
        </label>
      ))}
    </div>

    {/* 内容宽度 */}
    <Section title="内容宽度">
      <Segmented
        options={CHAT_WIDTH_OPTIONS}
        value={value.chatWidth}
        onPick={(id) => set({ chatWidth: id as ChatWidth })}
      />
    </Section>

    {/* 侧边栏位置 */}
    <Section title="侧边栏位置">
      <Segmented
        options={SIDEBAR_OPTIONS}
        value={value.sidebarSide}
        onPick={(id) => set({ sidebarSide: id as SidebarSide })}
      />
    </Section>
    <div className="flex items-center gap-2 border-t border-border pt-3">
      <button
        onClick={() => { setTypedSize(null); onChange({ ...DEFAULT_APPEARANCE }); }}
        className="flex items-center gap-1 rounded-md px-3 py-1.5 text-[0.8rem] text-muted-foreground hover:bg-muted"
      >
        <RotateCcw className="h-3.5 w-3.5" /> 恢复默认
      </button>
    </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[0.78rem] font-medium text-foreground">{title}</p>
      {children}
    </div>
  );
}

function Segmented({
  options,
  value,
  onPick,
}: {
  options: { id: string; name: string }[];
  value: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-background p-1">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onPick(o.id)}
            className={`flex-1 rounded-md px-2 py-1.5 text-[0.78rem] transition ${
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {o.name}
          </button>
        );
      })}
    </div>
  );
}
