"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Cake, GraduationCap, PartyPopper } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import {
  DOUBTFIRE_BLUE as BLUE,
  DOUBTFIRE_SOFT_SHADOW as SOFT_SHADOW,
  DoubtfireSiteHeader,
  BertramStaticBg,
} from "./doubtfire-chrome";

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

function typingAlignScene5(item: Scene5Item): "left" | "right" {
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
      className={`ml-0 max-w-[min(92vw,400px)] overflow-hidden rounded-[16px] bg-white p-3.5 sm:p-4 ${SOFT_SHADOW}`}
    >
      <div className="flex gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white"
          aria-hidden
        >
          <PartyPopper className="size-[1.35rem]" strokeWidth={2} />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="text-[14px] font-semibold leading-snug text-neutral-900">
            Jump City · Party Room B
          </div>
          <div className="text-[12px] leading-snug text-neutral-500">
            Sat, Apr 12 · 2:00–4:00 PM
          </div>
          <div className="text-[12px] leading-snug text-neutral-500">
            Oak Park · bounce + pizza · Superheroes
          </div>
        </div>
      </div>
    </div>
  );
}

const CAKE_MENU: { name: string; price: string }[] = [
  { name: "Red velvet", price: "$44" },
  { name: "Dark chocolate raspberry", price: "$52" },
  { name: "Earl Grey & honey", price: "$48" },
  { name: "Vanilla bean", price: "$42" },
];

function CakeFlavorCard() {
  /** BG bar (not border) so global `* { border-border }` does not hide rules on white cards. */
  const betweenFlavorsRule =
    "h-[0.5px] min-h-[0.5px] w-full shrink-0 bg-neutral-400/55";

  return (
    <div
      className={`max-w-[min(92vw,340px)] overflow-hidden rounded-[16px] bg-white ${SOFT_SHADOW}`}
    >
      <div className="flex items-center gap-2 bg-gradient-to-b from-neutral-50/80 to-white px-3 py-2">
        <div
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f3e9d7] ring-1 ring-amber-900/[0.08]"
          aria-hidden
        >
          <Cake className="size-[0.9rem] text-[#5c4033]" strokeWidth={2} />
        </div>
        <div className="min-w-0 text-[11px] font-bold uppercase leading-tight tracking-[0.05em] text-neutral-900">
          Oak Lane Bakery
        </div>
      </div>
      <ul className="m-0 list-none px-3 pb-1 pt-0">
        {CAKE_MENU.map((item, i) => (
          <li key={item.name} className="m-0 p-0">
            {i > 0 ? (
              <div className={betweenFlavorsRule} aria-hidden />
            ) : null}
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0 py-1.5">
              <span className="min-w-0 text-[12px] font-medium leading-snug text-neutral-900">
                {item.name}
              </span>
              <span className="shrink-0 text-[12px] font-semibold tabular-nums tracking-tight text-neutral-800">
                {item.price}
              </span>
            </div>
          </li>
        ))}
      </ul>
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
            <div className="font-semibold text-neutral-900">Cancun getaway</div>
            <div className="text-[11px] text-neutral-500">Sun–Sat · 2 adults · kid</div>
          </div>
          <div className="mt-2 text-[11px] text-neutral-600">Resort + transfer sketch only</div>
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
            Tours + day-by-day plan
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
  {
    kind: "assistant",
    text: "Absolutely! Want it indoors or outdoors? How many guests are you expecting?",
  },
  {
    kind: "user",
    text: "Indoor, around 15 kids plus a few parents. Can we do a superheroes theme?",
  },
  {
    kind: "assistant",
    text:
      "Love that idea. I can grab a bounce and pizza package at Jump City for a 2:00-4:00pm slot on Saturday. Check it out!",
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
    text: "I've got you! Calling the baker and ordering flowers to your house.",
  },
  { kind: "cake_flavors" },
  { kind: "user", text: "Red velvet, please." },
  {
    kind: "assistant",
    text:
      "I locked in red velvet and flowers. I'll remind you to pick up the cake at 6pm!",
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
      "For your Cancun trip itinerary draft, there's a bundle for Chichen Itza, snorkeling, cenotes and ATVs. Promo drops it to $265 for the next week. What do you think?",
  },
  { kind: "upgrade" },
  { kind: "user", text: "Sick, book that please." },
  { kind: "assistant", text: "Locked in. You’ll get the itinerary in-app." },
  {
    kind: "assistant",
    text: "I charged it to your VentureX card to get some points back.",
  },
];

function GraduationVenueCard() {
  return (
    <div
      className={`ml-0 max-w-[min(92vw,400px)] overflow-hidden rounded-[16px] bg-white p-3.5 sm:p-4 ${SOFT_SHADOW}`}
    >
      <div className="flex gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white"
          aria-hidden
        >
          <GraduationCap className="size-[1.35rem]" strokeWidth={2} />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="text-[14px] font-semibold leading-snug text-neutral-900">
            The Loft on Wabash · Event Space
          </div>
          <div className="text-[12px] leading-snug text-neutral-500">
            Sat, May 17 · 5:00 PM · 40 guests
          </div>
          <div className="text-[12px] leading-snug text-neutral-500">
            River North · catering + photo setup · grad theme
          </div>
        </div>
      </div>
    </div>
  );
}

