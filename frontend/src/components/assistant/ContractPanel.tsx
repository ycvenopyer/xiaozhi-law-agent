import { useState, useRef } from 'react';
import {
  FileSignature,
  X,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import { uploadFile } from '@/lib/agent-client';

type ContractType = 'dev' | 'license' | 'assign' | 'nda' | 'noncompete';
type Mode = 'draft' | 'review';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 调用助理生成文本（合同起草 / 审查），实时回传 token。 */
  onGenerate: (prompt: string, onToken: (text: string) => void) => Promise<string>;
}

const CONTRACT_TYPES: { id: ContractType; name: string; desc: string }[] = [
  { id: 'dev', name: '技术开发', desc: '委托/合作研发' },
  { id: 'license', name: '许可', desc: '专利/商标/技术许可' },
  { id: 'assign', name: '转让', desc: '知识产权转让' },
  { id: 'nda', name: '保密', desc: '保密/不披露' },
  { id: 'noncompete', name: '竞业限制', desc: '离职后限制' },
];

const TYPE_NAME: Record<ContractType, string> = {
  dev: '技术开发合同',
  license: '知识产权许可合同',
  assign: '知识产权转让合同',
  nda: '保密（不披露）协议',
  noncompete: '竞业限制协议',
};

export function ContractPanel({ open, onClose, onGenerate }: Props) {
  const [type, setType] = useState<ContractType>('dev');
  const [mode, setMode] = useState<Mode>('draft');
  const [partyA, setPartyA] = useState('');
  const [partyB, setPartyB] = useState('');
  const [keyInfo, setKeyInfo] = useState('');
  const [contractText, setContractText] = useState('');
  const [inputMode, setInputMode] = useState<'paste' | 'upload'>('paste');
  const [uploadName, setUploadName] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  function buildPrompt(): string {
    const tName = TYPE_NAME[type];
    const a = partyA.trim() || '（待填）';
    const b = partyB.trim() || '（待填）';
    const info = keyInfo.trim() || '（无，请基于常见情形生成模板）';

    if (mode === 'review') {
      const text = contractText.trim() || '（未粘贴合同文本）';
      return `你是知识产权律师的办案助理，擅长合同审核。请对以下「${tName}」进行专业审核，要求：
1. 先总体评价合同质量与适用场景；
2. 按维度逐条指出风险与缺失：主体与标的、权利义务对等性、知识产权归属、保密与竞业限制、违约责任与救济、争议解决、法定期限（如竞业限制法定不超过二年）；
3. 对不公平、模糊或可能无效的条款明确标注，并给出修改建议；
4. 输出结构清晰的审核意见，必要时给出替换条款示例；
5. 不得编造文号，无法确认的内容注明“需进一步核实”。

待审核合同文本：
${text}`;
    }

    const templates: Record<ContractType, string> = {
      dev: `你是知识产权律师的办案助理。请起草一份「技术开发合同」，要求：
1. 当事人：甲方（委托方/合作方）：${a}；乙方（研发方/合作方）：${b}；
2. 基于以下背景与关键条款撰写，结构完整、条款清晰，可直接作为谈判底稿；
3. 必含条款：研发标的与技术内容、研发进度与交付、验收标准、知识产权归属（含背景知识产权与衍生成果）、研发费用与支付、保密、违约责任、争议解决；
4. 如涉及具体技术、专利或法条，请明确标注，但不得编造文号；
5. 直接输出合同全文，不要额外解释。`,
      license: `你是知识产权律师的办案助理。请起草一份「知识产权许可合同」，要求：
1. 当事人：许可方：${a}；被许可方：${b}；
2. 基于以下要点撰写，结构完整、可直接作为谈判底稿；
3. 必含条款：许可标的（专利号/商标号/技术秘密）、许可类型（独占/排他/普通）与范围（地域/期限）、许可使用费与支付、质量监督与标识、转许可限制、保密、违约责任、争议解决；
4. 不得编造具体文号；
5. 直接输出合同全文，不要额外解释。`,
      assign: `你是知识产权律师的办案助理。请起草一份「知识产权转让合同」，要求：
1. 当事人：转让方：${a}；受让方：${b}；
2. 基于以下要点撰写，结构完整、可直接作为谈判底稿；
3. 必含条款：转让标的（专利/商标/著作权，注明权利范围）、转让对价与支付、权利交割与变更登记（专利/商标需向主管部门登记生效）、陈述与保证、税费承担、违约与救济、争议解决；
4. 不得编造具体文号；
5. 直接输出合同全文，不要额外解释。`,
      nda: `你是知识产权律师的办案助理。请起草一份「保密（不披露）协议」，要求：
1. 当事人：披露方：${a}；接收方：${b}；
2. 基于以下要点撰写，结构完整、可直接签署；
3. 必含条款：保密信息定义与范围、接收方义务（保密/限用途）、保密期限、使用与披露限制、例外情形、违约责任与救济、争议解决；
4. 不得编造具体文号；
5. 直接输出协议全文，不要额外解释。`,
      noncompete: `你是知识产权律师的办案助理。请起草一份「竞业限制协议」，要求：
1. 当事人：用人单位：${a}；劳动者：${b}；
2. 基于以下要点撰写，结构完整、合法可执行；
3. 必含条款：适用人员与范围（业务/地域）、竞业限制期限（注意法定不超过二年）、经济补偿标准与支付、劳动者义务、违约情形与违约金、协议解除；
4. 提示《劳动合同法》关于竞业限制期限与补偿的强制性规定，不得拟定违法条款；
5. 直接输出协议全文，不要额外解释。`,
    };

    return `${templates[type]}\n\n背景与关键条款：\n${info}`;
  }

  async function generate() {
    if (busy) return;
    if (mode === 'draft' && !keyInfo.trim()) return;
    if (mode === 'review' && !contractText.trim()) return;
    setBusy(true);
    setResult('');
    setCopied(false);
    try {
      await onGenerate(buildPrompt(), setResult);
    } catch (e) {
      setResult('⚠️ ' + ((e as Error).message || '生成失败'));
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    navigator.clipboard?.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const genLabel = mode === 'draft' ? `生成${TYPE_NAME[type]}` : '开始审查';

  return (
    <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-card shadow-xl transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <FileSignature className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">合同起草（审核）</span>
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-[0.74rem] leading-relaxed text-muted-foreground">
            选择合同类型与模式，填关键要点后一键起草或审核。覆盖技术开发、许可、转让、保密、竞业限制等合同，可直接作为谈判底稿或审核意见。
          </p>

          {/* 脱敏提醒 */}
          <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-[0.74rem] leading-relaxed text-amber-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              合同可能含姓名、证件号、商业秘密等敏感信息。提交前请<b>手动脱敏</b>：将真实姓名、公司、编号等替换为“甲方 / 乙方”“＊＊公司”等占位，避免隐私泄露。
            </span>
          </div>

          {/* 模式切换 */}
          <div className="grid grid-cols-2 gap-2">
            {(['draft', 'review'] as Mode[]).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-lg border px-3 py-2 text-[0.82rem] font-medium transition ${
                    active ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {m === 'draft' ? '合同起草' : '合同审核'}
                </button>
              );
            })}
          </div>

          {/* 合同类型 */}
          <div className="space-y-1.5">
            <span className="text-[0.72rem] text-muted-foreground">合同类型</span>
            <div className="flex flex-wrap gap-2">
              {CONTRACT_TYPES.map((t) => {
                const active = type === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    title={t.desc}
                    className={`rounded-full border px-3 py-1.5 text-[0.76rem] transition ${
                      active ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          {mode === 'draft' ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  value={partyA}
                  onChange={(e) => setPartyA(e.target.value)}
                  placeholder={type === 'noncompete' ? '用人单位' : type === 'nda' ? '披露方' : '甲方（许可方/转让方）'}
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
                />
                <input
                  value={partyB}
                  onChange={(e) => setPartyB(e.target.value)}
                  placeholder={type === 'noncompete' ? '劳动者' : type === 'nda' ? '接收方' : '乙方（被许可方/受让方）'}
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
                />
              </div>
              {/* 起草模式：粘贴关键点 / 上传参考合同(可选) */}
              <div className="flex items-center gap-1 text-[0.7rem]">
                <button
                  onClick={() => setInputMode('paste')}
                  className={`rounded px-2 py-1 ${inputMode === 'paste' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  粘贴要点
                </button>
                <button
                  onClick={() => setInputMode('upload')}
                  className={`rounded px-2 py-1 ${inputMode === 'upload' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  上传参考合同
                </button>
              </div>
              {inputMode === 'paste' ? (
                <textarea
                  value={keyInfo}
                  onChange={(e) => setKeyInfo(e.target.value)}
                  rows={6}
                  placeholder="关键背景与条款：标的内容 / 地域与期限 / 费用与支付 / 特殊要求…"
                  className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
                />
              ) : (
                <div className="space-y-1.5">
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-primary/40 px-3 py-2 text-[0.82rem] text-muted-foreground hover:bg-primary/5 hover:text-foreground disabled:opacity-40"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? '读取中…' : uploadName ? `已选：${uploadName}` : '选择合同文档（pdf/word/txt）'}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.txt,.md,.doc,.docx"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setUploading(true);
                      try {
                        const parsed = await uploadFile(f);
                        setKeyInfo(parsed.text);
                        setUploadName(parsed.name || f.name);
                        setInputMode('paste'); // 自动切回粘贴视图展示提取内容
                      } catch (err) {
                        setKeyInfo(`⚠️ ${(err as Error).message || '读取失败'}`);
                      } finally {
                        setUploading(false);
                        e.target.value = '';
                      }
                    }}
                  />
                  <p className="text-[0.68rem] text-muted-foreground">
                    上传参考合同后，助理会以其为蓝本起草；可继续编辑补充要点。
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* 审核模式：粘贴 / 上传 tab */}
              <div className="flex items-center gap-1 text-[0.7rem]">
                <button
                  onClick={() => setInputMode('paste')}
                  className={`rounded px-2 py-1 ${inputMode === 'paste' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  粘贴合同
                </button>
                <button
                  onClick={() => setInputMode('upload')}
                  className={`rounded px-2 py-1 ${inputMode === 'upload' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  上传合同文档
                </button>
              </div>
              {inputMode === 'paste' ? (
                <textarea
                  value={contractText}
                  onChange={(e) => setContractText(e.target.value)}
                  rows={9}
                  placeholder="将待审核的合同全文粘贴到这里，助理会给出风险与修改建议…（提交前请先手动脱敏）"
                  className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-[0.82rem] outline-none focus:border-primary/50"
                />
              ) : (
                <div className="space-y-1.5">
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-primary/40 px-3 py-3 text-[0.82rem] text-muted-foreground hover:bg-primary/5 hover:text-foreground disabled:opacity-40"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? '读取中…' : uploadName ? `已选：${uploadName}（点击重新选择）` : '选择合同文档（pdf/word/txt）'}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.txt,.md,.doc,.docx"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setUploading(true);
                      try {
                        const parsed = await uploadFile(f);
                        setContractText(parsed.text);
                        setUploadName(parsed.name || f.name);
                        setInputMode('paste'); // 自动切回粘贴视图展示提取内容
                      } catch (err) {
                        setContractText(`⚠️ ${(err as Error).message || '读取失败'}`);
                      } finally {
                        setUploading(false);
                        e.target.value = '';
                      }
                    }}
                  />
                  <p className="text-[0.68rem] text-muted-foreground">
                    上传后助理自动识别合同全文并审核；上传前请先对文档手动脱敏。
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={generate}
            disabled={busy || (mode === 'draft' ? !keyInfo.trim() : !contractText.trim())}
            className="flex w-full items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[0.8rem] text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSignature className="h-3.5 w-3.5" />}
            {busy ? '生成中…' : genLabel}
          </button>

          {result && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[0.74rem] font-medium text-foreground">
                  {mode === 'draft' ? '合同草稿' : '审核意见'}
                </span>
                <button
                  onClick={copy}
                  className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[0.68rem] text-muted-foreground hover:text-foreground"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
              <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-2.5 text-[0.78rem] leading-relaxed">
                {result}
              </pre>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
