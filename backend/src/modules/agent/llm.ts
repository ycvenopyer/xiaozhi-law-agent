import { env } from '../../config/env';
import { TOOLS, executeTool } from './tools';
import { MODEL_REGISTRY, getProviderChain, type ModelProvider } from './providers';
import type { AgentEvent, ChatMessage } from './types';

const SYSTEM_PROMPT = `你是一位资深知识产权律师的私人助理，长期协助其办理知识产权侵权案件，业务涵盖专利、商标、著作权、商业秘密、不正当竞争等领域。你的核心职责是：

1. 证据分析：针对用户「已提供」的证据，分析其证明力、与待证事实的关联性、证明缺口与薄弱环节，并给出质证意见与补强建议；不替用户凭空收集或编造未提供的证据，可在用户提供内容基础上归纳证据清单与证明目的；
2. 辩论稿与法律文书撰写：草拟代理词、辩论意见、起诉状/答辩状要点、质证意见、赔偿计算说明等，要求结构清晰、逻辑严密、用语规范；
3. 法律法规与案例检索：检索相关法条、司法解释、指导性案例与生效裁判，并标注来源（法条写明制定机关与文号，案例写明审理法院、案号与裁判要旨）；
4. 文书与文档分析：对上传的判决书、合同、往来邮件、取证材料等进行归纳、比对与要点摘录。

专业表达要求（务必遵守）：
- 使用规范法律术语与律师执业口吻，回答应呈现"法律依据—事实认定—分析—结论"的严谨结构，善用 Markdown（标题、列表、表格、加粗）提升可读性。
- 引用法条必须写明制定机关、法律名称与条文序号，例如"《中华人民共和国商标法》第五十七条""《最高人民法院关于审理商标民事纠纷案件适用法律若干问题的解释》第九条"；引用案例必须写明审理法院、案号与裁判要旨。
- 涉及赔偿数额、期限、统计数据等需要精确数值时，优先调用计算器或日期时间工具，并列出计算依据与公式，不要凭空估算。
- 文书类输出（如代理词、辩论意见）应使用规范格式：首部（当事人、案由）、事实与理由、法律依据、结论与请求事项。
- 区分"已有充分依据的结论"与"需进一步核实的内容"；对任何无法确认或检索不到的内容，必须明确标注"需进一步核实"，严禁编造法条文号、案号或裁判内容。

信息来源与检索要求：
- 参考资料（每次对话可能随附）为经整理的核心法条与典型案例，应优先据其作答并注明出处；与问题无关的参考资料可不引用。
- 检索节制（务必遵守）：先判断知识库与已有知识能否回答；一般每次提问最多进行 2-3 次联网搜索，收集到足够信息后立即停止检索并输出完整回答，不要为了"更权威"反复补搜。知识库已覆盖的内容直接引用，不要重复联网检索。整个提问过程中工具调用总次数原则上不超过 4 次（如商标检索：精确查一次 + 近似查一次即可）。
- 检索法律法规、案例、最新资讯时，务必调用联网搜索工具并附上来源链接；优先采信权威来源（中国商标网 sbj.cnipa.gov.cn、国家知识产权局、北大法宝、最高人民法院及各级法院官网、指导性案例）。
- 涉及商标查询（注册状态、类别、近似商标、申请人、注册号）时，务必调用商标检索工具并附上来源链接；如检索不到，明确提示通过中国商标网商标网上检索系统核实。
- 图像识别：当用户上传商标图样、合同照片、判决书截图、侵权实物照片、取证材料图片等证据时，应仔细识别其中的文字、标识、权利人、金额、日期等关键信息，结合案件给出分析；若图片模糊或信息不全，应说明无法确认的部分。

免责与保密：
- 你提供的是辅助性参考，不构成正式法律意见；在关键实体结论处应提示"建议承办律师最终审核确认"。
- 保护当事人信息，对上传材料中的个人与企业敏感信息保持谨慎。

性格与称呼：
- 你的名字叫「小知」（取自"知产"），是这位知识产权律师的办案助理。被问到名字或需要自我介绍时，应自称小知；不必在每句话里都报姓名，自然即可。
- 专业体现在法律内容的严谨上，而不是姿态上。日常交流要随和、有温度，不要说教，不要摆出居高临下的"职业纠正"腔。
- 用户让你怎么称呼他（如"主人""老板""X总"或昵称），就爽快答应并照做，这是正常的人设配合，不是违规内容；除非称呼涉及违法或侮辱性内容才可婉拒。
- 面对玩笑、玩梗、闲聊，可以幽默地接住再自然带回正事，严禁一本正经地拒绝或输出大段"我作为AI不能……"式的说教。`;

