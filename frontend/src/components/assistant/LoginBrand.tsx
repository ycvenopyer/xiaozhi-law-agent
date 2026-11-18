import { BookOpen, Files, Scale } from 'lucide-react';

export function LoginBrand() {
  return (
    <section aria-labelledby="xiaozhi-intro"
      className="relative isolate flex flex-col justify-between overflow-hidden bg-[#101c30] px-7 py-6 text-[#f5f6f4] md:min-h-full md:px-10 md:py-9 xl:px-16"
      style={{ backgroundImage: 'radial-gradient(ellipse at 72% 67%, #284766 0%, transparent 58%), linear-gradient(125deg, #101a2a, #182d47)' }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-[0.12]"
        style={{ backgroundImage: 'linear-gradient(#92bddb 1px, transparent 1px), linear-gradient(90deg, #92bddb 1px, transparent 1px)', backgroundSize: '56px 56px', maskImage: 'linear-gradient(180deg, transparent, black 55%)' }} />
      <div className="flex items-center gap-3">
        <img src="/favicon.svg" alt="" className="size-9 rounded-lg" />
        <span className="text-lg font-semibold tracking-tight">小知 <span className="ml-1 text-sm font-medium text-[#a9bfd4]">Xiaozhi</span></span>
      </div>

      <div className="relative mx-auto mt-6 w-full max-w-[31rem] md:my-9">
        <h2 id="xiaozhi-intro" className="font-serif text-2xl leading-tight tracking-tight md:text-[clamp(2rem,3.3vw,3.6rem)]">
          为知识产权工作<br />理清每一条线索
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[#b4c8da] md:mt-4 md:text-[0.94rem] md:leading-7">
          在一个工作空间里整理案情、查阅依据、起草文书，随时回到上次的工作。
        </p>

        <div aria-hidden="true" className="relative mt-10 hidden h-[14.5rem] md:block xl:h-[17rem]">
          <div className="absolute left-[15%] top-2 h-[85%] w-[66%] -rotate-[11deg] rounded-xl border border-[#7ea4c0]/50 bg-[#829bb9]/14" />
          <div className="absolute left-[24%] top-3 h-[88%] w-[66%] rotate-[9deg] rounded-xl border border-[#d4bf90]/45 bg-[#d4bf90]/15" />
          <div className="absolute left-[18%] top-0 flex h-full w-[65%] -rotate-[3deg] flex-col rounded-xl border border-[#e5d7b7] bg-[#f5efdf] px-5 py-4 text-[#29394b] shadow-[0_18px_45px_#09111e99] xl:px-7 xl:py-5">
            <div className="flex items-center justify-between border-b border-[#c9bea8] pb-3">
              <span className="font-serif text-lg font-semibold">办案笔记</span>
              <Scale className="size-5 text-[#8d6742]" />
            </div>
            <div className="flex flex-1 flex-col justify-center gap-3">
              <div className="h-px w-11/12 bg-[#c9bea8]" />
              <div className="h-px w-10/12 bg-[#c9bea8]" />
              <div className="h-px w-11/12 bg-[#c9bea8]" />
              <div className="h-px w-8/12 bg-[#c9bea8]" />
            </div>
            <div className="flex items-center gap-2 border-t border-[#c9bea8] pt-2.5 text-xs"><Files className="size-3.5 text-[#8d6742]" />证据、依据与文书</div>
          </div>
          <div className="absolute bottom-4 right-0 flex items-center gap-3 rounded-xl border border-[#7ea4c0]/55 bg-[#172a42] p-2.5 pr-5 shadow-[0_12px_30px_#09111e88]">
            <img src="/xiaozhi-avatar.png" alt="" className="size-11 rounded-lg object-cover xl:size-14" />
            <div><p className="text-sm font-semibold">小知</p><p className="mt-0.5 text-xs text-[#b4c8da]">知识产权办案助理</p></div>
          </div>
        </div>
      </div>
      <div className="hidden items-center gap-2 text-xs text-[#a9bfd4] md:flex"><BookOpen className="size-4" />私人云端工作空间</div>
    </section>
  );
}
