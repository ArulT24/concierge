import { ChatDemo } from "@/components/chat-demo";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_28%)]" />
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col items-center justify-center gap-6">
        <section className="max-w-3xl text-center">
          <p className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.24em] text-sky-100/80">
            AI party planning assistant
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Plan your kid&apos;s birthday party in minutes.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm leading-6 text-slate-300 sm:text-base">
            Tell the AI what kind of party you want. It finds venues, food,
            decorations, and builds the plan.
          </p>
        </section>

        <ChatDemo />
      </div>
    </main>
  );
}
