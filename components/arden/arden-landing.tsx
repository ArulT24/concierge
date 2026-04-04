"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Calendar, Check, PartyPopper } from "lucide-react";
import { signIn } from "next-auth/react";

import {
  ARDEN_BLUE as BLUE,
  ARDEN_SOFT_SHADOW as SOFT_SHADOW,
  ArdenSiteHeader,
  BertramStaticBg,
} from "./arden-chrome";

/** iMessage-style: typing dots, then ~half second pause before the next typing. */
const TYPING_DURATION_MS = 480;
const PAUSE_AFTER_MESSAGE_MS = 420;

type StaggerState = {
  revealed: number;
  typing: boolean;
};

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

function useStaggeredReveal(
  itemCount: number,
  sectionRef: React.RefObject<HTMLElement | null>,
  /** Scrollport for this page (fixed overflow-y div). Viewport root breaks ratios for nested scroll. */
  scrollRootRef: React.RefObject<HTMLElement | null>
): StaggerState {
  const reducedMotion = usePrefersReducedMotion();
  const [revealed, setRevealed] = useState(0);
  const [typing, setTyping] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    const root = scrollRootRef.current;
    if (!el) return;

    const opts: IntersectionObserverInit = {
      threshold: [0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.85, 1],
    };
    if (root) opts.root = root;

    const obs = new IntersectionObserver(([e]) => {
      const ratio = e.intersectionRatio;
      if (e.isIntersecting && ratio >= 0.35) {
        setInView(true);
      } else if (!e.isIntersecting || ratio < 0.12) {
        setInView(false);
        setRevealed(0);
        setTyping(false);
      }
    }, opts);

    obs.observe(el);
    return () => obs.disconnect();
  }, [sectionRef, scrollRootRef]);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    let timeoutId: number | undefined;
    let rafId: number;

    const clearTimer = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      timeoutId = undefined;
    };

    if (reducedMotion) {
      rafId = requestAnimationFrame(() => {
        if (!cancelled) {
          setTyping(false);
          setRevealed(itemCount);
        }
      });
      return () => {
        cancelled = true;
        cancelAnimationFrame(rafId);
      };
    }

    let revealedLocal = 0;

    const typingThenReveal = () => {
      if (cancelled || revealedLocal >= itemCount) return;
      setTyping(true);
      clearTimer();
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        setTyping(false);
        revealedLocal += 1;
        setRevealed(revealedLocal);
        if (revealedLocal < itemCount) {
          clearTimer();
          timeoutId = window.setTimeout(typingThenReveal, PAUSE_AFTER_MESSAGE_MS) as number;
        }
      }, TYPING_DURATION_MS) as number;
    };

    rafId = requestAnimationFrame(() => {
      if (!cancelled) typingThenReveal();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      clearTimer();
    };
  }, [inView, itemCount, reducedMotion]);

  return { revealed, typing };
}

function TypingBubble({ align }: { align: "left" | "right" }) {
  const dots = (
    <div className="flex items-center gap-1.5 px-0.5 py-0.5" aria-hidden>
      <span className="typing-dot inline-block size-2 rounded-full bg-neutral-400" />
      <span className="typing-dot inline-block size-2 rounded-full bg-neutral-400" />
      <span className="typing-dot inline-block size-2 rounded-full bg-neutral-400" />
    </div>
  );

  if (align === "left") {
    return (
      <div className="message-fade-in flex justify-start">
        <div
          className={`rounded-[20px] rounded-bl-md bg-white px-4 py-3 ${SOFT_SHADOW}`}
        >
          {dots}
        </div>
      </div>
    );
  }

  return (
    <div className="message-fade-in flex justify-end">
      <div
        className={`rounded-[20px] rounded-br-md bg-neutral-200/95 px-4 py-3 ${SOFT_SHADOW}`}
      >
        {dots}
      </div>
    </div>
  );
}

function typingAlignScene1(item: Scene1Item): "left" | "right" {
  return item.kind === "user" ? "right" : "left";
}

function typingAlignScene2(item: Scene2Item): "left" | "right" {
  return item.kind === "user" ? "right" : "left";
}

