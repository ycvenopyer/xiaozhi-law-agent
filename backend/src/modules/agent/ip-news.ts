import { z } from 'zod';
import { AppError } from '../../middleware/errorHandler';
import { ZHIPU_BASE, type ModelProvider } from './providers';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
});
const sourceSchema = z.object({
  title: z.string().trim().min(1),
  link: z.string().url().refine(link => /^https?:\/\//i.test(link)),
  publish_date: z.string(),
  media: z.string().optional(),
  content: z.string().optional(),
});

function publicationDate(value: string) {
  if (/T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    const timestamp = new Date(value);
    return Number.isNaN(timestamp.getTime()) ? '' : dateFormatter.format(timestamp);
  }
  const parts = value.trim().match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})(?!\d)/);
  return parts && `${parts[1]}-${parts[2].padStart(2, '0')}-${parts[3].padStart(2, '0')}`;
}

export async function findIpNews(provider: ModelProvider, signal: AbortSignal) {
  if (provider.baseUrl !== ZHIPU_BASE) {
    throw new AppError(400, '当前供应商暂未接入实时新闻搜索。请在输入框选择智谱模型后重试。');
  }
  const date = dateFormatter.format(new Date());
  const query = `${date} 中国知识产权新闻和公告，包括专利、商标、版权、商业秘密、政策和司法裁判`;
  const response = await fetch(`${ZHIPU_BASE}/chat/completions`, {
    method: 'POST',
    redirect: 'error',
    signal,
    headers: { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: provider.model,
      messages: [{ role: 'user', content: `检索${query}。优先查找主管部门、法院和可信媒体发布的新闻。只检索当天发布的消息。` }],
      stream: false,
      max_tokens: 1024,
      tools: [{
        type: 'web_search',
        web_search: {
          enable: true, require_search: true, search_engine: 'search_std',
          search_query: query, search_recency_filter: 'oneDay', search_result: true, count: 20,
        },
      }],
    }),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new AppError(502, '智谱搜索请求未成功。请核对当前模型是否支持联网，以及账号额度。');
  }

  const body = z.object({ web_search: z.array(z.unknown()) }).safeParse(await response.json());
  if (!body.success) {
    throw new AppError(502, '当前模型未返回实时搜索来源。请尝试切换智谱模型后重试。');
  }
  const seen = new Set<string>();
  const articles = [];
  for (const item of body.data.web_search) {
    const source = sourceSchema.safeParse(item);
    if (!source.success) continue;
    const { title, link, publish_date, media, content } = source.data;
    const url = new URL(link);
    url.hash = '';
    if (url.username || url.password || publicationDate(publish_date) !== date || seen.has(url.href)) continue;
    if (!/知识产权|专利|商标|著作权|版权|商业秘密|地理标志|反不正当竞争/.test(title + (content ?? ''))) continue;
    seen.add(url.href);
    articles.push({ title: title.slice(0, 200), url: url.href, source: media?.trim().slice(0, 60) || url.hostname,
      summary: content?.trim().slice(0, 220) || '' });
    if (articles.length === 8) break;
  }
  return { date, articles };
}
