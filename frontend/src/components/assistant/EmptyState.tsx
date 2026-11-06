const SUGGESTIONS = [
  '帮我分析商标侵权案已有证据的证明力与缺口',
  '草拟一段专利侵权的辩论意见要点',
  '检索"著作权侵权 赔偿数额"相关法条与案例',
  '上传一份判决书，帮我提炼裁判要旨',
];

export function EmptyState({ onPick, avatar }: { onPick: (text: string) => void; avatar?: string }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center px-4">
      <img
        src={avatar ?? '/xiaozhi-avatar.png'}
        alt="小知"
        className="mb-4 h-14 w-14 rounded-2xl object-cover ring-1 ring-primary/20"
      />
      <h2 className="text-xl font-semibold">你好，我是小知，你的知识产权办案助理</h2>
      <p className="mt-1.5 text-center text-[0.9rem] text-muted-foreground">
        可以帮你分析证据、撰写代理词、检索法条与案例、分析文书。试试下面的问题：
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