function typingAlignScene3(item: Scene3Item): "left" | "right" {
  return item.kind === "user" ? "right" : "left";
}

function typingAlignScene4(item: Scene4Item): "left" | "right" {
  return item.kind === "user" ? "right" : "left";
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

function VenueBookingCard() {
  return (
    <div
      className={`ml-0 max-w-[min(92vw,400px)] overflow-hidden rounded-[16px] bg-white ${SOFT_SHADOW}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-3 py-2">
        <span className="min-w-0 text-[11px] font-semibold leading-snug text-neutral-800 sm:text-xs">
          Reservation · Sat, Apr 12 · 2:00–4:00 PM
        </span>
        <span
          className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
          style={{ backgroundColor: BLUE }}
        >
          <Check className="size-3" strokeWidth={3} />
          Confirmed
        </span>
      </div>
      <div className="flex items-center gap-2.5 px-3 py-2">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white"
          aria-hidden
        >
          <PartyPopper className="size-[1.35rem]" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold leading-tight text-neutral-900">
            Jump City · Party Room B
          </div>
          <div className="text-[11px] leading-snug text-neutral-500">
            Oak Park · bounce + pizza package
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 px-3 pb-2 pt-0.5">
        <div>
          <div className="text-[10px] font-medium text-neutral-500">Guests</div>
          <div className="text-base font-bold leading-none text-neutral-900">~22</div>
        </div>
        <div className="flex max-w-[44%] flex-col items-center px-1 text-center">
          <div className="flex w-full items-center gap-0.5 text-[10px] font-medium text-neutral-500">
            <span className="h-px min-w-0 flex-1 bg-neutral-200" />
            <Calendar className="size-3.5 shrink-0" style={{ color: BLUE }} />
            <span className="h-px min-w-0 flex-1 bg-neutral-200" />
          </div>
          <div className="mt-0.5 text-[10px] leading-snug text-neutral-500">
            Setup 1:15 PM · out 4:30
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-medium text-neutral-500">Theme</div>
          <div className="text-[12px] font-bold leading-tight text-neutral-900">Superheroes</div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-neutral-100 px-3 py-2">
        <div className="flex items-center gap-1 rounded-lg bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-700">
          <span className="text-neutral-400">✦</span>
          Leo turns 7
        </div>
        <button
          type="button"
          className="shrink-0 text-[11px] font-semibold"
          style={{ color: BLUE }}
        >
          Open in bertram →
        </button>
      </div>
    </div>
  );
}

const CAKE_FLAVORS: { title: string; detail: string }[] = [
  { title: "Red velvet", detail: "Cream cheese frosting · classic" },
  { title: "Dark chocolate raspberry", detail: "Ganache · gluten-friendly sponge avail." },
  { title: "Earl Grey & honey", detail: "Lavender buttercream" },
  { title: "Vanilla bean", detail: "Salted caramel filling" },
];

function CakeFlavorCard() {
  return (
    <div
      className={`max-w-[min(92vw,400px)] overflow-hidden rounded-[16px] bg-white ${SOFT_SHADOW}`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-neutral-100 px-3 py-2">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-neutral-500">
            Oak Lane Bakery
          </div>
          <div className="text-[13px] font-semibold leading-snug text-neutral-900">
            Today&apos;s cakes
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
          style={{ backgroundColor: BLUE }}
        >
          Pick one
        </span>
      </div>
      <ul className="divide-y divide-neutral-100">
        {CAKE_FLAVORS.map((f) => (
          <li key={f.title} className="px-3 py-1.5">
            <div className="flex flex-col gap-0">
              <span className="text-[13px] font-semibold leading-tight text-neutral-900">
                {f.title}
              </span>
              <span className="text-[11px] leading-snug text-neutral-500">{f.detail}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WaitlistPitchCard() {
  return (
    <div
      className={`max-w-[min(92vw,400px)] overflow-hidden rounded-[20px] bg-white ${SOFT_SHADOW}`}
    >
      <div className="border-b border-neutral-100 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Early access
        </span>
        <h3 className="mt-1 text-lg font-bold leading-snug text-neutral-900">
          Join the bertram waitlist
        </h3>
      </div>
      <div className="px-4 py-4">
        <p className="text-[15px] leading-snug text-neutral-600">
          One assistant for kids&apos; parties, holiday get-togethers, trips, and vacation
          itineraries — we keep vendors, dates, and details in one thread.
        </p>
        <button
          type="button"
          className="mt-4 w-full cursor-pointer rounded-full px-5 py-3 text-sm font-semibold text-white transition-[filter] hover:brightness-105 active:brightness-95 sm:py-2.5"
          style={{
            backgroundColor: BLUE,
            boxShadow: "0 8px 28px -8px rgba(27,111,245,0.55)",
          }}
          onClick={() => {
            void signIn("google", { callbackUrl: "/chat" });
          }}
        >
          Join the waitlist
        </button>
      </div>
    </div>
  );
}

function PlanUpgradeCards() {
  return (
    <div className="flex max-w-[min(94vw,420px)] flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded-[18px] bg-white p-3 ${SOFT_SHADOW}`}>
          <div className="mb-2 rounded-lg bg-neutral-100 px-2 py-1 text-center text-xs font-semibold text-neutral-600">
            Your draft
          </div>
          <div className="min-w-0 text-xs">
            <div className="font-semibold text-neutral-900">Portland long weekend</div>
            <div className="text-[11px] text-neutral-500">Fri–Mon · 2 adults · kid</div>
          </div>
          <div className="mt-2 text-[11px] text-neutral-600">Hotels + car sketch only</div>
        </div>
        <div
          className={`rounded-[18px] bg-white p-3 ring-2 ring-[#1B6FF5] ${SOFT_SHADOW}`}
        >
          <div
            className="mb-2 rounded-lg px-2 py-1 text-center text-xs font-semibold text-white"
            style={{ backgroundColor: BLUE }}
          >
            Full itinerary
          </div>
          <div className="text-[11px] text-neutral-500 line-through">
            Bundle usually $420
          </div>
          <div className="text-xl font-bold text-emerald-600">$265</div>
          <div className="text-[11px] font-medium" style={{ color: BLUE }}>
            Day-by-day + reservations
          </div>
        </div>
      </div>
    </div>
  );
}

type Scene1Item =
  | { kind: "user"; text: string; dimmed?: boolean }
  | { kind: "assistant"; text: string }
  | { kind: "venue" };

const SCENE1: Scene1Item[] = [
  {
    kind: "user",
    text: "Can you help plan Leo's 7th birthday? Saturday April 12, mostly kids.",
  },
  { kind: "assistant", text: "Absolutely — indoor or outdoor, and about how many guests?" },
  {
    kind: "user",
    text: "Indoor. Maybe 18 kids plus a few parents — superheroes theme.",
  },
  {
    kind: "assistant",
    text:
      "Love it. I grabbed a bounce + pizza package at Jump City for that Saturday 2–4 slot — fits your headcount.",
  },
  { kind: "venue" },
];

type Scene2Item =
  | { kind: "assistant"; text: string }
  | { kind: "user"; text: string }
  | { kind: "cake_flavors" };

const SCENE2: Scene2Item[] = [
  {
    kind: "user",
    text: "bertram, I forgot to get my wife flowers and a cake for our anniversary.",
  },
  {
    kind: "assistant",
    text: "I've got you — calling the baker and ordering flowers in.",
  },
  { kind: "cake_flavors" },
  { kind: "user", text: "Red velvet, please." },
  {
    kind: "assistant",
    text: "Locked in — red velvet + flowers out the door. I'll remind you to pick up the cake at 6pm!",
  },
];

type Scene3Item =
  | { kind: "assistant"; text: string }
  | { kind: "upgrade" }
  | { kind: "user"; text: string };

const SCENE3: Scene3Item[] = [
  {
    kind: "assistant",
    text:
      "For your Portland trip draft, there’s a bundle to lock hotels + day-by-day plans — promo drops it to $265.",
  },
  { kind: "upgrade" },
  { kind: "user", text: "Yes — book that bundle for us." },
  { kind: "assistant", text: "Locked in. You’ll get the itinerary in-app." },
  { kind: "assistant", text: "Charged the card on file (Amex ···1009)." },
];

type Scene4Item =
  | { kind: "assistant"; text: string }
  | { kind: "waitlist_card" }
  | { kind: "user"; text: string };

const SCENE4: Scene4Item[] = [
  {
    kind: "assistant",
    text: "Moving parts don't have to be stressful.",
  },
  {
    kind: "assistant",
    text: "I can help you plan less, enjoy more",
  },
  { kind: "waitlist_card" },
  { kind: "user", text: "Yes — add me to the waitlist." },
];

function SceneBlock({
  children,
  sectionRef,
  showScrollHint = true,
}: {
  children: ReactNode;
  sectionRef: React.RefObject<HTMLElement | null>;
  showScrollHint?: boolean;
}) {
  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[100dvh] snap-start snap-always flex-col bg-transparent"
    >
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-10 pt-28 sm:px-6 sm:pt-32">
        <div className="mx-auto flex w-full max-w-md flex-col justify-start gap-2.5">
          {children}
        </div>
      </div>
      {showScrollHint ? (
        <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-xs text-neutral-400/90">
          Swipe or scroll for more
        </p>
      ) : null}
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
      <VenueBookingCard />
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
      <CakeFlavorCard />
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
      <PlanUpgradeCards />
    </div>
  );
}

