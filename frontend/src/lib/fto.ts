export interface Feature {
  id: string
  description: string
  type: string
  necessary: boolean
  terms: string
  locked: boolean
  excluded: boolean
}

// Generic vocabulary is only proposed for features containing the seed term.
const vocabulary = [
  ['传感器', '感测器', '检测元件', '温度传感器', 'sensor'],
  ['电池', '电芯', '储能装置', '锂离子电池', 'battery'],
  ['显示屏', '显示器', '显示装置', '液晶显示屏', 'display'],
  ['图像识别', '影像识别', '模式识别', '目标检测', 'image recognition'],
  ['无线通信', '无线通讯', '数据通信', '蓝牙通信', 'wireless communication'],
  ['光学', '光学系统', '成像系统', '光学透镜', 'optics'],
  ['控制器', '控制单元', '控制装置', '微控制器', 'controller'],
]

export function proposeFeatures(description: string): Feature[] {
  const parts = [
    ...new Set(
      description
        .split(/[。\n；;，,]+/)
        .map(s => s.trim())
        .filter(Boolean)
    ),
  ]
  return parts.map((part, index) => ({
    id: `F${index + 1}`,
    description: part,
    type: '技术特征',
    necessary: true,
    terms: [
      ...new Set([
        part,
        ...vocabulary.filter(group => group.some(term => part.includes(term))).flat(),
      ]),
    ].join(' | '),
    locked: false,
    excluded: false,
  }))
}
export const termsOf = (terms: string) => [
  ...new Set(
    terms
      .split(/[|｜\n]/)
      .map(t => t.trim())
      .filter(Boolean)
  ),
]
export function searchExpressions(features: Feature[], exclusions: string) {
  const quote = (term: string) => '"' + term.replaceAll('"', '') + '"'
  const rows = features
    .filter(f => !f.excluded && termsOf(f.terms).length)
    .map(f => ({
      id: f.id,
      necessary: f.necessary,
      query: '(' + termsOf(f.terms).map(quote).join(' OR ') + ')',
    }))
  const needed = rows.filter(row => row.necessary)
  const positive = (needed.length ? needed : rows)
    .map(row => row.query)
    .join(needed.length ? ' AND ' : ' OR ')
  const excluded = termsOf(exclusions)
    .map(t => ' -' + quote(t))
    .join('')
  return { rows, combined: positive ? positive + excluded : '' }
}

export const columns = {
  publication: [
    '公开号',
    '公开（公告）号',
    '公开公告号',
    'publication number',
    'publication_number',
    'publication id',
    'document number',
    'publication no.',
    'id',
  ],
  title: ['标题', '发明名称', '专利名称', 'title', 'invention title'],
  applicant: ['申请人', '申请（专利权）人', 'applicant', 'applicants', 'assignee', 'applicant(s)'],
  filed: ['申请日', 'application date', 'filing date'],
  published: ['公开日', '公开（公告）日', 'publication date'],
  status: ['法律状态', '当前法律状态', 'legal status'],
  abstract: ['摘要', '中文摘要', 'abstract'],
}
export type Field = keyof typeof columns
export const fields = Object.keys(columns) as Field[]
export type Mapping = Record<Field, number>
export interface CsvTable {
  headers: string[]
  rows: string[][]
  encoding: string
  delimiter: string
  name: string
}
/** Reserved for a future licensed API integration. */
export interface PatentApiProvider {
  search(expression: string, markets: string[], signal: AbortSignal): Promise<CsvTable>
}

// Fields may contain embedded newlines, delimiters, or escaped double quotes.
export function parseDelimited(text: string, delimiter: string) {
  const rows: string[][] = []
  let row: string[] = [],
    field = '',
    quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (quoted || field === '') quoted = !quoted
      else field += ch
    } else if (!quoted && ch === delimiter) {
      row.push(field.trim())
      field = ''
    } else if (!quoted && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (quoted) throw new Error('CSV 中有未闭合的引号，请检查文件。')
  row.push(field.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

export const ManualCsvProvider = {
  async read(file: File): Promise<CsvTable> {
    if (file.size > 8 * 1024 * 1024) throw new Error('请选择 8 MiB 以内的 CSV 或 TSV。')
    const bytes = await file.arrayBuffer()
    let encoding = 'UTF-8',
      text: string
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
      encoding = 'GBK'
      text = new TextDecoder('gbk', { fatal: true }).decode(bytes)
    }
    // Google Patents exports can prefix the header with a search URL record.
    text = text.replace(/^"?search URL:[^\r\n]*(?:\r\n|\r|\n)/i, '')
    const delimiter = text.split(/[\r\n]/, 1)[0].includes('\t') ? '\t' : ','
    const records = parseDelimited(text, delimiter)
    const first = records[0]
    if (!first) throw new Error('文件中没有可读取的记录。')
    const headerless = first.length === 1 && /^(?:[A-Z]{2}-?)?\d{4,}[\dA-Z-]*$/i.test(first[0])
    const headers = headerless ? ['编号（原文件无表头）'] : first
    const rows = headerless ? records : records.slice(1)
    if (!rows.length) throw new Error('需要至少一行数据。')
    if (rows.length > 50000) throw new Error('每次最多导入五万条，请拆分 CSV。')
    if (rows.some(row => row.length !== headers.length))
      throw new Error('数据列数与表头不一致，请检查分隔符或引号。')
    return { headers, rows, delimiter, encoding, name: file.name }
  },
}

export function guessMapping(headers: string[], preset: Partial<Record<Field, string>> = {}) {
  return Object.fromEntries(
    fields.map(key => {
      const saved = preset[key] ? headers.indexOf(preset[key]!) : -1
      return [
        key,
        saved >= 0 ? saved : headers.findIndex(h => columns[key].includes(h.toLowerCase())),
      ]
    })
  ) as Mapping
}

export function screen(table: CsvTable, mapping: Mapping, features: Feature[]) {
  const seen = new Set<string>()
  const selected = features.filter(f => !f.excluded)
  const required = selected.filter(f => f.necessary)
  return table.rows.flatMap((row, index) => {
    const value = (key: Field) => row[mapping[key]] || ''
    const publication = value('publication')
    const unique = publication
      .replace(/^patent:/i, '')
      .replace(/[\s-]/g, '')
      .toUpperCase()
    if (unique && seen.has(unique)) return []
    if (unique) seen.add(unique)
    const material = (value('title') + '\n' + value('abstract')).toLowerCase()
    const hits = selected.filter(f =>
      termsOf(f.terms).some(term => material.includes(term.toLowerCase()))
    )
    const rated = Boolean(material.trim() && publication && selected.length)
    const risk = !rated
      ? '待核验'
      : required.length && required.every(f => hits.includes(f))
        ? '高'
        : hits.length
          ? '中'
          : '低'
    const reason = !rated
      ? '缺少公开号、文本或可用特征'
      : risk === '高'
        ? '标题或摘要命中全部必要特征词'
        : hits.length
          ? '标题或摘要命中部分特征词'
          : '标题与摘要未出现选定特征词，仍需人工核对同义表达'
    return [
      {
        id: unique || `row-${index}`,
        publication,
        title: value('title'),
        applicant: value('applicant'),
        filed: value('filed'),
        published: value('published'),
        status: /^(?:|未知|不详|未知状态|无法判断|unknown|n\/a|-)$/i.test(value('status'))
          ? '未核验'
          : value('status'),
        risk,
        hits: hits.map(f => f.id),
        reason,
      },
    ]
  })
}