type Scene4Item =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "graduation_venue" };

const SCENE4: Scene4Item[] = [
  {
    kind: "user",
    text: "Emma just graduated from med school. Need a graduation party for 40 people this Saturday.",
  },
  {
    kind: "assistant",
    text: "Congrats to Dr. Emma! The Loft on Wabash has a graduation package with catering and a photo setup. Saturday at 5pm is open.",
  },
  { kind: "graduation_venue" },
  { kind: "user", text: "Perfect, book it!" },
  {
    kind: "assistant",
    text: "Done. Venue and catering are confirmed. Sending over some ideas for med school related decorations.",
  },
];

type Scene5Item =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string };

const SCENE5: Scene5Item[] = [
  {
    kind: "user",
    text: "My sister is 3 months pregnant. Can you find a good time when the family is free in the next few weeks for a baby shower?",
  },
  {
    kind: "assistant",
    text: "Checked everyone's schedule. Everyone is free on Saturday, August 9th. How does dinner on the 9th work?",
  },
  {
    kind: "user",
    text: "That is perfect, lets invite everyone over to my place.",
  },
  {
    kind: "assistant",
    text: "Perfect, want me to send out invites?",
  },
  {
    kind: "user",
    text: "Yes, but this is a surprise for my sister and her husband, so don't send them the invite.",
  },
  {
    kind: "assistant",
    text: "Got it, invites have been sent!",
  },
];


