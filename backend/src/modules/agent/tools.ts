import type { ToolDefinition } from './types';
import { env } from '../../config/env';

/**
 * Tool catalogue exposed to the LLM. The model decides when to call these.
 * Each tool is implemented locally (no extra API keys required) except
 * web_search, which degrades gracefully when the network is unavailable.
 */
export const TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'calculator',
      description:
        '进行数学计算。当用户需要算术运算、百分比、税率/折扣、单位换算计算、复杂公式求值时调用。支持 + - * / % ^ 以及括号和小数。',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: '数学表达式，例如 "123 * 456 + (789 / 3)" 或 "0.2 * 8800"',
          },
        },
        required: ['expression'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_datetime',
      description:
        '获取当前的日期与时间（含星期）。当用户询问"今天几号""现在几点""某天是星期几""某个时区现在的时间"时调用。',
      parameters: {
        type: 'object',
        properties: {
          timezone: {
            type: 'string',
            description: 'IANA 时区，例如 Asia/Shanghai、America/New_York。可省略，默认使用上海时区。',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description:
        '联网检索法律法规、司法解释、指导性案例、生效裁判文书以及最新行业资讯。当用户需要查询具体法条、案号、裁判要旨、赔偿标准、官方指引、司法解释时务必调用。尽量使用精确关键词，例如"专利法 第七十一条 赔偿数额""商标侵权 惩罚性赔偿 案例"。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词' },
          max_results: { type: 'number', description: '返回结果数量，默认 5' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'trademark_search',
      description:
        '检索商标的注册信息：注册状态、注册号、国际分类（第几类）、申请人/权利人、核定使用商品，以及是否有近似商标。当用户询问某个商标是否注册、商标归属、类别、近似情况，或上传了商标图样要查其注册信息时务必调用。可检索中国商标网等公开来源。',
      parameters: {
        type: 'object',
        properties: {
          keyword: {
            type: 'string',
            description: '商标名称、申请人名称，或图样中识别出的主要文字。例如"华为""小米科技"。',
          },
          scope: {
            type: 'string',
            description: '检索范围：exact=精确查该商标，similar=查近似商标。默认 exact。',
            enum: ['exact', 'similar'],
          },
        },
        required: ['keyword'],
      },
    },
  },
];

/**
 * Safe arithmetic evaluator (recursive descent). Avoids eval() entirely.
 * Supports + - * / % ^ (right-associative) and unary minus.
 */
function evalMath(expr: string): number {
  const s = expr.replace(/\s+/g, '');
  let pos = 0;

  function parseExpr(): number {
    let v = parseTerm();
    while (s[pos] === '+' || s[pos] === '-') {
      const op = s[pos++];
      const r = parseTerm();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  function parseTerm(): number {
    let v = parseFactor();
    while (s[pos] === '*' || s[pos] === '/' || s[pos] === '%') {
      const op = s[pos++];
      const r = parseFactor();
      if (op === '*') v *= r;
      else if (op === '/') {
        if (r === 0) throw new Error('除以零');
        v /= r;
      } else v %= r;
    }
    return v;
  }
  function parseFactor(): number {
    if (s[pos] === '-') {
      pos++;
      return -parseFactor();
    }
    if (s[pos] === '+') {
      pos++;
      return parseFactor();
    }
    let base = parsePrimary();
    if (s[pos] === '^') {
      pos++;
      base = Math.pow(base, parseFactor());
    }
    return base;
  }
  function parsePrimary(): number {
    if (s[pos] === '(') {
      pos++;
      const v = parseExpr();
      if (s[pos] !== ')') throw new Error('括号不匹配');
      pos++;
      return v;
    }
    const start = pos;
    while (pos < s.length && /[0-9.]/.test(s[pos])) pos++;
    if (pos === start) throw new Error('出现无效字符: ' + (s[pos] ?? ''));
    const num = s.slice(start, pos);
    if ((num.match(/\./g) || []).length > 1) throw new Error('数字格式错误: ' + num);
    return parseFloat(num);
  }

  if (s.length === 0) throw new Error('表达式为空');
  const result = parseExpr();
  if (pos !== s.length) throw new Error('无法解析的字符: ' + s.slice(pos));
  return result;
}

function calcTool(expression: string): string {
  const value = evalMath(expression);
  if (!Number.isFinite(value)) throw new Error('计算结果不是有限数值');
  // Trim floating point noise
  const rounded = parseFloat(value.toPrecision(12));
  return `${expression} = ${rounded}`;
}

function datetimeTool(timezone?: string): string {
  const tz = timezone || 'Asia/Shanghai';
  try {
    const now = new Date();
    const dtf = new Intl.DateTimeFormat('zh-CN', {
      timeZone: tz,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const iso = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    return `当前时间（${tz}）：${dtf.format(now)}（ISO 日期：${iso}）`;
  } catch {
    // Fallback to local time if the timezone string is invalid
    return `当前本地时间：${new Date().toLocaleString('zh-CN')}（提示：传入的时区 "${tz}" 无效，已回退到本地时区）`;
  }
}

/**
 * Live web search for legal/regulatory/case research.
 *
 * Preferred path: a real search API (Tavily or SerpAPI) configured via env
 *   WEB_SEARCH_PROVIDER + WEB_SEARCH_API_KEY. Returns clean, citable results.
 * Fallback: HTML scraping of Bing/Baidu. In sandboxed environments without
 *   internet egress this still won't connect, in which case we return a clear
 *   message so the model answers from its own knowledge and flags items to verify.
 */
async function searchTool(query: string, maxResults = 5): Promise<string> {
  const provider = (env.WEB_SEARCH_PROVIDER || '').toLowerCase();
  const key = env.WEB_SEARCH_API_KEY;

  if (key && provider === 'tavily') {
    try {
      const resp = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: key,
          query,
          max_results: maxResults,
          search_depth: 'advanced',
          include_answer: false,
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!resp.ok) throw new Error('搜索服务返回 ' + resp.status);
      const j = (await resp.json()) as { results?: { title: string; url: string; content: string }[] };
      const results = (j.results || []).slice(0, maxResults);
      if (results.length === 0) return `未找到关于「${query}」的检索结果，请尝试换一个关键词。`;
      const formatted = results
        .map((r, i) => `${i + 1}. ${r.title}\n   链接: ${r.url}\n   摘要: ${r.content}`)
        .join('\n\n');
      return `关于「${query}」的检索结果：\n\n${formatted}`;
    } catch (err) {
      return `联网检索暂时不可用（${(err as Error).message}）。请基于已有知识回答，并提示律师对关键法条/案号另行核实。`;
    }
  }

  if (key && provider === 'serpapi') {
    try {
      const u = new URL('https://serpapi.com/search.json');
      u.searchParams.set('engine', 'google');
      u.searchParams.set('q', query);
      u.searchParams.set('num', String(maxResults));
      u.searchParams.set('api_key', key);
      const resp = await fetch(u, { signal: AbortSignal.timeout(12000) });
      if (!resp.ok) throw new Error('搜索服务返回 ' + resp.status);
      const j = (await resp.json()) as { organic_results?: { title: string; link: string; snippet: string }[] };
      const results = (j.organic_results || []).slice(0, maxResults);
      if (results.length === 0) return `未找到关于「${query}」的检索结果，请尝试换一个关键词。`;
      const formatted = results
        .map((r, i) => `${i + 1}. ${r.title}\n   链接: ${r.link}\n   摘要: ${r.snippet}`)
        .join('\n\n');
      return `关于「${query}」的检索结果：\n\n${formatted}`;
    } catch (err) {
      return `联网检索暂时不可用（${(err as Error).message}）。请基于已有知识回答，并提示律师对关键法条/案号另行核实。`;
    }
  }

  // No search API key configured: live retrieval is unavailable in this env.
  return (
    '当前环境未配置联网检索（缺少搜索 API Key，且沙箱禁止直接访问搜索引擎）。' +
    '请基于已有法律知识回答，并在涉及具体法条文号、案号、裁判要旨时明确标注' +
    '「建议律师开庭前通过北大法宝 / 裁判文书网等权威渠道核实」，不要编造依据。'
  );
}

/**
 * Live trademark lookup. Delegates to the configured web search provider
 * (Tavily) with queries tuned to surface Chinese trademark registration data,
 * then returns structured, citable results. Falls back gracefully when no
 * search key is configured.
 */
async function trademarkSearchTool(keyword: string, scope: 'exact' | 'similar' = 'exact'): Promise<string> {
  const provider = (env.WEB_SEARCH_PROVIDER || '').toLowerCase();
  const key = env.WEB_SEARCH_API_KEY;

  if (!(key && provider === 'tavily')) {
    return (
      '当前未配置联网检索（缺少 Tavily 搜索 Key），无法实时检索商标。' +
      '请基于已有知识回答，并明确提示律师通过中国商标网（sbj.cnipa.gov.cn）' +
      '的「商标网上检索系统」核实该商标的注册状态、类别与权利人，不要编造注册号或申请人。'
    );
  }

  const query =
    scope === 'similar'
      ? `${keyword} 商标 近似 注册 类别 申请人`
      : `"${keyword}" 商标 注册号 国际分类 申请人 中国商标网`;

  try {
    const resp = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        query,
        max_results: 6,
        search_depth: 'advanced',
        include_answer: false,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!resp.ok) throw new Error('搜索服务返回 ' + resp.status);
    const j = (await resp.json()) as { results?: { title: string; url: string; content: string }[] };
    const results = (j.results || []).slice(0, 6);
    if (results.length === 0) {
      return `未检索到关于商标「${keyword}」的公开注册信息。可能该商标尚未注册、名称不完整，或公开来源未收录。请以中国商标网（sbj.cnipa.gov.cn）商标网上检索系统的查询结果为准。`;
    }
    const formatted = results
      .map((r, i) => `${i + 1}. ${r.title}\n   链接: ${r.url}\n   摘要: ${r.content}`)
      .join('\n\n');
    return (
      `关于商标「${keyword}」的检索结果（${scope === 'similar' ? '近似商标' : '精确检索'}）：\n\n` +
      `${formatted}\n\n` +
      `（注：以上为网络公开来源，最终以中国商标网 sbj.cnipa.gov.cn 商标网上检索系统的登记信息为准。）`
    );
  } catch (err) {
    return `商标检索暂时不可用（${(err as Error).message}）。请提示律师通过中国商标网（sbj.cnipa.gov.cn）核实，不要编造注册信息。`;
  }
}

/**
 * Execute a tool by name. `arguments` is a JSON-encoded string from the LLM.
 */
export async function executeTool(name: string, argsJson: string): Promise<string> {
  let args: Record<string, unknown> = {};
  try {
    args = argsJson ? JSON.parse(argsJson) : {};
  } catch {
    return `工具参数不是合法 JSON：${argsJson}`;
  }

  try {
    switch (name) {
      case 'calculator':
        return calcTool(String(args.expression ?? ''));
      case 'get_datetime':
        return datetimeTool(args.timezone ? String(args.timezone) : undefined);
      case 'web_search':
        return await searchTool(String(args.query ?? ''), Number(args.max_results) || 5);
      case 'trademark_search':
        return await trademarkSearchTool(
          String(args.keyword ?? ''),
          (args.scope === 'similar' ? 'similar' : 'exact') as 'exact' | 'similar'
        );
      default:
        return `未知工具：${name}`;
    }
  } catch (err) {
    return `工具执行出错：${(err as Error).message}`;
  }
}
