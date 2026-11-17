import { SKILL_CATALOG, type SkillInfo } from '@/lib/skills';
import { SkillIcon } from './SkillPanel';

const SUGGESTIONS = [
  '帮我分析商标侵权案已有证据的证明力与缺口',
  '草拟一段专利侵权的辩论意见要点',
  '检索"著作权侵权 赔偿数额"相关法条与案例',
  '上传一份判决书，帮我提炼裁判要旨',
];

export function EmptyState({ onPick, onSkill, avatar }: { onPick: (text: string) => void; onSkill: (skill: SkillInfo) => void; avatar?: string }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-4 py-8">
      <img
        src={avatar ?? '/xiaozhi-avatar.png'}
        alt="小知"
        className="mb-4 h-14 w-14 rounded-2xl object-cover ring-1 ring-primary/20"
      />
      <h2 className="text-xl font-semibold">你好，我是小知，你的知识产权办案助理</h2>
      <p className="mt-1.5 text-center text-[0.9rem] text-muted-foreground">
        可以帮你分析证据、撰写代理词、检索法条与案例、分析文书。试试下面的问题：
      </p>
      <div className="mt-6 grid w-full grid-cols-2 gap-2.5">
        {SKILL_CATALOG.map(skill => <button key={skill.id} onClick={() => onSkill(skill)} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5">
          <span className="mt-0.5 text-primary"><SkillIcon id={skill.id} /></span>
          <span><span className="block text-sm font-medium">{skill.name}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{skill.summary}</span></span>
        </button>)}
      </div>
      <p className="mt-5 self-start text-xs text-muted-foreground">也可以直接开始对话</p>
      <div className="mt-2 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
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
