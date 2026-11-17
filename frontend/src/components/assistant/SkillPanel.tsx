import { ArrowUpRight, Gavel, Layers3, Newspaper, Scale, FileSignature } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SKILL_CATALOG, type SkillInfo } from '@/lib/skills';

export function SkillIcon({ id, className = 'h-4 w-4' }: { id: string; className?: string }) {
  const Icon = id === 'statute-research' ? Scale : id === 'case-research' ? Gavel : id === 'ip-news' ? Newspaper : id === 'contract-drafting' ? FileSignature : Layers3;
  return <Icon className={className} />;
}

export function SkillPanel({ open, onOpenChange, onPick }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (skill: SkillInfo) => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
      <DialogHeader className="border-b border-border px-6 pb-5 pt-6 text-left">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium tracking-widest text-primary"><Layers3 className="h-4 w-4" />小知 · SKILLS</div>
        <DialogTitle className="text-2xl">为这次任务，选一项专长</DialogTitle>
        <DialogDescription className="mt-1 leading-relaxed">选择后立即加载技能提示词，保留你已输入的问题。补充需求后发送，也可输入 $技能名。</DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
        {SKILL_CATALOG.map((skill, index) => <button key={skill.id} onClick={() => onPick(skill)} className="group flex flex-col rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary">
          <div className="mb-4 flex w-full items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><SkillIcon id={skill.id} /></span><span className="text-xs tabular-nums text-muted-foreground">0{index + 1}</span></div>
          <span className="flex items-center gap-2 text-sm font-semibold">{skill.name}<ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
          <span className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{skill.summary}</span>
          <span className="mt-2 text-[0.68rem] text-muted-foreground">{skill.referenceCount} 份参考规范 · {skill.assetCount} 份模板</span>
          <code className="mt-4 break-all text-[0.68rem] text-muted-foreground">${skill.id}</code>
        </button>)}
      </div>
      <p className="border-t border-border bg-muted/30 px-6 py-4 text-xs leading-relaxed text-muted-foreground">法条、案例基于知识库与所提供材料分析；知产新闻需要新闻或公告正文。当前不提供网页搜索。</p>
    </DialogContent>
  </Dialog>;
}
