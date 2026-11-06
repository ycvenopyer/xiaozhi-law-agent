/**
 * Personal appearance settings: color theme, light/dark, font size and corner
 * radius. Everything is driven by CSS custom properties on <html>, so switching
 * is instant and persists in localStorage.
 */

export type FontSize = 'compact' | 'standard' | 'spacious';
export type Radius = 'square' | 'round' | 'pill';
export type FontFamily = 'sans' | 'serif' | 'mono';
export type MessageStyle = 'bubble' | 'doc';
export type ChatWidth = 'narrow' | 'standard' | 'wide';
export type SidebarSide = 'left' | 'right';

export interface Appearance {
  /** Preset id, or 'custom' when a user-picked color is used. */
  preset: string;
  /** Hex color used when preset === 'custom'. */
  customColor: string;
  /** Color mode: 'light' / 'dark' / 'system'. 'system' follows the OS preference. */
  mode: 'light' | 'dark' | 'system';
  /** Legacy: resolved dark flag (derived from mode + system preference). Kept
   *  for backwards compat with previously persisted settings. */
  dark: boolean;
  font: FontSize;
  radius: Radius;
  /** Base typeface: modern sans / serif (like official documents) / monospace. */
  fontFamily: FontFamily;
  /** Chat layout: chat bubbles vs. document-style (full-width paragraphs). */
  messageStyle: MessageStyle;
  /** Reading column width for the conversation area. */
  chatWidth: ChatWidth;
  /** Where the session sidebar sits. */
  sidebarSide: SidebarSide;
  /** Assistant avatar: a preset path (e.g. /xiaozhi-avatar.png) or an uploaded data URL. */
  avatar: string;
}

export interface ColorPreset {
  id: string;
  name: string;
  hex: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  { id: 'blue', name: '律政蓝', hex: '#2563eb' },
  { id: 'crimson', name: '朱砂红', hex: '#d62828' },
  { id: 'emerald', name: '翡翠绿', hex: '#15803d' },
  { id: 'violet', name: '紫罗兰', hex: '#7c3aed' },
  { id: 'amber', name: '暖橙', hex: '#ea580c' },
  { id: 'teal', name: '青碧', hex: '#0d9488' },
];

const DEFAULT: Appearance = {
  preset: 'blue',
  customColor: '#2563eb',
  // First-time visitors default to LIGHT so a dark-mode OS preference doesn't
  // leak into our app across machines. Users can opt into 'dark' or 'system'
  // from the appearance panel when they want it.
  mode: 'light',
  // Resolved dark flag (filled in by loadAppearance below).
  dark: false,
  font: 'standard',
  radius: 'round',
  fontFamily: 'sans',
  messageStyle: 'bubble',
  chatWidth: 'standard',
  sidebarSide: 'left',
  avatar: '/xiaomei-avatar.png',
};

/** Read the OS dark-mode preference. Returns false in SSR / unsupported envs. */
function prefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** True when the current appearance should render as dark. */
export function isDarkMode(a: Appearance): boolean {
  if (a.mode === 'dark') return true;
  if (a.mode === 'light') return false;
  return prefersDark();
}

const FONT_SCALE: Record<FontSize, { body: string; label: string; small: string }> = {
  compact: { body: '0.9rem', label: '0.8rem', small: '0.72rem' },
  standard: { body: '1rem', label: '0.875rem', small: '0.75rem' },
  spacious: { body: '1.12rem', label: '0.95rem', small: '0.82rem' },
};

const RADIUS_VALUE: Record<Radius, string> = {
  square: '0rem',
  round: '0.625rem',
  pill: '1.25rem',
};

const FONT_FAMILY_STACK: Record<FontFamily, string> = {
  sans: 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif',
  serif: 'Georgia, "Songti SC", "SimSun", "Noto Serif SC", "Source Han Serif SC", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
};

const CHAT_WIDTH: Record<ChatWidth, string> = {
  narrow: '640px',
  standard: '860px',
  wide: '1120px',
};

export function loadAppearance(): Appearance {
  if (typeof localStorage === 'undefined') return { ...DEFAULT };
  try {
    const raw = localStorage.getItem('agent-appearance');
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<Appearance>;
    // Older saves used `dark: boolean` with no `mode` field. Migrate them
    // to the new 'light'/'dark'/'system' mode so the UI keeps working.
    const merged: Appearance = { ...DEFAULT, ...parsed };
    if (!merged.mode) {
      merged.mode = merged.dark ? 'dark' : 'light';
    }
    // Always resolve the live dark flag from the mode + OS preference.
    merged.dark = isDarkMode(merged);
    return merged;
  } catch {
    // Corrupted localStorage entry (e.g. truncated by another tab/extension).
    // Drop it and start fresh so the page can render reliably.
    try {
      localStorage.removeItem('agent-appearance');
    } catch {
      /* ignore */
    }
    return { ...DEFAULT };
  }
}

/** Subscribe to OS color-scheme changes when the user is in `mode: 'system'`.
 *  Returns an unsubscribe function. */
export function watchSystemTheme(a: Appearance, cb: () => void): () => void {
  if (typeof window === 'undefined' || a.mode !== 'system' || !window.matchMedia) {
    return () => {};
  }
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => cb();
  if (mql.addEventListener) {
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }
  // Safari < 14 fallback
  mql.addListener(handler);
  return () => mql.removeListener(handler);
}

/** Pick a readable foreground (near-black or white) for an accent hex. */
function contrastFg(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return '#ffffff';
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.6 ? '#1a1a1a' : '#ffffff';
}

function accentHex(a: Appearance): string {
  if (a.preset === 'custom') return a.customColor;
  return COLOR_PRESETS.find((p) => p.id === a.preset)?.hex ?? DEFAULT.customColor;
}

export function applyAppearance(a: Appearance): void {
  const root = document.documentElement;
  const hex = accentHex(a);
  const fg = contrastFg(hex);

  root.style.setProperty('--primary', hex);
  root.style.setProperty('--primary-foreground', fg);
  root.style.setProperty('--ring', hex);
  root.style.setProperty('--hero', hex);
  root.style.setProperty('--hero-foreground', fg);
  root.style.setProperty('--sidebar-primary', hex);
  root.style.setProperty('--sidebar-primary-foreground', fg);
  root.style.setProperty('--sidebar-ring', hex);
  root.style.setProperty('--accent', `color-mix(in srgb, ${hex} 12%, transparent)`);
  root.style.setProperty('--accent-foreground', hex);

  // Always resolve the dark flag from the requested mode so the toggle and
  // saved preference can drift independently of what's actually rendered.
  const resolvedDark = isDarkMode(a);
  root.classList.toggle('dark', resolvedDark);

  const fs = FONT_SCALE[a.font];
  root.style.setProperty('--font-size-body', fs.body);
  root.style.setProperty('--font-size-label', fs.label);
  root.style.setProperty('--font-size-small', fs.small);

  root.style.setProperty('--radius', RADIUS_VALUE[a.radius]);

  root.style.setProperty('--font-family-base', FONT_FAMILY_STACK[a.fontFamily]);
  root.style.setProperty('--chat-max-width', CHAT_WIDTH[a.chatWidth]);
  root.classList.toggle('layout-doc', a.messageStyle === 'doc');

  // Mark the html element with the active mode so CSS / external integrations
  // can react (e.g. native form widgets, scrollbars).
  root.dataset.themeMode = a.mode;
}
