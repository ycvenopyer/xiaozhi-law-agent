import type { ToolDefinition } from './types';
import { SKILL_CATALOG, loadSkill } from './skills';

/**
 * Tool catalogue exposed to the LLM. The model decides when to call these.
 * Skills load trusted instructions; no public-web search adapter is installed.
 */
export const TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'load_skill',
      description: '按任务需要加载一个内置 Skill 的完整工作规范。可用于法条、案例、知产新闻整理、合同起草与审核；不会访问网络或增加权限。',
      parameters: {
        type: 'object',
        properties: {
          skill_id: { type: 'string', description: '要加载的技能 ID', enum: SKILL_CATALOG.map(skill => skill.id) },
        },
        required: ['skill_id'],
      },
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

export function availableTools(): ToolDefinition[] {
  return TOOLS;
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
export async function executeTool(name: string, argsJson: string): Promise<string> {
  let args: Record<string, unknown> = {};
  try {
    args = argsJson ? JSON.parse(argsJson) : {};
  } catch {
    return `工具参数不是合法 JSON：${argsJson}`;
  }

  try {
    switch (name) {
      case 'load_skill':
        return loadSkill(String(args.skill_id ?? ''));
      case 'calculator':
        return calcTool(String(args.expression ?? ''));
      case 'get_datetime':
        return datetimeTool(args.timezone ? String(args.timezone) : undefined);
      default:
        return `未知工具：${name}`;
    }
  } catch (err) {
    return `工具执行出错：${(err as Error).message}`;
  }
}
