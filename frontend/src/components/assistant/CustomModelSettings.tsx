import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Bot, Pencil, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { getModelKey, testCustomModel, type CustomModel } from '@/lib/custom-models';

const presets = [
  { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1' },
  { name: 'SiliconFlow', url: 'https://api.siliconflow.cn/v1' },
  { name: '智谱 AI', url: 'https://open.bigmodel.cn/api/paas/v4' },
];
const field = 'mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary';
const button = 'inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50';
const emptyModel = (): CustomModel => ({
  id: `custom-${crypto.randomUUID()}`, provider: '', label: '', baseUrl: '', model: '', vision: false, tools: false,
});

interface Props {
  accountId: string;
  models: CustomModel[];
  onClose: () => void;
  onSave: (model: CustomModel, key: string) => void;
  onDelete: (id: string) => void;
}

export function CustomModelSettings({ accountId, models, onClose, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState<CustomModel | null>(() => models.length ? null : emptyModel());
  const [apiKey, setApiKey] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);
  const activeTest = useRef<AbortController | null>(null);
  useEffect(() => () => activeTest.current?.abort(), []);

  function edit(model: CustomModel | null) {
    setDraft(model);
    setApiKey('');
    setNotice('');
    setError('');
  }

  function update(patch: Partial<CustomModel>) {
    setDraft(previous => previous && { ...previous, ...patch });
    setNotice('');
    setError('');
  }

  function configuration() {
    if (!draft) throw new Error('请先添加模型。');
    const model = {
      ...draft, provider: draft.provider.trim(), model: draft.model.trim(),
      label: draft.label.trim() || draft.model.trim(), baseUrl: draft.baseUrl.trim(),
    };
    let url: URL;
    try { url = new URL(model.baseUrl); }
    catch { throw new Error('请输入有效的 HTTPS Base URL。'); }
    const host = url.hostname.replace(/\.$/, '');
    if (url.protocol !== 'https:' || url.port || url.username || url.password || url.search || url.hash ||
        !host.includes('.') || /^[\d.]+$/.test(host) || host.endsWith('.localhost') ||
        host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.home.arpa')) {
      throw new Error('请填写公网 HTTPS 接口地址，使用默认端口，且不带查询参数。');
    }
    model.baseUrl = url.href.replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
    const key = apiKey.trim() || getModelKey(accountId, model);
    if (!model.provider || !model.model || !/^[!-~]{1,1024}$/.test(key)) {
      throw new Error('请填写厂商、模型 ID 和有效的 API Key。修改接口地址后需重新填写 Key。');
    }
    return { model, key };
  }

  function save(event: FormEvent) {
    event.preventDefault();
    if (testing) return;
    try {
      const { model, key } = configuration();
      onSave(model, key);
      edit(null);
      setNotice(`已保存并选中 ${model.label}。`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败。');
    }
  }

  async function test() {
    setError('');
    setNotice('');
    const controller = new AbortController();
    activeTest.current = controller;
    setTesting(true);
    try {
      const { model, key } = configuration();
      await testCustomModel(model, key, controller.signal);
      if (!controller.signal.aborted) setNotice('连通测试通过。');
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '连通测试失败。');
    } finally {
      if (!controller.signal.aborted) setTesting(false);
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-xl">
        <header className="space-y-2">
          <DialogTitle>自定义模型</DialogTitle>
          <DialogDescription>接入支持流式输出的 OpenAI 兼容接口。配置按账号保存在当前浏览器，API Key 在当前标签页会话中有效，退出登录时清除。</DialogDescription>
        </header>
        {draft ? (
          <form className="space-y-4" onSubmit={save}>
            {!!models.length && <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" disabled={testing} onClick={() => edit(null)}><ArrowLeft className="size-3.5" />返回模型列表</button>}
            <fieldset disabled={testing} className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">厂商预设
                <select className={field} value={presets.find(item => item.name === draft.provider)?.name || ''} onChange={event => {
                  const preset = presets.find(item => item.name === event.target.value);
                  update({ provider: preset?.name || '', baseUrl: preset?.url || '' });
                  setApiKey('');
                }}>
                  <option value="">自定义厂商</option>
                  {presets.map(item => <option key={item.name}>{item.name}</option>)}
                </select>
              </label>
              <label className="text-sm">厂商名称<input className={field} value={draft.provider} required maxLength={60} onChange={event => update({ provider: event.target.value })} /></label>
              <label className="text-sm sm:col-span-2">Base URL<input className={field} value={draft.baseUrl} required type="url" maxLength={500} placeholder="https://api.example.com/v1" onChange={event => update({ baseUrl: event.target.value })} /></label>
              <label className="text-sm sm:col-span-2">API Key<input className={field} value={apiKey} type="password" autoComplete="off" maxLength={1024} placeholder={getModelKey(accountId, draft) ? '留空沿用本标签页的 Key' : '输入厂商提供的 API Key'} onChange={event => { setApiKey(event.target.value); setNotice(''); setError(''); }} /></label>
              <label className="text-sm">模型 ID<input className={field} value={draft.model} required maxLength={200} placeholder="厂商提供的模型 ID" onChange={event => update({ model: event.target.value })} /></label>
              <label className="text-sm">显示名称<input className={field} value={draft.label} maxLength={80} placeholder="默认使用模型 ID" onChange={event => update({ label: event.target.value })} /></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.vision} onChange={event => update({ vision: event.target.checked })} />支持图片输入</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.tools} onChange={event => update({ tools: event.target.checked })} />支持工具调用</label>
            </fieldset>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={button} disabled={testing} onClick={() => void test()}>{testing ? '测试中…' : '连通测试'}</button>
              <button type="submit" className={`${button} border-primary bg-primary text-primary-foreground hover:bg-primary/90`} disabled={testing}>保存并选中</button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {models.map(model => <div key={model.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <Bot className="size-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{model.label}</p>
                <p className="truncate text-xs text-muted-foreground">{model.provider} · {model.model}{getModelKey(accountId, model) ? '' : ' · 待填写 Key'}</p>
              </div>
              <button className="rounded-md p-2 hover:bg-muted" aria-label={`编辑 ${model.label}`} onClick={() => edit(model)}><Pencil className="size-4" /></button>
              <button className="rounded-md p-2 text-destructive hover:bg-muted" aria-label={`删除 ${model.label}`} onClick={() => {
                if (window.confirm(`删除自定义模型「${model.label}」？`)) {
                  try { onDelete(model.id); setError(''); setNotice(''); }
                  catch { setError('删除配置失败。'); }
                }
              }}><Trash2 className="size-4" /></button>
            </div>)}
            <button className={button} onClick={() => edit(emptyModel())}><Plus className="size-4" />添加模型</button>
          </div>
        )}
        {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