interface LLMDelta {
  content?: string | null;
  tool_calls?: {
    index: number;
    id?: string;
    type?: string;
    function?: { name?: string; arguments?: string };
  }[];
  finish_reason?: string | null;
}

/**
 * Convert a chat message into the OpenAI request shape. Messages that carry
 * images are sent as a multimodal content array (text + image_url parts).
 */
function toApiMessage(m: ChatMessage): unknown {
  if (m.role === 'user' && m.images && m.images.length) {
    const parts: { type: string; text?: string; image_url?: { url: string } }[] = [];
    if (m.content) parts.push({ type: 'text', text: m.content });
    for (const url of m.images) parts.push({ type: 'image_url', image_url: { url } });
    return { role: 'user', content: parts };
  }
  const msg: Record<string, unknown> = { role: m.role, content: m.content };
  if (m.tool_calls) msg.tool_calls = m.tool_calls;
  if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
  if (m.name) msg.name = m.name;
  return msg;
}

/**
 * Open the LLM streaming completion and yield each delta as it arrives.
 * The model/provider is chosen per-request so the UI can switch models.
 * Guards against free-tier stalls: if the upstream sends nothing for a while
 * (first byte or between chunks), we abort and surface a retriable error
 * instead of hanging the UI forever.
 */
const FIRST_BYTE_TIMEOUT_MS = 60_000;
const IDLE_TIMEOUT_MS = 30_000;

