import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowUpRight, Bot, ChevronDown, Eye, EyeOff, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { getModelKey, testCustomModel, type CustomModel } from '@/lib/custom-models';
import { findPresetModel, modelPresets } from '@/lib/model-presets';

const field = 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';
const button = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50';
const defaultPreset = modelPresets[0];
const presetFor = (model: CustomModel | null) => modelPresets.find(preset => preset.name === model?.provider && preset.url === model.baseUrl);
const emptyModel = (): CustomModel => ({
  id: `custom-${crypto.randomUUID()}`, provider: defaultPreset.name, baseUrl: defaultPreset.url,
  model: defaultPreset.defaultModel.id, label: '', vision: !!defaultPreset.defaultModel.vision, tools: false,
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
  const [presetName, setPresetName] = useState(defaultPreset.name);
  const [manualId, setManualId] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);
  const activeTest = useRef<AbortController | null>(null);
  useEffect(() => () => activeTest.current?.abort(), []);
  const preset = modelPresets.find(item => item.name === presetName);

  function edit(model: CustomModel | null) {
    const matched = presetFor(model);
    setDraft(model);
    setPresetName(matched?.name || '');
    setManualId(Boolean(model && matched && !findPresetModel(matched, model.model)));
    setApiKey('');
    setShowKey(false);
    setNotice('');
    setError('');
  }

  function chooseModel(id: string) {
    update({ model: id, vision: !!findPresetModel(preset, id)?.vision, tools: false });
  }

  function chooseProvider(name: string) {
    const next = modelPresets.find(item => item.name === name);
    setPresetName(name);
    setManualId(false);
    setApiKey('');
    setShowKey(false);
    update({ provider: next?.name || '', baseUrl: next?.url || '', model: next?.defaultModel.id || '', label: '',
      vision: !!next?.defaultModel.vision, tools: false });
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
      label: draft.label.trim() || findPresetModel(preset, draft.model.trim())?.label || draft.model.trim(),
      baseUrl: draft.baseUrl.trim(),
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
      <DialogContent showCloseButton={false} className="max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[38rem]">
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Bot className="size-5" /></span>
            <div className="space-y-1">
              <DialogTitle>{draft ? (models.some(model => model.id === draft.id) ? '编辑模型' : '添加模型') : '自定义模型'}</DialogTitle>
              <DialogDescription className="text-xs">接入支持流式输出的 OpenAI 兼容接口</DialogDescription>
            </div>
          </div>
          <button type="button" aria-label="关闭模型配置" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
        </header>
        {draft ? (
          <form className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]" onSubmit={save}>
            <fieldset disabled={testing} className="min-w-0 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              {!!models.length && <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => edit(null)}><ArrowLeft className="size-3.5" />返回模型列表</button>}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="model-provider" className="text-sm font-medium">供应商</label>
                  {preset && <a href={preset.docs} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">查看文档<ArrowUpRight className="size-3.5" /></a>}
                </div>
                <select id="model-provider" className={field} value={presetName} onChange={event => chooseProvider(event.target.value)}>
                  {modelPresets.map(item => <option key={item.name}>{item.name}</option>)}
                  <option value="">自定义供应商</option>
                </select>
              </div>
              {!preset && <div className="grid gap-3 sm:grid-cols-[1fr_1.6fr]">
                <label className="block space-y-2 text-sm">厂商名称<input className={field} value={draft.provider} required maxLength={60} onChange={event => update({ provider: event.target.value })} /></label>
                <label className="block space-y-2 text-sm">Base URL<input className={field} value={draft.baseUrl} required type="url" maxLength={500} placeholder="https://api.example.com/v1" onChange={event => update({ baseUrl: event.target.value })} /></label>
              </div>}
              <div className="space-y-2">
                <label htmlFor="model-api-key" className="text-sm font-medium">API Key</label>
                <div className="flex items-center gap-2">
                  <div className="relative min-w-0 flex-1">
                    <input id="model-api-key" className={`${field} pr-10`} value={apiKey} type={showKey ? 'text' : 'password'} autoComplete="off" spellCheck={false} maxLength={1024} placeholder={getModelKey(accountId, draft) ? '留空沿用本标签页的 Key' : '输入你的 API Key'} onChange={event => { setApiKey(event.target.value); setNotice(''); setError(''); }} />
                    <button type="button" aria-label={showKey ? '隐藏 API Key' : '显示 API Key'} aria-controls="model-api-key" onClick={() => setShowKey(!showKey)} className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-lg text-muted-foreground hover:text-foreground">{showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
                  </div>
                  <button type="button" className={`${button} shrink-0`} onClick={() => void test()}>{testing ? <><Loader2 className="size-4 animate-spin" />测试中</> : '测试连接'}</button>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">Key 仅在当前标签页会话中保留，退出登录后清除。</p>
              </div>
              <div className="space-y-2">
                <label htmlFor={preset ? 'model-choice' : 'model-id'} className="text-sm font-medium">模型名称</label>
                {preset && <select id="model-choice" className={field} value={manualId ? '' : draft.model} onChange={event => {
                  setManualId(!event.target.value);
                  if (event.target.value) chooseModel(event.target.value);
                  else update({ vision: false, tools: false });
                }}>
                  {preset.groups.map(group => <optgroup key={group.label} label={group.label}>
                    {group.models.map(model => <option key={model.id} value={model.id}>{model.label} · {model.id}</option>)}
                  </optgroup>)}
                  <option value="">手动输入模型 ID</option>
                </select>}
                {(!preset || manualId) && <input id="model-id" aria-label="模型 ID" className={field} value={draft.model} required maxLength={200} placeholder="输入供应商提供的模型 ID" onChange={event => update({ model: event.target.value })} />}
              </div>
              <details key={presetName} className="group rounded-xl border border-border bg-muted/25 px-3 py-2">
                <summary className="flex cursor-pointer list-none items-center justify-between rounded px-1 py-1 text-sm text-muted-foreground marker:content-none hover:text-foreground">
                  高级选项<ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-3 px-1 pb-2 pt-3">
                  {preset && <label className="block space-y-2 text-sm">Base URL<input className={field} value={draft.baseUrl} type="url" maxLength={500} onChange={event => update({ baseUrl: event.target.value })} /></label>}
                  <label className="block space-y-2 text-sm">显示名称<input className={field} value={draft.label} maxLength={80}
                    placeholder={findPresetModel(preset, draft.model)?.label || '默认使用模型 ID'} onChange={event => update({ label: event.target.value })} /></label>
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.vision} onChange={event => update({ vision: event.target.checked })} />支持图片输入</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.tools} onChange={event => update({ tools: event.target.checked })} />支持工具调用</label>
                  </div>
                </div>
              </details>
              {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            </fieldset>
            <footer className="flex justify-end gap-2 border-t border-border bg-muted/25 px-5 py-3 sm:px-6">
              <button type="button" className={button} onClick={onClose}>取消</button>
              <button type="submit" className={`${button} border-primary bg-primary text-primary-foreground hover:bg-primary/90`} disabled={testing}>保存</button>
            </footer>
          </form>
        ) : (
          <div className="space-y-3 overflow-y-auto p-5 sm:px-6">
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
            {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
