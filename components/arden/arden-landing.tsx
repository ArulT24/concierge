"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Check, Plane } from "lucide-react";

const BG = "#D1E9FF";
const BLUE = "#1B6FF5";
const BLUE_SOFT = "#E8F2FF";

const SOFT_SHADOW =
  "shadow-[0_10px_40px_-12px_rgba(15,23,42,0.18),0_2px_8px_-4px_rgba(15,23,42,0.08)]";

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false
  );
}

function useStaggeredReveal(itemCount: number, sectionRef: React.RefObject<HTMLElement | null>) {
  const reducedMotion = usePrefersReducedMotion();
  const [visible, setVisible] = useState(0);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.52) {
          setInView(true);
        } else if (!e.isIntersecting || e.intersectionRatio < 0.2) {
          setInView(false);
          setVisible(0);
        }
      },
      { threshold: [0, 0.2, 0.35, 0.52, 0.65, 1] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [sectionRef]);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    let timeoutId: number | undefined;
    let rafId: number;

    if (reducedMotion) {
      rafId = requestAnimationFrame(() => {
        if (!cancelled) setVisible(itemCount);
      });
      return () => {
        cancelled = true;
        cancelAnimationFrame(rafId);
      };
    }

    rafId = requestAnimationFrame(() => {
      if (cancelled) return;
      let current = 0;

      const step = () => {
        if (cancelled) return;
        current += 1;
        setVisible(current);
        if (current < itemCount) {
          timeoutId = window.setTimeout(step, 500) as number;
        }
      };

      timeoutId = window.setTimeout(step, 0) as number;
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId as number);
    };
  }, [inView, itemCount, reducedMotion]);

  return visible;
}

function Header() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-5 sm:px-8 sm:pt-6">
      <div className="pointer-events-auto inline-block">
        <button
          type="button"
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold"
          style={{ color: BLUE, boxShadow: "0 8px 28px -8px rgba(15,23,42,0.2)" }}
        >
          Login
        </button>
      </div>
      <div
        className={`pointer-events-auto absolute left-1/2 top-5 flex -translate-x-1/2 flex-col items-center gap-1 rounded-full bg-white px-4 py-2 sm:top-6 ${SOFT_SHADOW}`}
      >
        <div
          className="flex size-10 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: BLUE }}
          aria-hidden
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="9" cy="10" r="2" fill="currentColor" opacity="0.9" />
            <circle cx="15" cy="10" r="2" fill="currentColor" opacity="0.9" />
            <path
              d="M8 16c1.2 1.2 2.8 1.8 4 1.8s2.8-.6 4-1.8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span className="text-[15px] font-bold tracking-tight text-neutral-900 lowercase">
          arden
        </span>
      </div>
    </header>
  );
}

