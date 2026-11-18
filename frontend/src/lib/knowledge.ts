import { loadCollection, loadPublicKnowledge, saveInBackground } from './cloud-store';
import { previousSeeds } from '../../../shared/legacy-knowledge';
import type { KBEntry } from '../../../shared/knowledge';
export type { KBEntry, KBCategory, KBKind } from '../../../shared/knowledge';

export const beijingDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function lawStatus(entry: KBEntry, date = beijingDate()) {
  const law = entry.official;
  if (!law) return entry.legacyReference ? '待核验参考资料' : '个人资料';
  if (date < law.effective_date) return '尚未施行';
  return law.end_date && date >= law.end_date ? '已修改' : '现行有效';
}

function replacement(id: string) {
  const match = /^seed-(tm|cr|pat|uc)-(?:full-)?(\d+)$/.exec(id);
  if (!match) return undefined;
  const [, family, number] = match;
  const ucMap: Record<string,string> = { '2':'2','6':'7','8':'9','9':'10','10':'11','11':'12','17':'22' };
  return 'law-' + (family === 'tm' ? 'tm19' : family) + '-' + (family === 'uc' ? ucMap[number] : number);
}

type Override = Partial<KBEntry> & { id: string; deleted?: boolean };

export function loadKB(catalog = loadPublicKnowledge(), saved = loadCollection<Override>('knowledge')): KBEntry[] {
  const byId = new Map(catalog.map(entry => [entry.id, { ...entry, builtin: true } as KBEntry]));
  const personal = new Map<string, KBEntry>();
  const savedIds = new Set(saved.map(entry => entry.id));
  for (const row of saved) {
    const seed = byId.get(replacement(row.id) ?? row.id);
    const old = previousSeeds.find(entry => entry.id === row.id);
    if (seed && (row.deleted || !row.content || (row.builtin && row.official) ||
        (row.content === seed.content && row.title === seed.title) ||
        (old && row.content === old.content && row.title === old.title))) {
      byId.set(seed.id, { ...seed, enabled: row.deleted || seed.legacyReference ? false : row.enabled ?? seed.enabled });
    } else if (!row.deleted && row.content && row.title && row.kind && row.category &&
        !(old && old.content === row.content && old.title === row.title)) {
      const id = byId.has(row.id) ? 'private-' + row.id : row.id;
      // A retry may see both the old edited row and its already-persisted private copy.
      if (id !== row.id && savedIds.has(id)) continue;
      personal.set(id, { ...row, id, official: undefined, builtin: false } as KBEntry);
    }
  }
  return [...byId.values(), ...personal.values()];
}

export function saveKB(entries: KBEntry[]) {
  const catalog = new Map(loadPublicKnowledge().map(entry => [entry.id, entry]));
  const changes: Override[] = [];
  for (const entry of entries) {
    const seed = catalog.get(entry.id);
    if (!seed) changes.push(entry);
    else if (entry.enabled !== seed.enabled) changes.push({ id: seed.id, builtin: true, enabled: entry.enabled });
  }
  saveInBackground('knowledge', changes);
}

/** Serialize the ENABLED knowledge entries into the block the backend injects. */
export function kbToText(list: KBEntry[], query = '', date = beijingDate()): string {
  const tokens = new Set(query.toLowerCase().match(/[a-z0-9]+/g) || []);
  for (const word of query.match(/[\u3400-\u9fff]+/g) || []) {
    for (let i = 1; i < word.length; i++) tokens.add(word.slice(i-1, i+1));
  }
  const focus: [RegExp, string[]][] = [
    [/商标|标识/, ['law-tm19-57','law-tm19-59','law-tm26-72','law-tm26-73','law-tmCourt-9','law-tmCourt-10','law-tmCourt-11','law-tmCourt-12']],
    [/著作权|作品|开源|许可证/, ['law-cr-3','law-cr-10','law-cr-24','law-cr-26','law-software-8','law-software-16','law-cr-reg-21']],
    [/职务发明|成果保护|研发成果/, ['law-pat-6','law-pat-16','law-cr-18','law-software-13','law-uc-10']],
    [/商业秘密|保密/, ['law-uc-10','law-uc-22','law-labor-23']],
    [/竞业/, ['law-labor-23','law-labor-24','law-labor-90']],
  ];
  const preferred = new Set(focus.filter(([pattern]) => pattern.test(query)).flatMap(([,ids]) => ids));
  const eligible = list.filter(e => e.enabled !== false && !e.legacyReference && (!e.official || lawStatus(e,date) === '现行有效'));
  const ranked = eligible.map(e => {
    let score = preferred.has(e.id) ? 80 : 0;
    for (const term of tokens) score += (e.title.includes(term) ? 6 : 0) + (e.content.includes(term) ? 1 : 0);
    const number = e.id.split('-').at(-1);
    if (e.official && query.includes(e.title.split(' ')[0]) && (query.includes(e.title.split(' ')[1]) || query.includes('第'+number+'条'))) score += 200;
    return { e, score };
  }).sort((a,b) => b.score - a.score);
  return ranked.slice(0,16).map(({e}) => e.official
    ? '【法规原文 '+e.id+'】'+e.title+' · '+e.official.authority+' · '+e.official.version+' · '+e.official.source_url+'\n'+e.content
    : '【用户参考资料·'+e.kind+'】'+e.title+'\n'+e.content).join('\n\n');
}
