import { z } from 'zod';
import { AppError } from '../../middleware/errorHandler';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
});
const sourceSchema = z.object({
  title: z.string().trim().min(1),
  url: z.string().url().refine(url => /^https?:\/\//i.test(url)),
  published_date: z.string(),
  content: z.string().optional(),
});

function publicationDate(value: string) {
  const date = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const timestamp = Date.parse(date);
  return Number.isNaN(timestamp) ? '' : dateFormatter.format(timestamp);
}

export async function findIpNews(apiKey: string, signal: AbortSignal) {
  const date = dateFormatter.format(new Date());
  const query = `${date} 中国知识产权新闻：专利、商标、版权、商业秘密、政策和司法裁判`;
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    redirect: 'error',
    signal,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      topic: 'news',
      search_depth: 'basic',
      max_results: 20,
      time_range: 'day',
      include_published_date: true,
      include_answer: false,
      include_raw_content: false,
    }),
  });
  if (!response.ok) {
    await response.body?.cancel();
    if (response.status === 401 || response.status === 403) {
      throw new AppError(403, 'Tavily 拒绝了请求，请在联网搜索设置中核对 API Key 和权限。');
    }
    if (response.status === 432) throw new AppError(429, 'Tavily 额度不足，请检查你的 Tavily 账户。');
    if (response.status === 429) throw new AppError(429, 'Tavily 搜索频率受限，请稍后重试。');
    throw new AppError(502, 'Tavily 暂时无法完成搜索，请稍后重试。');
  }

  const body = z.object({ results: z.array(z.unknown()) }).safeParse(await response.json());
  if (!body.success) throw new AppError(502, 'Tavily 返回的新闻格式异常，请稍后重试。');

  const seen = new Set<string>();
  const articles = [];
  for (const item of body.data.results) {
    const source = sourceSchema.safeParse(item);
    if (!source.success) continue;
    const { title, url: link, published_date, content = '' } = source.data;
    const url = new URL(link);
    url.hash = '';
    if (url.username || url.password || publicationDate(published_date) !== date || seen.has(url.href)) continue;
    if (!/知识产权|专利|商标|著作权|版权|商业秘密|地理标志|反不正当竞争/.test(title + content)) continue;
    seen.add(url.href);
    articles.push({ title: title.slice(0, 200), url: url.href, source: url.hostname, summary: content.trim().slice(0, 220) });
    if (articles.length === 8) break;
  }
  return { date, articles };
}