function BubbleUser({ children, dimmed }: { children: ReactNode; dimmed?: boolean }) {
  return (
    <div className="flex justify-end">
      <div
        className={`max-w-[min(92vw,380px)] rounded-[20px] rounded-br-md px-4 py-3 text-[15px] leading-snug text-white ${SOFT_SHADOW}`}
        style={{
          backgroundColor: BLUE,
          opacity: dimmed ? 0.55 : 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function BubbleAssistant({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-start">
      <div
        className={`max-w-[min(92vw,380px)] rounded-[20px] rounded-bl-md bg-white px-4 py-3 text-[15px] leading-snug text-neutral-900 ${SOFT_SHADOW}`}
      >
        {children}
      </div>
    </div>
  );
}

function FlightCard() {
  return (
    <div
      className={`ml-0 max-w-[min(92vw,400px)] overflow-hidden rounded-[20px] bg-white ${SOFT_SHADOW}`}
    >
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <span className="text-sm font-semibold text-neutral-800">AA1222 · Apr 3, 2026</span>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: BLUE }}
        >
          <Check className="size-3.5" strokeWidth={3} />
          Booked
        </span>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="flex size-11 items-center justify-center rounded-xl text-xs font-bold text-white"
          style={{ background: "linear-gradient(135deg,#c41e3a 0%,#002868 100%)" }}
        >
          AA
        </div>
        <div>
          <div className="font-semibold text-neutral-900">American Airlines</div>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pb-3">
        <div>
          <div className="text-lg font-bold text-neutral-900">LGA</div>
          <div className="text-sm text-neutral-600">7:35 AM</div>
        </div>
        <div className="flex flex-col items-center px-2 text-center">
          <div className="flex w-full items-center gap-1 text-[11px] font-medium text-neutral-500">
            <span className="h-px flex-1 bg-neutral-200" />
            <Plane className="size-4 shrink-0" style={{ color: BLUE }} />
            <span className="h-px flex-1 bg-neutral-200" />
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">Direct · 3h 50m</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-neutral-900">MIA</div>
          <div className="text-sm text-neutral-600">11:25 AM</div>
        </div>
      </div>
      <div className="flex items-center justify-end border-t border-neutral-100 px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
          <span className="text-neutral-400">✦</span>
          <span className="font-semibold">8C</span>
        </div>
      </div>
      <div className="border-t border-neutral-100 px-4 py-3">
        <button
          type="button"
          className="text-sm font-semibold"
          style={{ color: BLUE }}
        >
          Manage flight on Arden →
        </button>
      </div>
    </div>
  );
}

function SeatChangeCard() {
  return (
    <div
      className={`max-w-[min(92vw,400px)] overflow-hidden rounded-[20px] bg-white ${SOFT_SHADOW}`}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 p-4">
        <div className="rounded-2xl bg-neutral-100 p-3">
          <div className="text-xs font-medium text-neutral-500">Previous Seat</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-neutral-400">▣</span>
            <span className="font-semibold text-neutral-800">21B</span>
          </div>
        </div>
        <div className="flex items-center justify-center text-[#1B6FF5]">
          <span className="text-lg font-bold tracking-tight">&gt;&gt;&gt;</span>
        </div>
        <div className="rounded-2xl p-3" style={{ backgroundColor: BLUE_SOFT }}>
          <div className="text-xs font-medium" style={{ color: BLUE }}>
            Your new seat
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span style={{ color: BLUE }}>▣</span>
            <span className="text-lg font-bold text-neutral-900">9A</span>
          </div>
        </div>
      </div>
      <div className="border-t border-neutral-100 px-4 py-4">
        <div className="grid grid-cols-6 gap-1 font-mono text-[10px] text-neutral-400">
          <div className="col-span-6 mb-1 flex justify-between">
            <span />
            <span />
          </div>
          {[8, 9].map((row) => (
            <div key={row} className="col-span-6 grid grid-cols-6 gap-1">
              <span className="flex items-center text-neutral-500">{row}</span>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-md ${
                    row === 9 && i === 4
                      ? "bg-[#1B6FF5] text-[10px] font-bold text-white"
                      : "bg-neutral-100"
                  } flex items-center justify-center`}
                >
                  {row === 9 && i === 4 ? "You" : ""}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UpgradeCards() {
  return (
    <div className="flex max-w-[min(94vw,420px)] flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded-[18px] bg-white p-3 ${SOFT_SHADOW}`}>
          <div className="mb-2 rounded-lg bg-neutral-100 px-2 py-1 text-center text-xs font-semibold text-neutral-600">
            Economy
          </div>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-[#002677] text-center text-[10px] font-bold leading-8 text-white">
              UA
            </div>
            <div className="min-w-0 text-xs">
              <div className="truncate font-semibold text-neutral-900">United Airlines</div>
              <div className="text-[11px] text-neutral-500">MIA ✈ LAX</div>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-neutral-600">Current Seat: 15D</div>
        </div>
        <div
          className={`rounded-[18px] bg-white p-3 ring-2 ring-[#1B6FF5] ${SOFT_SHADOW}`}
        >
          <div
            className="mb-2 rounded-lg px-2 py-1 text-center text-xs font-semibold text-white"
            style={{ backgroundColor: BLUE }}
          >
            Business Class
          </div>
          <div className="text-[11px] text-neutral-500 line-through">Upgrade for $550</div>
          <div className="text-xl font-bold text-emerald-600">$250</div>
          <div className="text-[11px] font-medium" style={{ color: BLUE }}>
            or 22,750 miles
          </div>
        </div>
      </div>
    </div>
  );
}

type Scene1Item =
  | { kind: "user"; text: string; dimmed?: boolean }
  | { kind: "assistant"; text: string }
  | { kind: "flight" };

const SCENE1: Scene1Item[] = [
  { kind: "user", text: "Can you book me a flight to Miami next Friday?" },
  { kind: "assistant", text: "Sure, one way or round trip?" },
  { kind: "user", text: "One way please" },
  {
    kind: "assistant",
    text:
      "Great! I know you're an early bird. So I booked you on the 7:35am American flight",
  },
  { kind: "flight" },
  { kind: "user", text: "Thank you!", dimmed: true },
];

type Scene2Item =
  | { kind: "assistant"; text: string }
  | { kind: "seat" }
  | { kind: "user"; text: string };

const SCENE2: Scene2Item[] = [
  {
    kind: "assistant",
    text: "I saw you were stuck in a middle seat on your flight to SFO tomorrow.",
  },
  { kind: "assistant", text: "Moved you to 9A instead" },
  { kind: "seat" },
  { kind: "user", text: "Awesome" },
];

type Scene3Item =
  | { kind: "assistant"; text: string }
  | { kind: "upgrade" }
  | { kind: "user"; text: string };

const SCENE3: Scene3Item[] = [
  {
    kind: "assistant",
    text: "There's a great upgrade deal to Business for your flight to LAX for $250",
  },
  { kind: "upgrade" },
  { kind: "user", text: "Please buy it" },
  { kind: "assistant", text: "Done!" },
  { kind: "assistant", text: "I used your Amex ending in 1009" },
];

function SceneBlock({
  children,
  sectionRef,
}: {
  children: ReactNode;
  sectionRef: React.RefObject<HTMLElement | null>;
}) {
  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[100dvh] snap-start snap-always flex-col"
      style={{ backgroundColor: BG }}
    >
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-10 pt-28 sm:px-6 sm:pt-32">
        <div className="mx-auto flex w-full max-w-md flex-col justify-start gap-2.5">
          {children}
        </div>
      </div>
      <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-xs text-neutral-500/80">
        Swipe or scroll for more
      </p>
    </section>
  );
}

function renderScene1Item(item: Scene1Item, i: number) {
  if (item.kind === "user") {
    return (
      <div key={i} className="message-fade-in">
        <BubbleUser dimmed={item.dimmed}>{item.text}</BubbleUser>
      </div>
    );
  }
  if (item.kind === "assistant") {
    return (
      <div key={i} className="message-fade-in">
        <BubbleAssistant>{item.text}</BubbleAssistant>
      </div>
    );
  }
  return (
    <div key={i} className="message-fade-in flex justify-start">
      <FlightCard />
    </div>
  );
}

function renderScene2Item(item: Scene2Item, i: number) {
  if (item.kind === "user") {
    return (
      <div key={i} className="message-fade-in">
        <BubbleUser>{item.text}</BubbleUser>
      </div>
    );
  }
  if (item.kind === "assistant") {
    return (
      <div key={i} className="message-fade-in">
        <BubbleAssistant>{item.text}</BubbleAssistant>
      </div>
    );
  }
  return (
    <div key={i} className="message-fade-in flex justify-start">
      <SeatChangeCard />
    </div>
  );
}

function renderScene3Item(item: Scene3Item, i: number) {
  if (item.kind === "user") {
    return (
      <div key={i} className="message-fade-in">
        <BubbleUser>{item.text}</BubbleUser>
      </div>
    );
  }
  if (item.kind === "assistant") {
    return (
      <div key={i} className="message-fade-in">
        <BubbleAssistant>{item.text}</BubbleAssistant>
      </div>
    );
  }
  return (
    <div key={i} className="message-fade-in flex justify-start">
      <UpgradeCards />
    </div>
  );
}

export function ArdenLanding() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const s1 = useRef<HTMLElement>(null);
  const s2 = useRef<HTMLElement>(null);
  const s3 = useRef<HTMLElement>(null);

  const v1 = useStaggeredReveal(SCENE1.length, s1);
  const v2 = useStaggeredReveal(SCENE2.length, s2);
  const v3 = useStaggeredReveal(SCENE3.length, s3);

  return (
    <div
      className="fixed inset-0 overflow-y-auto overscroll-y-contain"
      ref={scrollRef}
      style={{
        scrollSnapType: "y mandatory",
        WebkitOverflowScrolling: "touch",
        backgroundColor: BG,
      }}
    >
      <Header />

      <SceneBlock sectionRef={s1}>
        {SCENE1.slice(0, v1).map((item, i) => renderScene1Item(item, i))}
      </SceneBlock>

      <SceneBlock sectionRef={s2}>
        {SCENE2.slice(0, v2).map((item, i) => renderScene2Item(item, i))}
      </SceneBlock>

      <SceneBlock sectionRef={s3}>
        {SCENE3.slice(0, v3).map((item, i) => renderScene3Item(item, i))}
      </SceneBlock>

      <footer
        className="flex min-h-[30vh] snap-start flex-col items-center justify-center gap-2 px-6 py-12"
        style={{ backgroundColor: BG }}
      >
        <p className="text-center text-sm text-neutral-600">
          Demo landing inspired by{" "}
          <a
            href="https://arden.co/"
            className="font-medium underline decoration-neutral-400 underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            arden.co
          </a>
        </p>
        <button
          type="button"
          className="mt-3 w-full max-w-xs rounded-full px-5 py-3 text-sm font-semibold text-white sm:max-w-md sm:py-2.5"
          style={{
            backgroundColor: BLUE,
            boxShadow: "0 8px 28px -8px rgba(27,111,245,0.55)",
          }}
        >
          Join waitlist
        </button>
      </footer>
    </div>
  );
}
