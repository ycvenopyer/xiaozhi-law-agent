export type KBCategory = '商标法' | '专利法' | '著作权法' | '反不正当竞争法' | '其他';
export type KBKind = 'law' | 'case';

export interface KBEntry {
  id: string;
  title: string;
  category: KBCategory;
  /** 'law' = 法条/规定；'case' = 司法案例 */
  kind: KBKind;
  content: string;
  /** The shared catalog is read-only. Personal entries belong to the signed-in user. */
  builtin?: boolean;
  /** whether this entry is fed to the model; user can toggle per entry */
  enabled?: boolean;
  official?: { law_title: string; article_label: string; version: string; source_url: string; effective_date: string; end_date: string; authority: string; tier: string; updated_at: string };
  legacyReference?: boolean;
}

