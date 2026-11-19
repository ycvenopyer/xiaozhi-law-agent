import { searchWeb } from './ip-news';
import { translationLanguages } from '../../../../shared/document-tools.mjs';
import type { ModelProvider } from './providers';
import type { ToolDefinition } from './types';

/**
 * Tool catalogue exposed to the LLM. The model decides when to call these.
 */
export const TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'file_parse',
      description: '按结构提取当前用户提供的判决书、起诉状、合同或公证书正文，返回当事人、案号、要旨、金额、原文引用法条、关键日期及可核对的原文片段。',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'professional_translate',
      description: '使用内置知识产权术语库翻译当前用户提供的正文。仅在用户明确要求翻译时调用。若只翻译其中一段，可提供原文片段。',
      parameters: { type: 'object', properties: {
        targetLanguage: { type: 'string', enum: Object.keys(translationLanguages), description: '目标语言代码（zh、en、ja、ko、fr、de、es）。' },
        excerpt: { type: 'string', description: '可选，逐字复制待译片段。整份文件翻译时省略。' },
      }, required: ['targetLanguage'] },
    },
  },
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
];

const webSearch: ToolDefinition = {
  type: 'function',
  function: {
    name: 'web_search',
    description: '搜索公开网页。请用公开关键词概括问题，避免发送案件中的个人信息或未公开材料。',
    parameters: { type: 'object', properties: { query: { type: 'string', description: '搜索关键词' } }, required: ['query'] },
  },
};

export function availableTools(searchEnabled = false): ToolDefinition[] {
  return searchEnabled ? [...TOOLS, webSearch] : TOOLS;
}

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
 * Execute a tool by name. `arguments` is a JSON-encoded string from the LLM.
 */
export async function executeTool(
  name: string,
  argsJson: string,
  tavilyKey?: string,
  signal?: AbortSignal,
  document?: { provider: ModelProvider; source: string },
): Promise<string> {
  let args: Record<string, unknown> = {};
  try {
    args = argsJson ? JSON.parse(argsJson) : {};
  } catch {
    return `工具参数不是合法 JSON：${argsJson}`;
  }

  try {
    switch (name) {
      case 'web_search':
        if (!tavilyKey) return '未知工具：web_search（未配置 Tavily Key）';
        if (typeof args.query !== 'string' || !args.query.trim() || args.query.length > 400) return '请提供 400 字以内的搜索词。';
        return await searchWeb(tavilyKey, args.query.trim(), signal);
      case 'calculator':
        return calcTool(String(args.expression ?? ''));
      case 'get_datetime':
        return datetimeTool(args.timezone ? String(args.timezone) : undefined);
      case 'file_parse':
      case 'professional_translate': {
        if (!document?.source.trim()) return '请先上传文档或粘贴正文。';
        const { documentToolSchema, DocumentToolError, runDocumentTool } = await import('./document-tools');
        const parsed = documentToolSchema.safeParse({ name, targetLanguage: args.targetLanguage });
        if (!parsed.success) return '请指定支持的目标语言。';
        const excerpt = typeof args.excerpt === 'string' ? args.excerpt.trim() : '';
        if (excerpt && !document.source.includes(excerpt)) return '译文片段须逐字来自用户提供的原文。';
        let result = '';
        try {
          await runDocumentTool(parsed.data, excerpt || document.source, document.provider, signal, text => { result += text; });
          return result;
        } catch (error) {
          if (signal?.aborted && result) return result;
          return error instanceof DocumentToolError ? error.message : '文档处理失败，请核对原文后重试。';
        }
      }
      default:
        return `未知工具：${name}`;
    }
  } catch (err) {
    return `工具执行出错：${(err as Error).message}`;
  }
}
