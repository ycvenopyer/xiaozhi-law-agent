import { type CaseDossier, IMAGE_DOSSIER_RAW } from '@/types/agent';

const KEY = 'agent_dossiers_v1';

/** A saved case file in the user's personal dossier library. */
export interface SavedDossier {
  id: string;
  /** Display name, editable by the user. */
  name: string;
  /** Structured case background. */
  dossier: CaseDossier;
  /** Raw uploaded material, kept so the dossier can be re-recognized later. */
  raw: string;
  /** Session the dossier was first created in. */
  sourceSessionId?: string;
  createdAt: number;
  updatedAt: number;
}

export function loadDossiers(): SavedDossier[] {
  try {
    const text = localStorage.getItem(KEY);
    if (!text) return [];
    const parsed = JSON.parse(text) as SavedDossier[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((d) => d && typeof d === 'object' && d.dossier);
  } catch {
    return [];
  }
}

export function saveDossiers(list: SavedDossier[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full / unavailable — ignore */
  }
}

export function newDossierId(): string {
  return crypto.randomUUID();
}

/** How many of the five core fields carry content. */
export function dossierFilled(d: CaseDossier): number {
  return [d.parties, d.cause, d.facts, d.claims, d.evidence].filter((v) => (v || '').trim()).length;
}

/** Pick a short, human-readable name for a freshly recognized dossier. */
export function suggestName(d: CaseDossier, fallbackIndex = 0): string {
  const parties = (d.parties || '').split('\n')[0]?.trim();
  if (parties) {
    const cleaned = parties.replace(/^(原告|被告|上诉人|被上诉人|申请人|被申请人)[：:]\s*/, '').trim();
    const base = cleaned || parties;
    return base.length > 24 ? base.slice(0, 24) + '…' : base;
  }
  if ((d.cause || '').trim()) return `${d.cause.trim()}案`;
  return `未命名卷宗${fallbackIndex ? ' ' + (fallbackIndex + 1) : ''}`;
}

/** Short preview line shown under the dossier name in the library list. */
export function dossierSummary(d: CaseDossier): string {
  const parts: string[] = [];
  if (d.cause.trim()) parts.push(d.cause.trim());
  const facts = d.facts.trim().replace(/\s+/g, ' ');
  if (facts) parts.push(facts.length > 60 ? facts.slice(0, 60) + '…' : facts);
  return parts.join(' · ') || '暂无内容';
}

export function isImageDossier(raw: string | undefined): boolean {
  return !!raw && raw === IMAGE_DOSSIER_RAW;
}

export function formatWhen(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Relative label like "刚刚 / 3 分钟前 / 昨天". */
export function relativeWhen(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 172_800_000) return '昨天';
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  return formatWhen(ts);
}
