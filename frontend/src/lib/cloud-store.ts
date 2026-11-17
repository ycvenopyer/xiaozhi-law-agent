import { pgRequest } from './cloudbase';

export type Collection = 'sessions' | 'dossiers' | 'knowledge' | 'deadlines' | 'conflicts' | 'settings' | 'files';
export interface CloudRecord { kind: Collection; id: string; payload: Record<string, unknown>; revision: number; generation_id?: string | null }
export interface SyncStatus { pending: boolean; error: string | null }
const records = new Map<string, CloudRecord>();
let owner = '';
let generation = 0;
let queue = Promise.resolve();
let pendingCount = 0;
const desired = new Map<Collection, Array<Record<string, unknown>>>();
let status: SyncStatus = { pending: false, error: null };
const listeners = new Set<() => void>();
const key = (kind: Collection, id: string) => `${kind}:${id}`;
const clone = <T,>(value: T): T => structuredClone(value);
function emit(next: SyncStatus) { status = next; listeners.forEach(fn => fn()); }
export function subscribeSync(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function getSyncStatus() { return status; }
export function reportSyncError(message: string) { emit({ pending: false, error: message }); }
export function exportRecovery() {
  const content = { confirmed: [...records.values()], pending: Object.fromEntries(desired), savedAt: new Date().toISOString() };
  const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'xiaozhi-unsaved-recovery.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function currentOwner() { return owner; }

export function clearCloudStore() {
  generation++; owner = ''; records.clear(); desired.clear(); pendingCount = 0; queue = Promise.resolve();
  emit({ pending: false, error: null });
}

export async function hydrateCloudStore(userId: string) {
  clearCloudStore();
  const epoch = generation;
  const loaded: CloudRecord[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await pgRequest<CloudRecord[]>(`user_records?select=kind,id,payload,revision&order=kind.asc,id.asc&limit=100&offset=${offset}`);
    loaded.push(...page);
    if (page.length < 100) break;
  }
  if (epoch !== generation) return;
  owner = userId;
  loaded.forEach(record => records.set(key(record.kind, record.id), record));
}

export function loadCollection<T>(kind: Collection): T[] {
  return [...records.values()].filter(record => record.kind === kind).map(record => clone(record.payload) as T);
}

export function acceptRecord(record: CloudRecord) {
  records.set(key(record.kind, record.id), clone(record));
}

export async function refreshConversation(id: string) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const result = await pgRequest<CloudRecord[]>(`user_records?kind=eq.sessions&id=eq.${encodeURIComponent(id)}&select=kind,id,payload,revision,generation_id&limit=1`);
    const record = result[0];
    if (!record) throw new Error('云端对话不存在，请刷新核对。');
    if (!record.generation_id) { acceptRecord(record); return clone(record.payload); }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('对话仍在云端收尾，请保留页面并稍后刷新核对。');
}

function persistable(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, (_key, item) => {
    if (item && typeof item === 'object' && item.storagePath) {
      const { dataUrl: _transient, ...rest } = item;
      void _transient;
      return rest;
    }
    return item;
  }));
}

export function stageRecovery(kind: Collection, items: Array<{ id: string }>) {
  desired.set(kind, persistable(items) as Array<Record<string, unknown>>);
}

/** Serialize writes and use database revisions: stale tabs never silently overwrite data. */
export function saveCollection<T extends { id: string }>(kind: Collection, items: T[], deleteMissing = true): Promise<void> {
  const snapshot = persistable(items) as Array<T & Record<string, unknown>>;
  desired.set(kind, snapshot);
  const epoch = generation;
  const userId = owner;
  pendingCount++;
  emit({ pending: true, error: status.error });
  const task = queue.then(async () => {
    if (epoch !== generation || !userId || owner !== userId) return;
    if (status.error) throw new Error(status.error);
    const ids = new Set(snapshot.map(item => item.id));
    for (const item of snapshot) {
      if (epoch !== generation) return;
      const old = records.get(key(kind, item.id));
      if (old && JSON.stringify(old.payload) === JSON.stringify(item)) continue;
      const result = await pgRequest<CloudRecord>('rpc/put_user_record', {
        method: 'POST', body: JSON.stringify({ p_kind: kind, p_id: item.id,
          p_payload: item, p_revision: old?.revision ?? 0 }),
      });
      if (epoch === generation) acceptRecord(result);
    }
    for (const old of [...records.values()].filter(row => deleteMissing && row.kind === kind && !ids.has(row.id))) {
      if (epoch !== generation) return;
      await pgRequest('rpc/delete_user_record', { method: 'POST',
        body: JSON.stringify({ p_kind: kind, p_id: old.id, p_revision: old.revision }) });
      if (epoch === generation) records.delete(key(kind, old.id));
    }
  });
  queue = task.then(() => {
    if (epoch === generation) { pendingCount--; emit({ pending: pendingCount > 0, error: null }); }
  }, error => {
    if (epoch === generation) { pendingCount--; emit({ pending: pendingCount > 0, error: error instanceof Error ? error.message : '云端保存失败' }); }
  });
  return task;
}

export async function flushCloudStore() {
  await queue;
  if (status.error) throw new Error(status.error);
}

export function saveInBackground<T extends { id: string }>(kind: Collection, items: T[]) {
  void saveCollection(kind, items).catch(() => { /* surfaced by account sync status */ });
}

export function getPrivacy() {
  const settings = loadCollection<{ id: string; externalModels?: boolean }>('settings');
  return settings.find(item => item.id === 'privacy')?.externalModels === true;
}
