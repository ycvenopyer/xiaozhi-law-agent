import type { KBCategory, KBEntry } from '../shared/knowledge'
import library from '../shared/law-library.json'
import { previousSeeds } from '../shared/legacy-knowledge'

const officialEntries: KBEntry[] = library.laws.flatMap(law => law.articles.map(article => ({
  id: 'law-' + law.id + '-' + article.number,
  title: law.title + ' ' + article.label,
  category: (['商标法', '专利法', '著作权法', '反不正当竞争法'] as KBCategory[]).find(c => law.title.includes(c)) ?? '其他',
  kind: 'law' as const, builtin: true, enabled: true, content: article.content,
  official: { law_title: law.title, article_label: article.label, version: law.version, source_url: law.source_url, effective_date: law.effective_date,
    end_date: law.end_date, authority: law.authority, tier: law.tier, updated_at: library.updated_at },
})));
export const publicSeed: KBEntry[] = [...officialEntries, ...previousSeeds.filter(e => e.kind === 'case' || e.id.startsWith('seed-guide')).map(e => ({
  ...e, enabled: false, builtin: true, legacyReference: true,
}))];