function renderScene4Item(item: Scene4Item, i: number) {
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
      <WaitlistPitchCard />
    </div>
  );
}

export function ArdenLanding() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const s1 = useRef<HTMLElement>(null);
  const s2 = useRef<HTMLElement>(null);
  const s3 = useRef<HTMLElement>(null);
  const s4 = useRef<HTMLElement>(null);

  const s1State = useStaggeredReveal(SCENE1.length, s1, scrollRef);
  const s2State = useStaggeredReveal(SCENE2.length, s2, scrollRef);
  const s3State = useStaggeredReveal(SCENE3.length, s3, scrollRef);
  const s4State = useStaggeredReveal(SCENE4.length, s4, scrollRef);

  return (
    <div
      className="fixed inset-0 overflow-y-auto overscroll-y-contain"
      ref={scrollRef}
      data-arden-scroll-root
      style={{
        scrollSnapType: "y mandatory",
        WebkitOverflowScrolling: "touch",
        backgroundColor: "#000000",
      }}
    >
      <BertramStaticBg />
      <div className="relative z-10 isolate">
        <ArdenSiteHeader />

      <SceneBlock sectionRef={s1}>
        {SCENE1.slice(0, s1State.revealed).map((item, i) => renderScene1Item(item, i))}
        {s1State.typing && s1State.revealed < SCENE1.length && (
          <TypingBubble align={typingAlignScene1(SCENE1[s1State.revealed])} />
        )}
      </SceneBlock>

      <SceneBlock sectionRef={s2}>
        {SCENE2.slice(0, s2State.revealed).map((item, i) => renderScene2Item(item, i))}
        {s2State.typing && s2State.revealed < SCENE2.length && (
          <TypingBubble align={typingAlignScene2(SCENE2[s2State.revealed])} />
        )}
      </SceneBlock>

      <SceneBlock sectionRef={s3}>
        {SCENE3.slice(0, s3State.revealed).map((item, i) => renderScene3Item(item, i))}
        {s3State.typing && s3State.revealed < SCENE3.length && (
          <TypingBubble align={typingAlignScene3(SCENE3[s3State.revealed])} />
        )}
      </SceneBlock>

      <SceneBlock sectionRef={s4} showScrollHint={false}>
        {SCENE4.slice(0, s4State.revealed).map((item, i) => renderScene4Item(item, i))}
        {s4State.typing && s4State.revealed < SCENE4.length && (
          <TypingBubble align={typingAlignScene4(SCENE4[s4State.revealed])} />
        )}
      </SceneBlock>

      <footer className="flex min-h-[30vh] snap-start flex-col items-center justify-center gap-2 bg-transparent px-6 py-12">
        <p className="text-center text-sm text-neutral-400">
          Demo landing inspired by{" "}
          <a
            href="https://arden.co/"
            className="font-medium text-neutral-300 underline decoration-neutral-500 underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            arden.co
          </a>
        </p>
      </footer>
      </div>
    </div>
  );
}
