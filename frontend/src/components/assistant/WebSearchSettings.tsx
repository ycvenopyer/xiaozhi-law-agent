import { useState, type FormEvent } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { setTavilyKey } from '@/lib/tavily-key';

interface Props {
  accountId: string;
  configured: boolean;
  onChange: (configured: boolean) => void;
}

export function WebSearchSettings({ accountId, configured, onChange }: Props) {
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  function updateKey(apiKey: string) {
    setError('');
    setNotice('');
    try {
      setTavilyKey(accountId, apiKey);
      onChange(Boolean(apiKey));
      setDraft('');
      setNotice(apiKey ? '当前标签页已保存 API Key。' : '已移除 API Key。');
    } catch {
      setError('无法访问当前标签页的会话存储，请检查浏览器设置后重试。');
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const apiKey = draft.trim();
    if (!/^[!-~]{1,512}$/.test(apiKey)) {
      setNotice('');
      setError('请输入有效的 Tavily API Key，Key 中间不能有空格。');
      return;
    }
    updateKey(apiKey);
  }

  return (
    <section className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Tavily 网页搜索</h3>
        <span className={`text-xs ${configured ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
          {configured ? '已配置' : '未配置'}
        </span>
      </div>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">
        用于事务台的今日知产新闻。Key 保存在当前标签页，退出登录时清除。
      </p>
      <form onSubmit={save} className="mt-4 space-y-3">
        <label className="block text-sm">
          Tavily API Key
          <input
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            type="password"
            autoComplete="off"
            maxLength={512}
            placeholder={configured ? '输入新的 Key 以替换' : '粘贴你的 Tavily API Key'}
            value={draft}
            onChange={event => setDraft(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={!draft.trim()} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">保存 Key</button>
          {configured && <button type="button" onClick={() => updateKey('')} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">移除 Key</button>}
          <a href="https://app.tavily.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-2 text-xs text-muted-foreground hover:text-primary">
            获取 Tavily Key <ArrowUpRight aria-hidden="true" className="size-3" />
          </a>
        </div>
        {notice && <p role="status" className="text-xs text-muted-foreground">{notice}</p>}
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </form>
    </section>
  );
}
