import { z } from 'zod';
import { loadCollection, saveCollection, type Collection } from './cloud-store';
import { storeOriginal } from './private-files';

const keys = {
  sessions: 'agent_sessions_v1', dossiers: 'agent_dossiers_v1', knowledge: 'agent-knowledge',
  deadlines: 'agent-deadlines', conflicts: 'agent-conflicts',
} as const;
type LegacyKind = keyof typeof keys;
const record = z.object({ id: z.string().min(1).max(200) }).passthrough();
const schemas: Record<LegacyKind, z.ZodType> = {
  sessions: record.extend({ title: z.string(), messages: z.array(record.extend({ role: z.enum(['user','assistant','tool','system']), content: z.string(), createdAt: z.number() })), createdAt: z.number(), updatedAt: z.number() }),
  dossiers: record.extend({ name: z.string(), dossier: z.object({ parties: z.string(), cause: z.string(), facts: z.string(), claims: z.string(), evidence: z.string() }).passthrough(), raw: z.string(), createdAt: z.number(), updatedAt: z.number() }),
  knowledge: record.extend({ title: z.string(), content: z.string(), category: z.string() }),
  deadlines: record.extend({ caseName: z.string(), matter: z.string(), dueDate: z.string() }),
  conflicts: record.extend({ matter: z.string(), client: z.string(), adverse: z.string() }),
};

export function previewLegacy() {
  return Object.entries(keys).map(([kind, storageKey]) => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return { kind: kind as LegacyKind, count: Array.isArray(value) ? value.length : 0, invalid: !Array.isArray(value) };
    } catch { return { kind: kind as LegacyKind, count: 0, invalid: true }; }
  });
}

async function migrateImages(value: unknown): Promise<unknown> {
  if (Array.isArray(value)) return Promise.all(value.map(migrateImages));
  if (!value || typeof value !== 'object') return value;
  const item = value as Record<string, unknown>;
  if (item.kind === 'image' && typeof item.dataUrl === 'string' && !item.storagePath) {
    const id = typeof item.id === 'string' ? item.id : crypto.randomUUID();
    const existing = loadCollection<{ id: string; storagePath?: string }>('files').find(file => file.id === id);
    if (existing?.storagePath) return { ...item, dataUrl: undefined, storagePath: existing.storagePath, storageBucket: 'private-files' };
    if (!/^data:image\/(png|jpeg|webp);base64,/.test(item.dataUrl)) throw new Error('旧图片格式不支持，请重新上传。');
    const blob = await (await fetch(item.dataUrl)).blob();
    const file = new File([blob], String(item.name || 'legacy-image.jpg'), { type: blob.type });
    const saved = await storeOriginal(file, id);
    return { ...item, ...saved, dataUrl: undefined };
  }
  const entries = await Promise.all(Object.entries(item).map(async ([key, child]) => [key, await migrateImages(child)]));
  return Object.fromEntries(entries);
}

/** Explicit, validated, idempotent import. Local originals are never auto-deleted. */
export async function importLegacy() {
  let imported = 0;
  for (const [kind, storageKey] of Object.entries(keys) as [LegacyKind, string][]) {
    const source: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(source)) throw new Error(`${storageKey} 格式不正确，未清理任何本地数据。`);
    const old = loadCollection<{ id: string }>(kind as Collection);
    const ids = new Set(old.map(item => item.id));
    const additions: Array<{ id: string }> = [];
    for (const item of source) {
      const validated = schemas[kind].safeParse(item);
      if (!validated.success) throw new Error(`${storageKey} 包含损坏记录，请先导出备份并人工核对。`);
      const candidate = validated.data as { id: string } & Record<string, unknown>;
      if (kind === 'knowledge') {
        candidate.kind = candidate.kind === 'case' || candidate.type === '案例' ? 'case' : 'law';
        candidate.enabled = candidate.enabled !== false;
      }
      if (ids.has(candidate.id)) continue;
      additions.push(await migrateImages(candidate) as { id: string });
      ids.add(candidate.id);
    }
    await saveCollection(kind, [...old, ...additions]);
    imported += additions.length;
  }
  return imported;
}

export function exportLegacy() {
  const content = Object.fromEntries(Object.entries(keys).map(([kind, storageKey]) => [kind, localStorage.getItem(storageKey)]));
  const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'xiaozhi-local-backup.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function clearLegacy() { Object.values(keys).forEach(storageKey => localStorage.removeItem(storageKey)); }
