const SUGGESTIONS = [
  '帮我比对两份商标材料，列出标识和商品类别的差异',
  '产品宣传图用了他人作品，判断侵权风险还缺哪些事实？',
  '产品准备发布，使用开源组件前要核对哪些许可条件？',
  '帮我起草一份用于研发合作洽谈的保密协议',
];

export function EmptyState({ onPick, avatar }: { onPick: (text: string) => void; avatar?: string }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-4 py-8">
      <img
        src={avatar ?? '/xiaozhi-avatar.png'}
        alt="小知"
        className="mb-4 h-14 w-14 rounded-2xl object-cover ring-1 ring-primary/20"
      />
      <h2 className="text-xl font-semibold">你好，我是小知，你的知识产权合规助理</h2>
      <p className="mt-1.5 text-center text-[0.9rem] text-muted-foreground">
        我可以帮你检索比对知产材料、识别侵权风险、梳理研发合规事项，也可以帮你起草知识产权文书。
      </p>
      <div className="mt-6 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-xl border border-border bg-card px-4 py-3 text-left text-[0.9rem] transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
