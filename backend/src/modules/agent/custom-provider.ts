import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { BlockList, isIP } from 'node:net';
import { Readable } from 'node:stream';
import { z } from 'zod';
import { AppError } from '../../middleware/errorHandler';
import type { ModelProvider } from './providers';

export const customModelSchema = z.object({
  baseUrl: z.string().trim().max(500),
  model: z.string().trim().min(1).max(200),
  apiKey: z.string().trim().min(1).max(1024).regex(/^[!-~]+$/),
  vision: z.boolean(),
  tools: z.boolean(),
});

const reserved = new BlockList();
reserved.addSubnet('0.0.0.0', 8);
reserved.addSubnet('10.0.0.0', 8);
reserved.addSubnet('100.64.0.0', 10);
reserved.addSubnet('127.0.0.0', 8);
reserved.addSubnet('169.254.0.0', 16);
reserved.addSubnet('172.16.0.0', 12);
reserved.addSubnet('192.0.0.0', 24);
reserved.addSubnet('192.0.2.0', 24);
reserved.addSubnet('192.88.99.0', 24);
reserved.addSubnet('192.168.0.0', 16);
reserved.addSubnet('198.18.0.0', 15);
reserved.addSubnet('198.51.100.0', 24);
reserved.addSubnet('203.0.113.0', 24);
reserved.addSubnet('224.0.0.0', 3);

export function customProvider(id: string, config: z.infer<typeof customModelSchema>): ModelProvider {
  let url: URL;
  try {
    url = new URL(config.baseUrl);
  } catch {
    throw new AppError(400, '请输入有效的 HTTPS Base URL。');
  }
  const host = url.hostname.replace(/\.$/, '');
  if (url.protocol !== 'https:' || url.port || url.username || url.password || url.search || url.hash ||
      !host.includes('.') || isIP(host) || host.endsWith('.localhost') ||
      host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.home.arpa')) {
    throw new AppError(400, 'Base URL 需要使用公网 HTTPS 域名和默认端口，地址中请勿填写密钥或查询参数。');
  }
  url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
  const baseUrl = url.href.replace(/\/$/, '');
  return {
    id, label: config.model, baseUrl, model: config.model, apiKey: config.apiKey,
    free: false, vision: config.vision, tools: config.tools,
    async completion(body, signal) {
      // Pin a checked IP for the actual TLS connection. Do not follow redirects
      // or forward application cookies, auth tokens or headers to the provider.
      const addresses = await lookup(host, { family: 4, all: true });
      signal.throwIfAborted();
      if (!addresses.length || addresses.some(({ address }) => reserved.check(address))) {
        throw new Error('模型服务域名未解析为公网 IPv4 地址。');
      }
      return new Promise<Response>((resolve, reject) => {
        const destination = new URL(`${baseUrl}/chat/completions`);
        const outgoing = request({
          hostname: addresses[0].address,
          servername: host,
          port: 443,
          path: destination.pathname,
          method: 'POST',
          agent: false,
          signal,
          headers: {
            Host: host,
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            Accept: 'text/event-stream',
          },
        }, incoming => {
          if (incoming.statusCode !== 200 || !incoming.headers['content-type']?.includes('text/event-stream')) {
            incoming.destroy();
            reject(new Error('模型接口未返回 OpenAI 兼容的流式响应。'));
            return;
          }
          resolve(new Response(Readable.toWeb(incoming) as ReadableStream<Uint8Array>));
        });
        outgoing.setTimeout(60_000, () => outgoing.destroy(new Error('UPSTREAM_IDLE_TIMEOUT')));
        outgoing.once('error', reject);
        outgoing.end(body);
      });
    },
  };
}
