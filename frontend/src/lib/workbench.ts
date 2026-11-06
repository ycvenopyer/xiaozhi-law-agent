/** 案件期限台账：本地存储的办案期限节点。 */
export interface Deadline {
  id: string;
  caseName: string;
  matter: string;
  type: string;
  dueDate: string; // YYYY-MM-DD
  note: string;
  done: boolean;
}

const KEY = 'agent-deadlines';

export const DEADLINE_TYPES = [
  '答辩期',
  '上诉期',
  '商标续展期',
  '官文答复期',
  '举证期限',
  '异议期限',
  '其他',
];

export function loadDeadlines(): Deadline[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveDeadlines(list: Deadline[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

/** 距离今天剩余天数；null 表示日期无效。 */
export function daysLeft(dueDate: string): number | null {
  if (!dueDate) return null;
  const d = new Date(dueDate + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function urgencyClass(d: Deadline): string {
  if (d.done) return 'text-muted-foreground';
  const left = daysLeft(d.dueDate);
  if (left === null) return 'text-muted-foreground';
  if (left < 0) return 'text-destructive';
  if (left <= 7) return 'text-destructive';
  if (left <= 15) return 'text-amber-500';
  return 'text-emerald-500';
}

/* ----------------------------- 利益冲突台账 ----------------------------- */

export interface ConflictMatter {
  id: string;
  matter: string; // 案件 / 委托事项名称
  client: string; // 我方委托方
  adverse: string; // 相对方
  status: 'active' | 'closed'; // 进行中 / 已结案
  note: string;
}

const KEY_CONFLICT = 'agent-conflicts';

export function loadConflicts(): ConflictMatter[] {
  try {
    const raw = localStorage.getItem(KEY_CONFLICT);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveConflicts(list: ConflictMatter[]) {
  try {
    localStorage.setItem(KEY_CONFLICT, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

/** 去公司后缀 / 括号备注，便于粗略比对关联主体。 */
function normalizeParty(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[（(].*?[)）]/g, '')
    .replace(/(（.*?）|\(.*?\))/g, '')
    .replace(
      /(有限公司|股份有限公司|股份公司|公司|集团|企业集团|有限合伙|合伙企业|普通合伙|研究所|研究院|大学|学院|中心|事务所|律所)$/g,
      ''
    );
}

function partyMatch(a: string, b: string): boolean {
  const na = normalizeParty(a);
  const nb = normalizeParty(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

export interface ConflictHit {
  level: 'danger' | 'warn';
  message: string;
}

/**
 * 本地快速预检：将拟新接事项的委托方 / 相对方，与台账中的委托方、相对方逐一比对。
 * 仅做明显匹配提示，完整审查仍由助理生成。
 */
export function screenConflicts(
  newClient: string,
  newAdverse: string,
  list: ConflictMatter[]
): ConflictHit[] {
  const hits: ConflictHit[] = [];
  const nc = newClient.trim();
  const na = newAdverse.trim();
  if (!nc && !na) return hits;
  for (const m of list) {
    // 相对冲突：新委托方曾是某事项的相对方
    if (nc && m.adverse && partyMatch(nc, m.adverse)) {
      hits.push({
        level: 'danger',
        message: `新委托方「${nc}」曾作为事项「${m.matter}」的相对方，存在相对冲突（曾与我们对立）。`,
      });
    }
    // 当事人冲突：新相对方是某事项的委托方
    if (na && m.client && partyMatch(na, m.client)) {
      hits.push({
        level: 'danger',
        message: `新相对方「${na}」是事项「${m.matter}」的委托方，存在当事人冲突（将与现有客户对立）。`,
      });
    }
    // 同方重复：新委托方已是现有委托方
    if (nc && m.client && partyMatch(nc, m.client)) {
      hits.push({
        level: 'warn',
        message: `新委托方「${nc}」已是事项「${m.matter}」的委托方，注意多重代理 / 同案对向风险。`,
      });
    }
    // 相对方重叠：新相对方曾任他案相对方（疑似关联）
    if (na && m.adverse && partyMatch(na, m.adverse)) {
      hits.push({
        level: 'warn',
        message: `新相对方「${na}」曾作为事项「${m.matter}」的相对方，疑似关联方重复，需核实。`,
      });
    }
  }
  return hits;
}