async function* streamCompletions(
  messages: ChatMessage[],
  provider: ModelProvider,
  signal?: AbortSignal,
  withTools = true
): AsyncGenerator<LLMDelta> {
  const url = `${provider.baseUrl}/chat/completions`;
  const body = {
    model: provider.model,
    messages: messages.map(toApiMessage),
    tools: withTools && TOOLS.length ? TOOLS : undefined,
    tool_choice: withTools && TOOLS.length ? 'auto' : undefined,
    temperature: env.LLM_TEMPERATURE,
    max_tokens: env.LLM_MAX_TOKENS,
    stream: true,
    stream_options: { include_usage: true },
  };

  // Local controller so idle timeouts and early exits release the socket even
  // when the caller's signal is still alive.
  const localAc = new AbortController();
  const onOuterAbort = () => localAc.abort();
  if (signal) {
    if (signal.aborted) localAc.abort();
    else signal.addEventListener('abort', onOuterAbort);
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: localAc.signal,
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      throw new Error(`LLM 请求失败 (${res.status}): ${text.slice(0, 400)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let firstChunk = true;

    const readChunk = (): Promise<{ done: boolean; value?: Uint8Array }> =>
      new Promise((resolve, reject) => {
        const ms = firstChunk ? FIRST_BYTE_TIMEOUT_MS : IDLE_TIMEOUT_MS;
        const timer = setTimeout(() => {
          reject(new Error('UPSTREAM_IDLE_TIMEOUT'));
        }, ms);
        reader.read().then(
          (v) => {
            clearTimeout(timer);
            firstChunk = false;
            resolve(v);
          },
          (e) => {
            clearTimeout(timer);
            reject(e);
          }
        );
      });

    while (true) {
      const { done, value } = await readChunk();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') return;
        try {
          const json = JSON.parse(data);
          const delta: LLMDelta | undefined = json.choices?.[0]?.delta;
          if (delta) yield delta;
        } catch {
          // ignore incomplete/partial JSON line
        }
      }
    }
  } finally {
    if (signal) signal.removeEventListener('abort', onOuterAbort);
    localAc.abort();
  }
}

/**
 * Translate raw upstream errors into clear Chinese guidance. English messages
 * are avoided where possible so browser auto-translate cannot garble them.
 */
function friendlyError(msg: string): string {
  if (/fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|socket hang up|network/i.test(msg)) {
    return '暂时连不上模型服务（网络波动），请稍等几秒后重发一次';
  }
  if (/BodyStreamBuffer|UPSTREAM_IDLE_TIMEOUT|stream.*(abort|terminat)|premature close/i.test(msg)) {
    return '模型输出流中途被掐断（免费模型不稳定）。已自动尝试续写；若内容不完整，请点"重新生成"再来一次';
  }
  if (/\b429\b|rate.?limit/i.test(msg)) {
    return '免费模型暂时限流（或今日免费额度已用完）。可稍后重试、切换其他免费模型，或等北京时间次日早上8点额度重置';
  }
  return `生成失败：${msg.slice(0, 200)}`;
}

export { friendlyError };

/** System prompt that drives structured dossier extraction from raw files. */
const EXTRACT_PROMPT = `你是资深知识产权律师的助理。请从下面提供的"卷宗材料"中提取结构化信息。
只输出一个 JSON 对象（不要任何解释、不要 Markdown 代码块、不要数组）。字段全部输出字符串：
{ "parties": "当事人", "cause": "案由", "facts": "核心事实", "claims": "诉讼请求", "evidence": "证据清单" }
要求：
- facts / claims / evidence 字段如要点较多，请用"；"或编号"1. 2. 3."等中文标点在同一字符串内拼接，不要输出数组；
- cause（案由）必须且只能从以下选项中选一个最贴切的：商标侵权、专利侵权、著作权侵权、不正当竞争、商业秘密、其他；
- parties（当事人）：逐行列明诉讼地位与身份，如"原告：某某公司（注册商标权人）"；
- facts（核心事实）：即使材料没有"事实"小标题，也要从叙述中主动归纳时间线、关键行为（权利基础、被诉商品、使用与销售行为等）与各方主张，禁止因材料是叙述体而留空；
- claims（诉讼请求）：提取起诉方明确提出的请求（如停止侵权、赔偿损失、消除影响）；若材料含"判决如下/判令"等判项，按判项归纳；
- evidence（证据清单）：逐项列出材料提到的合同、公证书、发票、照片等证据及证明目的，格式"证据——证明目的"；
- 严格忠实于原文，不得编造当事人、金额、案号等信息；确实完全未提及的字段才填空字符串。`;

interface JsonMessage {
  role: string;
  content: unknown;
}

/**
 * One-shot (non-streaming) completion that must return parseable JSON. Falls
 * back to extracting the first {...} span when the model wraps output in fences.
 */
async function completeJson(
  messages: JsonMessage[],
  provider: ModelProvider,
  signal?: AbortSignal
): Promise<Record<string, string>> {
  const url = `${provider.baseUrl}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature: 0.2,
      max_tokens: 4000,
      stream: false,
    }),
    signal,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`LLM 请求失败 (${res.status}): ${t.slice(0, 400)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content || '{}';
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < 0) {
    throw new Error(
      `模型未返回可解析的 JSON，返回片段：${content.slice(0, 200)}`
    );
  }
  const obj = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, string>;
  // Guard against the model accidentally returning a non-object (array/null/string).
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error(`模型返回的不是对象：${content.slice(0, 200)}`);
  }
  return obj;
}

/**
 * Extract a structured case dossier from uploaded material (text or images).
 * Tries each model in the provider chain so a transient free-tier failure on
 * one model transparently falls back to the next.
 */
export async function extractDossier(
  input: { text?: string; images?: string[] },
  signal?: AbortSignal
): Promise<Record<string, string>> {
  const parts: unknown[] = [
    { type: 'text', text: EXTRACT_PROMPT + '\n\n【卷宗材料】\n' + (input.text || '（见所附图片）') },
  ];
  if (input.images?.length) {
    for (const u of input.images) parts.push({ type: 'image_url', image_url: { url: u } });
  }
  const messages: JsonMessage[] = [{ role: 'user', content: parts }];
  const hasImages = (input.images?.length ?? 0) > 0;
  const chain = getProviderChain(MODEL_REGISTRY[0], hasImages);

  let lastErr: unknown;
  for (const provider of chain) {
    try {
      return await completeJson(messages, provider, signal);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error('卷宗提取失败');
}

/**
 * Ask the same model to continue a truncated answer. Streams the continuation
 * through `onToken`; returns true if any new text arrived.
 */
async function continueBrokenStream(
  history: ChatMessage[],
  partial: string,
  provider: ModelProvider,
  signal: AbortSignal | undefined,
  onToken: (t: string) => void
): Promise<boolean> {
  const contMessages: ChatMessage[] = [
    ...history,
    { role: 'assistant', content: partial },
    {
      role: 'user',
      content:
        '你上一条回复在输出中途被意外截断。请直接从截断处继续输出剩余内容：不要重复任何已输出的文字，不要重新开头或致歉，直接续写。',
    },
  ];
  try {
    let any = false;
    for await (const delta of streamCompletions(contMessages, provider, signal, false)) {
      if (delta.content) {
        any = true;
        onToken(delta.content);
      }
    }
    return any;
  } catch {
    return false;
  }
}

/**
 * Run a full agent turn: stream the assistant reply, and if the model calls
 * tools, execute them and feed results back until a final answer is produced.
 * `onEvent` receives SSE-friendly events for the browser.
 */
export async function runAgent(
  history: ChatMessage[],
  onEvent: (e: AgentEvent) => void,
  signal?: AbortSignal,
  provider: ModelProvider = MODEL_REGISTRY[0],
  knowledge?: string,
  dossier?: string
): Promise<void> {
  // Ensure a system persona is present. Inject the case dossier (this matter's
  // background) and the curated knowledge base (laws/cases) so the model reasons
  // from the actual case rather than answering in the abstract.
  let systemPrompt = SYSTEM_PROMPT;
  const dossierText = dossier?.trim();
  const knowledgeText = knowledge?.trim();
  if (dossierText) {
    systemPrompt += `\n\n【本案卷宗（当前正在办理的案件背景，回答时应始终结合本案当事人、案由、事实与诉讼请求，避免脱离案情泛泛而谈；如卷宗信息不足，应提示承办律师补充）】\n${dossierText}\n【卷宗结束】`;
  }
  if (knowledgeText) {
    systemPrompt += `\n\n【参考资料（经整理的核心法条与典型案例，应优先据此作答并注明出处；与问题无关可不引用）】\n${knowledgeText}\n【参考资料结束】`;
  }

  const messages: ChatMessage[] =
    history[0]?.role === 'system'
      ? history.map((m) => ({ ...m }))
      : [{ role: 'system', content: systemPrompt }, ...history.map((m) => ({ ...m }))];

  const MAX_ROUNDS = 3;
  /** Cap per-tool-result length so stacked searches cannot overflow the model context. */
  const TOOL_RESULT_LIMIT = 2400;
  const clip = (s: string) => (s.length > TOOL_RESULT_LIMIT ? s.slice(0, TOOL_RESULT_LIMIT) + '\n…（结果过长已截断）' : s);
  // Transient upstream failures (free-tier rate limits, network blips) are
  // worth retrying on another free model instead of surfacing an error.
  const RETRYABLE = /\b429\b|rate.?limit|Provider returned error|fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|socket hang up|\b50[234]\b|UPSTREAM_IDLE_TIMEOUT|BodyStreamBuffer|premature close|terminated/i;
  // Stream breaks that can be healed by asking the model to continue from
  // where it stopped (some partial text was already shown to the user).
  const CONTINUABLE = /UPSTREAM_IDLE_TIMEOUT|BodyStreamBuffer|premature close|terminated|ECONNRESET|socket hang up|fetch failed|network|ETIMEDOUT/i;
  const hasImages = messages.some((m) => Array.isArray(m.images) && m.images.length > 0);
  const chain = getProviderChain(provider, hasImages);
  // How many extra full-chain passes we may take (with backoff) when every
  // candidate failed transiently and nothing was shown to the user yet.
  let backoffRounds = 0;
  // Whether we have already nudged the model to stop searching and answer.
  let nudged = false;
  // Whether any tool has run in this turn — after that, a mid-loop failure
  // should fall through to the forced final answer instead of erroring out.
  let executedTools = false;
  // Remember the last successfully streaming provider so the forced final
  // answer (below) uses a model that is currently working.
  let lastProvider: ModelProvider | null = null;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    if (signal?.aborted) return;

    const assistant: ChatMessage = { role: 'assistant', content: '' };

    // Try each provider in the chain until one streams successfully. Retry is
    // only safe before any token has been shown, otherwise we could duplicate
    // partially-streamed text.
    let streamErr: unknown = null;
    for (const candidate of chain) {
      if (signal?.aborted) return;
      assistant.content = '';
      const acc: Record<number, { id?: string; type?: string; function: { name?: string; arguments: string } }> = {};

      try {
        for await (const delta of streamCompletions(messages, candidate, signal, true)) {
          if (delta.content) {
            assistant.content = (assistant.content || '') + delta.content;
            onEvent({ type: 'token', content: delta.content });
          }
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const i = tc.index;
              if (!acc[i]) acc[i] = { function: { arguments: '' } };
              if (tc.id) acc[i].id = tc.id;
              if (tc.type) acc[i].type = tc.type;
              if (tc.function?.name) acc[i].function.name = tc.function.name;
              if (tc.function?.arguments) acc[i].function.arguments += tc.function.arguments;
            }
          }
        }

        const toolCalls = Object.values(acc);
        if (toolCalls.length === 0) {
          messages.push(assistant);
          onEvent({ type: 'done' });
          return;
        }

        assistant.tool_calls = toolCalls.map((t) => ({
          id: t.id || `call_${Math.random().toString(36).slice(2)}`,
          type: (t.type as 'function') || 'function',
          function: { name: t.function.name || '', arguments: t.function.arguments || '{}' },
        }));
        messages.push(assistant);

        for (const tc of assistant.tool_calls) {
          const name = tc.function.name;
          const args = tc.function.arguments;
          onEvent({ type: 'tool_start', id: tc.id, name, arguments: args });
          const result = await executeTool(name, args);
          onEvent({ type: 'tool_end', id: tc.id, name, result });
          messages.push({ role: 'tool', tool_call_id: tc.id, content: clip(result) });
          executedTools = true;
        }
        // 检索节制：已经过多轮检索后，明确要求模型停止搜索、直接作答。
        const toolRoundCount = messages.filter(
          (m) => m.role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length > 0
        ).length;
        if (toolRoundCount >= 2 && !nudged) {
          nudged = true;
          messages.push({
            role: 'user',
            content:
              '已经完成多轮检索，现有信息通常已足够。请立即停止调用工具，直接基于以上检索结果输出完整、结构化的最终回答（法律依据—分析—结论），并附来源链接；检索不到的内容标注"需进一步核实"。',
          });
        }
        streamErr = null;
        lastProvider = candidate;
        break;
      } catch (err) {
        streamErr = err;
        const msg = String((err as Error)?.message || err);
        const produced = Boolean(assistant.content) || Object.keys(acc).length > 0;
        // Partial text already streamed and the upstream broke mid-answer
        // (free-model instability): ask the SAME model to continue from the
        // cut point instead of failing the turn and losing what was shown.
        if (
          assistant.content &&
          !signal?.aborted &&
          CONTINUABLE.test(msg)
        ) {
          const ok = await continueBrokenStream(
            messages,
            assistant.content,
            candidate,
            signal,
            (t) => {
              assistant.content += t;
              onEvent({ type: 'token', content: t });
            }
          );
          if (ok) {
            messages.push(assistant);
            onEvent({ type: 'done' });
            return;
          }
        }
        if (signal?.aborted || produced || !RETRYABLE.test(msg)) break;
        // Transient failure with nothing shown yet — transparently fall back
        // to the next free model in the chain.
      }
    }

    if (streamErr) {
      const msg = String((streamErr as Error)?.message || streamErr);
      const produced = Boolean(assistant.content);
      // Every candidate failed transiently before showing anything: pause
      // briefly (upstream free pools often clear within seconds) and retry
      // the whole chain instead of erroring out immediately.
      if (!produced && !signal?.aborted && RETRYABLE.test(msg) && backoffRounds < 2) {
        backoffRounds++;
        await new Promise((r) => setTimeout(r, 2500 * backoffRounds));
        streamErr = null;
        continue;
      }
      // Tools already ran this turn: don't lose the gathered results — drop
      // through to the forced final answer below instead of erroring out.
      if (!produced && executedTools) {
        break;
      }
      throw new Error(friendlyError(msg));
    }
  }

  // 工具调用轮次用尽仍未见最终回答（模型一直在检索）：强制禁用工具，
  // 让模型基于已获取的检索结果直接输出完整回答，避免"只搜索不输出"。
  if (!signal?.aborted) {
    const preferred = lastProvider ?? provider;
    const finalChain = [preferred, ...chain.filter((c) => c !== preferred)];
    const finalMessages: ChatMessage[] = [
      ...messages,
      {
        role: 'user',
        content:
          '检索轮次已达上限，请立即停止调用任何工具。请综合以上全部检索结果与知识库内容，直接输出完整、结构化的最终回答（法律依据—事实认定—分析—结论），法条与案例附来源链接；检索不到的部分标注"需进一步核实"。',
      },
    ];
    let streamedAny = false;
    let lastErr: unknown = null;
    for (const fp of finalChain) {
      if (signal?.aborted) return;
      try {
        for await (const delta of streamCompletions(finalMessages, fp, signal, false)) {
          if (delta.content) {
            streamedAny = true;
            onEvent({ type: 'token', content: delta.content });
          }
        }
        if (streamedAny) break;
      } catch (err) {
        if (signal?.aborted) return;
        lastErr = err;
      }
    }
    if (!streamedAny && !signal?.aborted) {
      // Even the forced final answer failed on every model: say so explicitly
      // instead of leaving the user with searches and no output.
      const reason = lastErr ? friendlyError(String((lastErr as Error)?.message || lastErr)) : '模型未返回内容';
      onEvent({
        type: 'token',
        content: `⚠️ 检索已完成，但生成最终回答时所有备用模型都暂时不可用（${reason}）。请稍等几秒后点击"重新生成"，已获取的检索结果会重新利用。`,
      });
    }
  }

  onEvent({ type: 'done' });
}