function PersistentWaitlistBar() {
  const router = useRouter();
  const [showChoice, setShowChoice] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  function handleJoinClick() {
    setShowEmailForm(false);
    setShowChoice(true);
  }

  function handleChooseGoogle() {
    setShowChoice(false);
    void signIn("google", { callbackUrl: "/welcome" });
  }

  function handleChooseEmail() {
    setShowChoice(false);
    setEmail("");
    setEmailError("");
    setShowEmailForm(true);
  }

  function handleCloseOverlay() {
    setShowChoice(false);
    setShowEmailForm(false);
    setEmail("");
    setEmailError("");
  }

  function handleEmailSubmit() {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    const params = new URLSearchParams({ method: "email", email: trimmed });
    router.push(`/welcome?${params.toString()}`);
  }

  return (
    <>
      {/* Bottom bar */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 sm:px-6"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)",
        }}
      >
        <div
          className="pointer-events-auto mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-white py-2 pl-5 pr-5"
          style={{
            boxShadow:
              "0 12px 42px -10px rgba(0,0,0,0.55), 0 6px 20px -8px rgba(0,0,0,0.32), 0 0 0 1px rgba(0,0,0,0.05) inset",
          }}
        >
          <p className="min-w-0 flex-1 text-[15px] leading-snug text-neutral-500">
            Your <span className="font-bold text-neutral-900">personal</span> event planner.
          </p>
          <button
            type="button"
            onClick={handleJoinClick}
            className="shrink-0 rounded-xl px-10 py-2 text-base font-semibold text-white transition-[filter] hover:brightness-125 active:brightness-90"
            style={{
              backgroundColor: "#0a0a0a",
              boxShadow: "0 4px 14px -4px rgba(0,0,0,0.5)",
            }}
          >
            Join Waitlist
          </button>
        </div>
      </div>

      {/* Sign-up method overlay */}
      {(showChoice || showEmailForm) && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 px-4 pb-6 sm:items-center sm:pb-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseOverlay();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6"
            style={{
              boxShadow: "0 24px 64px -16px rgba(0,0,0,0.5)",
            }}
          >
            {/* Method selection */}
            {showChoice && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-neutral-900">Join the waitlist</h2>
                  <button
                    type="button"
                    onClick={handleCloseOverlay}
                    className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                    aria-label="Close"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-[15px] text-neutral-500">Choose how you&apos;d like to sign up.</p>

                {/* Google */}
                <button
                  type="button"
                  onClick={handleChooseGoogle}
                  className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[15px] font-medium text-neutral-900 transition-colors hover:bg-neutral-50 active:bg-neutral-100"
                >
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>

                {/* Email */}
                <button
                  type="button"
                  onClick={handleChooseEmail}
                  className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[15px] font-medium text-neutral-900 transition-colors hover:bg-neutral-50 active:bg-neutral-100"
                >
                  <svg className="h-5 w-5 shrink-0 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  Continue with Email
                </button>
              </div>
            )}

            {/* Email input form */}
            {showEmailForm && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-neutral-900">Enter your email</h2>
                  <button
                    type="button"
                    onClick={handleCloseOverlay}
                    className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                    aria-label="Close"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleEmailSubmit(); }}
                  placeholder="you@example.com"
                  autoFocus
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-[15px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                />

                {emailError && (
                  <p className="text-[13px] text-red-600">{emailError}</p>
                )}

                <button
                  type="button"
                  onClick={handleEmailSubmit}
                  className="w-full rounded-full py-3 text-sm font-semibold text-white transition-[filter] hover:brightness-105 active:brightness-95"
                  style={{ backgroundColor: "#0a0a0a" }}
                >
                  Continue
                </button>

                <button
                  type="button"
                  onClick={() => { setShowEmailForm(false); setShowChoice(true); }}
                  className="text-center text-[13px] text-neutral-400 transition-colors hover:text-neutral-600"
                >
                  ← Back
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

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
      {/* Extra bottom padding so demos never hide behind the fixed bar */}
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-28 pt-28 sm:px-6 sm:pt-32">
        <div className="mx-auto flex w-full max-w-md flex-col justify-start gap-2.5">
          {children}
        </div>
      </div>
      {showScrollHint ? (
        /* Positioned above the fixed bottom bar (~72px) + comfortable gap */
        <p className="pointer-events-none absolute bottom-24 left-0 right-0 text-center text-xs font-bold text-white">
          Scroll down for more
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
      <GraduationVenueCard />
    </div>
  );
}

function renderScene5Item(item: Scene5Item, i: number) {
  if (item.kind === "user") {
    return (
      <div key={i} className="message-fade-in">
        <BubbleUser>{item.text}</BubbleUser>
      </div>
    );
  }
  return (
    <div key={i} className="message-fade-in">
      <BubbleAssistant>{item.text}</BubbleAssistant>
    </div>
  );
}


export function DoubtfireLanding() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const s1 = useRef<HTMLElement>(null);
  const s2 = useRef<HTMLElement>(null);
  const s3 = useRef<HTMLElement>(null);
  const s4 = useRef<HTMLElement>(null);
  const s5 = useRef<HTMLElement>(null);

  const s1State = useStaggeredReveal(SCENE1.length, s1, scrollRef);
  const s2State = useStaggeredReveal(SCENE2.length, s2, scrollRef);
  const s3State = useStaggeredReveal(SCENE3.length, s3, scrollRef);
  const s4State = useStaggeredReveal(SCENE4.length, s4, scrollRef);
  const s5State = useStaggeredReveal(SCENE5.length, s5, scrollRef);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    // Forward loop: fired on every scroll event. When scrollTop + clientHeight
    // reaches the very end (the ghost snap section), instantly jump to scene 1.
    // This is reliable because it checks exact pixel position, not intersection ratios.
    const handleScroll = () => {
      const { scrollTop, clientHeight, scrollHeight } = scrollEl;
      if (scrollTop + clientHeight >= scrollHeight - 5) {
        scrollEl.scrollTo({ top: 0, behavior: "instant" });
      }
    };

    // Backward loop: at scene 1 (scrollTop === 0), wheel-up or swipe-down → scene 5.
    const jumpToLastScene = () => {
      const lastScene = s5.current;
      if (lastScene) {
        scrollEl.scrollTo({ top: lastScene.offsetTop, behavior: "instant" });
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (scrollEl.scrollTop === 0 && e.deltaY < 0) {
        e.preventDefault();
        jumpToLastScene();
      }
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const swipedDown = e.changedTouches[0].clientY - touchStartY > 40;
      if (scrollEl.scrollTop === 0 && swipedDown) {
        jumpToLastScene();
      }
    };

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    scrollEl.addEventListener("wheel", handleWheel, { passive: false });
    scrollEl.addEventListener("touchstart", handleTouchStart, { passive: true });
    scrollEl.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      scrollEl.removeEventListener("scroll", handleScroll);
      scrollEl.removeEventListener("wheel", handleWheel);
      scrollEl.removeEventListener("touchstart", handleTouchStart);
      scrollEl.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 overflow-y-auto overscroll-y-contain"
      ref={scrollRef}
      data-doubtfire-scroll-root
      style={{
        scrollSnapType: "y mandatory",
        WebkitOverflowScrolling: "touch",
        backgroundColor: "#000000",
      }}
    >
      <BertramStaticBg />
      <PersistentWaitlistBar />
      <div className="relative z-10 isolate">
        <DoubtfireSiteHeader />

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

      <SceneBlock sectionRef={s4}>
        {SCENE4.slice(0, s4State.revealed).map((item, i) => renderScene4Item(item, i))}
        {s4State.typing && s4State.revealed < SCENE4.length && (
          <TypingBubble align={typingAlignScene4(SCENE4[s4State.revealed])} />
        )}
      </SceneBlock>

      <SceneBlock sectionRef={s5}>
        {SCENE5.slice(0, s5State.revealed).map((item, i) => renderScene5Item(item, i))}
        {s5State.typing && s5State.revealed < SCENE5.length && (
          <TypingBubble align={typingAlignScene5(SCENE5[s5State.revealed])} />
        )}
      </SceneBlock>

      {/* Ghost snap section — invisible, provides a snap target after scene 5
           so the scroll event can detect end-of-list and loop back to scene 1 */}
      <div aria-hidden className="min-h-[100dvh] snap-start snap-always" />
      </div>
    </div>
  );
}
