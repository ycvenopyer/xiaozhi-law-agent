import { useRef } from 'react';
import { Palette, X, RotateCcw, Upload } from 'lucide-react';
import {
  COLOR_PRESETS,
  type Appearance,
  type FontSize,
  type Radius,
  type FontFamily,
  type MessageStyle,
  type ChatWidth,
  type SidebarSide,
} from '@/lib/appearance';

const AVATAR_PRESETS: { id: string; name: string; src: string }[] = [
  { id: 'xiaomei', name: '默认', src: '/xiaomei-avatar.png' },
  { id: 'xiaozhi', name: '男', src: '/xiaozhi-avatar.png' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  value: Appearance;
  onChange: (a: Appearance) => void;
}

const FONT_OPTIONS: { id: FontSize; name: string }[] = [
  { id: 'compact', name: '紧凑' },
  { id: 'standard', name: '标准' },
  { id: 'spacious', name: '宽松' },
];
const RADIUS_OPTIONS: { id: Radius; name: string }[] = [
  { id: 'square', name: '直角' },
  { id: 'round', name: '圆润' },
  { id: 'pill', name: '胶囊' },
];
const FONT_FAMILY_OPTIONS: { id: FontFamily; name: string }[] = [
  { id: 'sans', name: '现代无衬线' },
  { id: 'serif', name: '公文衬线' },
  { id: 'mono', name: '等宽代码' },
];
const MESSAGE_STYLE_OPTIONS: { id: MessageStyle; name: string }[] = [
  { id: 'bubble', name: '气泡式' },
  { id: 'doc', name: '文档式' },
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

export function AppearancePanel({ open, onClose, value, onChange }: Props) {
  function set(patch: Partial<Appearance>) {
    onChange({ ...value, ...patch });
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
    <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-card shadow-xl transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Palette className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">界面外观</span>
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
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
            <Segmented
              options={FONT_OPTIONS}
              value={value.font}
              onPick={(id) => set({ font: id as FontSize })}
            />
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

          {/* 字体风格 */}
          <Section title="字体风格">
            <Segmented
              options={FONT_FAMILY_OPTIONS}
              value={value.fontFamily}
              onPick={(id) => set({ fontFamily: id as FontFamily })}
            />
          </Section>

          {/* 消息版式 */}
          <Section title="消息版式">
            <Segmented
              options={MESSAGE_STYLE_OPTIONS}
              value={value.messageStyle}
              onPick={(id) => set({ messageStyle: id as MessageStyle })}
            />
            <p className="mt-1.5 text-[0.7rem] leading-relaxed text-muted-foreground">
              文档式：消息以全宽段落呈现，更接近律师阅卷/写报告的版式。
            </p>
          </Section>

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
        </div>

        <div className="flex items-center gap-2 border-t border-border px-4 py-3">
          <button
            onClick={() =>
              onChange({
                preset: 'blue',
                customColor: '#2563eb',
                mode: 'system',
                dark: false,
                font: 'standard',
                radius: 'round',
                fontFamily: 'sans',
                messageStyle: 'bubble',
                chatWidth: 'standard',
                sidebarSide: 'left',
                avatar: '/xiaomei-avatar.png',
              })
            }
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-[0.8rem] text-muted-foreground hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" /> 恢复默认
          </button>
          <button
            onClick={onClose}
            className="ml-auto flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[0.8rem] text-primary-foreground hover:opacity-90"
          >
            完成
          </button>
        </div>
      </aside>
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
