import { Sparkles } from "lucide-react";

import { ChatDemo } from "@/components/chat-demo";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-10 sm:py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 sm:gap-8">
        <header className="animate-[fade-up_0.6s_ease_both]">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3.5 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
            <span className="text-xs font-medium text-violet-200">
              AI Party Planner
            </span>
          </div>

          <h1 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Plan your kid&apos;s birthday party in minutes.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400 sm:mt-4 sm:text-base">
            Tell the AI what kind of party you want. It finds venues, food,
            decorations, and builds the plan.
          </p>
        </header>

        <div className="animate-[fade-up_0.6s_ease_150ms_both]">
          <ChatDemo />
        </div>
      </div>
    </main>
  );
}
