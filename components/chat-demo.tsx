"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Send, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";

import { DOUBTFIRE_BLUE } from "@/components/doubtfire/doubtfire-chrome";
import { cn } from "@/lib/utils";

type ChatRole = "assistant" | "user";
type ChatMessageType = "text";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  type?: ChatMessageType;
};

export type ChatDemoVariant = "public" | "authenticated";

type ChatFlow = "party_intake" | "waitlist_survey";

const SESSION_STORAGE_WAITLIST = "concierge_session_waitlist";
const SESSION_STORAGE_KIDS = "concierge_session_kids_party";

/**
 * Bump when backend `OPENING_MESSAGES` in `backend/services/waitlist_survey_flow.py`
 * changes so we do not resume an old DB session that still has a previous intro.
 */
const WAITLIST_OPENING_VERSION = "3";

function waitlistOpeningVersionKey(): string {
  return "concierge_waitlist_opening_v";
}

function sessionStorageKey(surface: "waitlist" | "kids_party"): string {
  return surface === "kids_party" ? SESSION_STORAGE_KIDS : SESSION_STORAGE_WAITLIST;
}

function apiFlowForSurface(surface: "waitlist" | "kids_party"): ChatFlow {
  return surface === "kids_party" ? "party_intake" : "waitlist_survey";
}

/** Match `doubtfire-landing` iMessage-style pacing between assistant bubbles. */
const ASSISTANT_BATCH_TYPING_MS = 480;
const ASSISTANT_BATCH_PAUSE_MS = 420;

type PendingAssistantReveal = {
  lines: string[];
  /** `replace`: chat was empty (new session / resume opener). `append`: add after existing scrollback. */
  mode: "replace" | "append";
  /** After stagger (replace only), append these without delay. */
  tail?: ChatMessage[];
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function shouldStaggerAssistantBatch(
  isDoubtfire: boolean,
  lineCount: number
): boolean {
  return isDoubtfire && lineCount > 1 && !prefersReducedMotion();
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

/** Leading assistant messages before the first user turn (waitlist openers). */
function takeLeadingAssistantPrefix(
  rows: Array<{ role: string; content: string }>
): { prefix: string[]; rest: ChatMessage[] } {
  const prefix: string[] = [];
  let i = 0;
  for (; i < rows.length; i++) {
    const r = rows[i]!;
    if (r.role !== "assistant") break;
    prefix.push(r.content);
  }
  const rest: ChatMessage[] = rows.slice(i).map((msg) => ({
    id: createId(),
    role: msg.role as ChatRole,
    content: msg.content,
    type: "text" as const,
  }));
  return { prefix, rest };
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

const FETCH_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        "The server is taking too long to respond. Please try again in a moment."
      );
    }
    throw new Error(
      "Couldn't connect to the server. Please check your connection and try again."
    );
  } finally {
    window.clearTimeout(timer);
  }
}

function TypingBubble({ doubtfire }: { doubtfire?: boolean }) {
  const dots = (
    <div className="flex items-center gap-1.5 px-0.5 py-0.5" aria-hidden>
      <span
        className={cn(
          "typing-dot inline-block rounded-full",
          doubtfire ? "size-2 bg-neutral-400" : "h-1.5 w-1.5 bg-slate-400"
        )}
      />
      <span
        className={cn(
          "typing-dot inline-block rounded-full",
          doubtfire ? "size-2 bg-neutral-400" : "h-1.5 w-1.5 bg-slate-400"
        )}
      />
      <span
        className={cn(
          "typing-dot inline-block rounded-full",
          doubtfire ? "size-2 bg-neutral-400" : "h-1.5 w-1.5 bg-slate-400"
        )}
      />
    </div>
  );

  if (doubtfire) {
    return (
      <div className="message-fade-in relative z-[2] flex justify-start">
        <div
          className="rounded-[20px] rounded-bl-md bg-white px-4 py-3 opacity-100 shadow-[0_2px_14px_-6px_rgba(0,0,0,0.22)] ring-1 ring-black/[0.06] [transform:translateZ(0)]"
        >
          {dots}
        </div>
      </div>
    );
  }

  return (
    <div className="message-fade-in flex justify-start">
      <div className="rounded-2xl rounded-tl-sm border border-white/[0.06] bg-white/[0.04] px-4 py-3">
        {dots}
      </div>
    </div>
  );
}

export type ChatDemoTheme = "violet" | "doubtfire";

type ChatDemoProps = {
  variant?: ChatDemoVariant;
  theme?: ChatDemoTheme;
  /** `/chat` = waitlist survey; `/kids-bday` = party intake (allowlisted users). */
  surface?: "waitlist" | "kids_party";
};

export function ChatDemo({
  variant = "authenticated",
  theme = "violet",
  surface = "waitlist",
}: ChatDemoProps) {
  const isDoubtfire = theme === "doubtfire";
  const { data: session, status: sessionStatus } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [pendingAutoWaitlist, setPendingAutoWaitlist] = useState(false);
  const [autoWaitlistBusy, setAutoWaitlistBusy] = useState(false);
  const [autoWaitlistRetryVisible, setAutoWaitlistRetryVisible] = useState(false);
  const [chatFlow, setChatFlow] = useState<ChatFlow | null>(null);
  const [chatKey, setChatKey] = useState(0);
  /** Multi-bubble assistant lines; shown one-by-one (Doubtfire, iMessage-style). */
  const [pendingAssistantReveal, setPendingAssistantReveal] =
    useState<PendingAssistantReveal | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const autoWaitlistInFlight = useRef(false);
  const surveyEmailRegisteredRef = useRef(false);
  const assistantRevealRunIdRef = useRef(0);

  const isWaitlistSurvey = chatFlow === "waitlist_survey";
  const [waitlistSurveyLocked, setWaitlistSurveyLocked] = useState(false);
  const chatLocked =
    waitlistSurveyLocked ||
    (!isWaitlistSurvey &&
      (waitlistSubmitted ||
        autoWaitlistBusy ||
        pendingAutoWaitlist ||
        autoWaitlistRetryVisible));

  const startNewChat = useCallback(() => {
    window.localStorage.removeItem(sessionStorageKey(surface));
    setMessages([]);
    setSessionId(null);
    setInput("");
    setIsTyping(true);
    setIsSending(false);
    setWaitlistSubmitted(false);
    setPendingAutoWaitlist(false);
    setAutoWaitlistBusy(false);
    setAutoWaitlistRetryVisible(false);
    setChatFlow(null);
    autoWaitlistInFlight.current = false;
    surveyEmailRegisteredRef.current = false;
    setPendingAssistantReveal(null);
    setWaitlistSurveyLocked(false);
    setChatKey((k) => k + 1);
  }, [surface]);

  useEffect(() => {
    if (!pendingAssistantReveal?.lines.length) return;

    const job = pendingAssistantReveal;
    const lines = job.lines;
    const runId = ++assistantRevealRunIdRef.current;
    let cancelled = false;
    const timeouts: number[] = [];
    const msgIds = lines.map(() => createId());

    const buildAssistantMsgs = () =>
      lines.map((content, i) => ({
        id: msgIds[i]!,
        role: "assistant" as const,
        content,
        type: "text" as const,
      }));

    const flushAll = () => {
      const newBubbles = buildAssistantMsgs();
      const tail = job.tail ?? [];
      if (job.mode === "replace") {
        setMessages([...newBubbles, ...tail]);
      } else {
        setMessages((prev) => [...prev, ...newBubbles, ...tail]);
      }
      setPendingAssistantReveal(null);
      setIsTyping(false);
    };

    if (!shouldStaggerAssistantBatch(isDoubtfire, lines.length)) {
      flushAll();
      return;
    }

    if (job.mode === "replace") {
      setMessages([]);
    }

    let step = 0;

    const finishJob = () => {
      if (job.tail?.length) {
        setMessages((prev) => [...prev, ...job.tail!]);
      }
      setPendingAssistantReveal(null);
      setIsTyping(false);
    };

    const typingThenReveal = () => {
      if (cancelled || runId !== assistantRevealRunIdRef.current) {
        return;
      }
      if (step >= lines.length) {
        finishJob();
        return;
      }
      setIsTyping(true);
      const tReveal = window.setTimeout(() => {
        if (cancelled || runId !== assistantRevealRunIdRef.current) return;
        setIsTyping(false);
        const idx = step;
        step += 1;
        setMessages((prev) => [
          ...prev,
          {
            id: msgIds[idx]!,
            role: "assistant",
            content: lines[idx]!,
            type: "text",
          },
        ]);
        if (step < lines.length) {
          const tNext = window.setTimeout(
            typingThenReveal,
            ASSISTANT_BATCH_PAUSE_MS
          );
          timeouts.push(tNext);
        } else {
          finishJob();
        }
      }, ASSISTANT_BATCH_TYPING_MS);
      timeouts.push(tReveal);
    };

    typingThenReveal();

    return () => {
      cancelled = true;
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [pendingAssistantReveal, isDoubtfire]);

  useEffect(() => {
    let cancelled = false;

    async function tryResumeSession(): Promise<boolean> {
      try {
        const storageId = sessionStorageKey(surface);
        const savedId = window.localStorage.getItem(storageId);
        if (!savedId) return false;

        if (surface === "waitlist") {
          const introV = window.localStorage.getItem(waitlistOpeningVersionKey());
          if (introV !== WAITLIST_OPENING_VERSION) {
            window.localStorage.removeItem(storageId);
            window.localStorage.removeItem(waitlistOpeningVersionKey());
            return false;
          }
        }

        const response = await fetchWithTimeout(`/api/chat/${savedId}`);
        if (!response.ok) {
          window.localStorage.removeItem(storageId);
          return false;
        }

        const data = (await response.json()) as {
          session_id?: string;
          messages?: Array<{ role: string; content: string }>;
          showWaitlist?: boolean;
          chat_flow?: ChatFlow;
          waitlist_survey_locked?: boolean;
        };

        if (cancelled || !data.messages?.length) return false;

        const flow: ChatFlow =
          data.chat_flow === "waitlist_survey"
            ? "waitlist_survey"
            : "party_intake";
        setChatFlow(flow);
        setWaitlistSurveyLocked(Boolean(data.waitlist_survey_locked));

        setSessionId(data.session_id ?? savedId);

        const { prefix, rest } = takeLeadingAssistantPrefix(data.messages);
        const resumeWaitlistStagger =
          flow === "waitlist_survey" &&
          isDoubtfire &&
          surface === "waitlist" &&
          shouldStaggerAssistantBatch(isDoubtfire, prefix.length);

        let resumeTail = rest;
        if (data.showWaitlist && variant === "public") {
          resumeTail = [
            ...rest,
            {
              id: createId(),
              role: "assistant",
              content:
                "Thanks for sharing your party details. Sign in with Google on the home page to save your spot on the waitlist.",
              type: "text",
            },
          ];
        }

        if (resumeWaitlistStagger) {
          setMessages([]);
          setPendingAssistantReveal({
            lines: prefix,
            mode: "replace",
            tail: resumeTail,
          });
        } else {
          setMessages(
            data.messages.map((msg) => ({
              id: createId(),
              role: msg.role as ChatRole,
              content: msg.content,
              type: "text" as const,
            }))
          );
          if (data.showWaitlist && variant === "public") {
            setMessages((current) => [
              ...current,
              {
                id: createId(),
                role: "assistant",
                content:
                  "Thanks for sharing your party details. Sign in with Google on the home page to save your spot on the waitlist.",
                type: "text",
              },
            ]);
          }
        }

        if (
          data.showWaitlist &&
          variant === "authenticated" &&
          flow === "party_intake"
        ) {
          setPendingAutoWaitlist(true);
        }

        return true;
      } catch {
        window.localStorage.removeItem(sessionStorageKey(surface));
        return false;
      }
    }

    async function startNewSession(): Promise<boolean> {
      const response = await fetchWithTimeout("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow: apiFlowForSurface(surface) }),
      });

      const data = (await response.json()) as {
        session_id?: string;
        messages?: string[];
        error?: string;
        chat_flow?: ChatFlow;
        waitlist_survey_locked?: boolean;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not start chat.");
      }

      if (cancelled) return false;

      const flow: ChatFlow =
        data.chat_flow === "waitlist_survey"
          ? "waitlist_survey"
          : "party_intake";
      setChatFlow(flow);
      setWaitlistSurveyLocked(Boolean(data.waitlist_survey_locked));

      const newId = data.session_id ?? null;
      setSessionId(newId);
      if (newId) {
        const sid = sessionStorageKey(surface);
        window.localStorage.setItem(sid, newId);
        if (surface === "waitlist") {
          window.localStorage.setItem(
            waitlistOpeningVersionKey(),
            WAITLIST_OPENING_VERSION
          );
        }
      }

      const msgs = data.messages ?? [];
      const useStaggeredOpeners =
        msgs.length > 1 && shouldStaggerAssistantBatch(isDoubtfire, msgs.length);

      if (useStaggeredOpeners) {
        setMessages([]);
        setPendingAssistantReveal({ lines: msgs, mode: "replace" });
        return true;
      }

      setMessages(
        msgs.map((content) => ({
          id: createId(),
          role: "assistant" as const,
          content,
          type: "text" as const,
        }))
      );
      return false;
    }

    async function initializeChat() {
      let keepTypingUntilIntroDone = false;
      try {
        const resumed = await tryResumeSession();
        if (!resumed && !cancelled) {
          keepTypingUntilIntroDone = await startNewSession();
        }
      } catch (chatError) {
        if (cancelled) return;
        setMessages([
          {
            id: createId(),
            role: "assistant",
            content:
              chatError instanceof Error
                ? chatError.message
                : "I couldn't start the planning chat.",
            type: "text",
          },
        ]);
      } finally {
        if (!cancelled && !keepTypingUntilIntroDone) {
          setIsTyping(false);
        }
      }
    }

    void initializeChat();

    return () => {
      cancelled = true;
    };
  }, [chatKey, variant, surface, theme]);

  useEffect(() => {
    if (
      variant !== "authenticated" ||
      !pendingAutoWaitlist ||
      !sessionId ||
      chatFlow === "waitlist_survey"
    ) {
      return;
    }

    if (sessionStatus === "loading") {
      return;
    }

    if (sessionStatus === "unauthenticated") {
      setPendingAutoWaitlist(false);
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content:
            "Your planning session is ready, but you need to be signed in to join the waitlist. Please refresh and sign in with Google.",
          type: "text",
        },
      ]);
      return;
    }

    const email = session?.user?.email?.trim();
    if (!email) {
      setPendingAutoWaitlist(false);
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content:
            "We couldn't read your Google email. Try signing out and back in, then start a new chat.",
          type: "text",
        },
      ]);
      return;
    }

    if (autoWaitlistInFlight.current) {
      return;
    }

    let cancelled = false;
    autoWaitlistInFlight.current = true;
    setAutoWaitlistBusy(true);
    setAutoWaitlistRetryVisible(false);

    async function runAutoWaitlist() {
      try {
        const evResponse = await fetchWithTimeout(`/api/events/${sessionId}`);
        const evData = (await evResponse.json()) as {
          requirements?: { zip_code?: string };
          error?: string;
        };

        if (!evResponse.ok) {
          throw new Error(evData.error ?? "Could not load your party details.");
        }

        const zipRaw = evData.requirements?.zip_code?.trim() ?? "";
        const city = zipRaw || "Location from chat";

        const wlResponse = await fetchWithTimeout("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            email,
            city,
          }),
        });

        const wlData = (await wlResponse.json()) as {
          message?: string;
          error?: string;
        };

        if (!wlResponse.ok) {
          throw new Error(wlData.error ?? "Could not save your waitlist spot.");
        }

        if (cancelled) return;

        const confirmation =
          (wlData.message ?? "You're on the waitlist.") +
          " Welcome to the waitlist — we'll reach out when it's your turn.";

        setWaitlistSubmitted(true);
        setMessages((current) => [
          ...current,
          {
            id: createId(),
            role: "assistant",
            content: confirmation,
            type: "text",
          },
        ]);
      } catch (err) {
        if (cancelled) return;
        const text =
          err instanceof Error
            ? err.message
            : "Something went wrong saving your waitlist spot.";
        setMessages((current) => [
          ...current,
          {
            id: createId(),
            role: "assistant",
            content: text,
            type: "text",
          },
        ]);
        setAutoWaitlistRetryVisible(true);
      } finally {
        if (!cancelled) {
          setAutoWaitlistBusy(false);
          setPendingAutoWaitlist(false);
          autoWaitlistInFlight.current = false;
        }
      }
    }

    void runAutoWaitlist();

    return () => {
      cancelled = true;
    };
  }, [pendingAutoWaitlist, sessionId, session, sessionStatus, variant, chatFlow]);

  useEffect(() => {
    if (
      variant !== "authenticated" ||
      chatFlow !== "waitlist_survey" ||
      !sessionId ||
      sessionStatus === "loading"
    ) {
      return;
    }

    if (sessionStatus === "unauthenticated") {
      return;
    }

    const email = session?.user?.email?.trim();
    if (!email || surveyEmailRegisteredRef.current) {
      return;
    }

    const userTurns = messages.filter((m) => m.role === "user").length;
    const assistantTurns = messages.filter((m) => m.role === "assistant").length;
    if (userTurns > 0 || assistantTurns < 4) {
      return;
    }

    let cancelled = false;
    surveyEmailRegisteredRef.current = true;

    async function registerSurveyEmail() {
      try {
        const wlResponse = await fetchWithTimeout("/api/landing-waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const wlData = (await wlResponse.json()) as {
          message?: string;
          error?: string;
        };

        if (!wlResponse.ok) {
          throw new Error(wlData.error ?? "Could not save your waitlist spot.");
        }

        if (cancelled) return;
      } catch (err) {
        surveyEmailRegisteredRef.current = false;
        if (cancelled) return;
        const text =
          err instanceof Error
            ? err.message
            : "Something went wrong saving your waitlist spot.";
        setMessages((current) => [
          ...current,
          {
            id: createId(),
            role: "assistant",
            content: text,
            type: "text",
          },
        ]);
      }
    }

    void registerSurveyEmail();

    return () => {
      cancelled = true;
    };
  }, [variant, chatFlow, sessionId, session, sessionStatus, messages]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping, autoWaitlistBusy]);

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = input.trim();

    if (!trimmed || !sessionId || isSending || isTyping || chatLocked) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmed,
      type: "text",
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsSending(true);
    setIsTyping(true);

    let queueStaggeredReply = false;

    try {
      const response = await fetchWithTimeout("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: trimmed,
        }),
      });

      const data = (await response.json()) as {
        session_id?: string;
        messages?: string[];
        showWaitlist?: boolean;
        chat_flow?: ChatFlow;
        error?: string;
        waitlist_survey_locked?: boolean;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Chat request failed.");
      }

      await sleep(600);
      const updatedId = data.session_id ?? sessionId;
      setSessionId(updatedId);
      if (updatedId) {
        window.localStorage.setItem(sessionStorageKey(surface), updatedId);
      }

      const nextFlow: ChatFlow =
        data.chat_flow === "waitlist_survey" ? "waitlist_survey" : "party_intake";
      setChatFlow(nextFlow);
      setWaitlistSurveyLocked(Boolean(data.waitlist_survey_locked));

      const assistantLines = data.messages ?? [];
      queueStaggeredReply =
        assistantLines.length > 1 &&
        shouldStaggerAssistantBatch(isDoubtfire, assistantLines.length);

      if (queueStaggeredReply) {
        setPendingAssistantReveal({
          lines: assistantLines,
          mode: "append",
        });
      } else {
        setMessages((current) => {
          const additions: ChatMessage[] = assistantLines.map((content) => ({
            id: createId(),
            role: "assistant",
            content,
            type: "text",
          }));

          return [...current, ...additions];
        });
      }

      if (
        data.showWaitlist &&
        !waitlistSubmitted &&
        nextFlow === "party_intake"
      ) {
        if (variant === "authenticated") {
          setPendingAutoWaitlist(true);
        } else {
          const signInNudge: ChatMessage = {
            id: createId(),
            role: "assistant",
            content:
              "Thanks for sharing your party details. Sign in with Google on the home page to save your spot on the waitlist.",
            type: "text",
          };
          if (queueStaggeredReply) {
            setPendingAssistantReveal((p) =>
              p
                ? { ...p, tail: [...(p.tail ?? []), signInNudge] }
                : p
            );
          } else {
            setMessages((current) => [...current, signInNudge]);
          }
        }
      }
    } catch (chatError) {
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content:
            chatError instanceof Error
              ? chatError.message
              : "I hit a snag generating the party plan.",
          type: "text",
        },
      ]);
    } finally {
      setIsSending(false);
      if (!queueStaggeredReply) {
        setIsTyping(false);
      }
    }
  }

  function handleRetryWaitlist() {
    setAutoWaitlistRetryVisible(false);
    setPendingAutoWaitlist(true);
  }

  return (
    <div
      className={cn(
        "w-full",
        isDoubtfire
          ? "flex h-full min-h-0 flex-col"
          : "overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm"
      )}
    >
      {!isDoubtfire ? (
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-400/20">
              <Sparkles className="h-4 w-4 text-violet-300" />
            </div>
            <div>
              <p className="text-[13px] font-semibold tracking-tight text-white sm:text-sm">
                bertram
              </p>
              <p className="hidden text-[11px] text-slate-500 sm:block">
                Tell us about the party you have in mind
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={startNewChat}
              disabled={isTyping || isSending || autoWaitlistBusy}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white disabled:pointer-events-none disabled:opacity-40"
            >
              <RotateCcw className="h-3 w-3" />
              New chat
            </button>
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live
            </div>
          </div>
        </div>
      ) : null}

      {isDoubtfire ? (
        <>
          <div
            ref={scrollRef}
            className="relative z-[2] min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [transform:translateZ(0)] [&::-webkit-scrollbar]:hidden"
          >
            <div className="pb-2 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:pt-[calc(3.75rem+env(safe-area-inset-top,0px))]">
              <div className="mb-2 flex items-center justify-end sm:mb-3">
                <button
                  type="button"
                  onClick={startNewChat}
                  disabled={isTyping || isSending || autoWaitlistBusy}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-transparent px-3 py-1.5 text-[11px] font-medium text-neutral-200 transition-colors hover:border-white/35 hover:bg-white/[0.06] disabled:pointer-events-none disabled:opacity-40"
                >
                  <RotateCcw className="h-3 w-3" />
                  New chat
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {messages.map((message) => {
                  const isAssistant = message.role === "assistant";

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "message-fade-in relative z-[2] flex",
                        isAssistant ? "justify-start" : "justify-end"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[min(92vw,380px)] px-4 py-2.5 text-[13px] leading-relaxed opacity-100 sm:text-sm [transform:translateZ(0)]",
                          isAssistant
                            ? "rounded-[20px] rounded-bl-md bg-white text-[15px] leading-snug text-neutral-900 shadow-[0_2px_14px_-6px_rgba(0,0,0,0.22)] ring-1 ring-black/[0.06]"
                            : "rounded-[20px] rounded-br-md text-[15px] leading-snug text-white shadow-[0_2px_14px_-6px_rgba(0,0,0,0.35)]"
                        )}
                        style={
                          !isAssistant ? { backgroundColor: DOUBTFIRE_BLUE } : undefined
                        }
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  );
                })}

                {isTyping || autoWaitlistBusy ? (
                  <TypingBubble doubtfire={true} />
                ) : null}
              </div>
            </div>
          </div>

          {autoWaitlistRetryVisible ? (
            <div className="relative z-[2] shrink-0 bg-transparent py-2">
              <button
                type="button"
                onClick={handleRetryWaitlist}
                className="w-full rounded-full py-2.5 text-sm font-semibold text-white transition-[filter] hover:brightness-105"
                style={{
                  backgroundColor: DOUBTFIRE_BLUE,
                  boxShadow: "0 8px 28px -8px rgba(27,111,245,0.45)",
                }}
              >
                Try saving your waitlist spot again
              </button>
            </div>
          ) : null}

          <form
            onSubmit={handleSend}
            className="relative z-[2] shrink-0 bg-transparent pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pt-3"
          >
            <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-[0_2px_14px_-6px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.08] focus-within:ring-2 focus-within:ring-[#1B6FF5]/35 sm:gap-2.5 sm:px-4 sm:py-2.5">
              <label htmlFor="chat-input" className="sr-only">
                Reply to Bertram
              </label>
              <input
                id="chat-input"
                type="text"
                placeholder="Type your answer..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={
                  !sessionId ||
                  isSending ||
                  isTyping ||
                  chatLocked ||
                  autoWaitlistRetryVisible
                }
                className="min-h-10 flex-1 border-0 bg-transparent px-1 text-[15px] text-neutral-900 outline-none ring-0 placeholder:text-neutral-500 focus:ring-0 disabled:opacity-50 sm:min-h-11"
              />
              <button
                type="submit"
                disabled={
                  !input.trim() ||
                  !sessionId ||
                  isSending ||
                  isTyping ||
                  chatLocked ||
                  autoWaitlistRetryVisible
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-[0_4px_16px_-4px_rgba(27,111,245,0.45)] transition-[filter] hover:brightness-105 active:brightness-95 disabled:pointer-events-none disabled:opacity-40 sm:h-11 sm:w-11"
                style={{ backgroundColor: DOUBTFIRE_BLUE }}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className="grid min-h-[50vh] grid-rows-[1fr_auto] sm:min-h-[58vh]">
          <div
            ref={scrollRef}
            className="space-y-3 overflow-y-auto px-4 py-4 sm:space-y-4 sm:px-5"
          >
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";

              return (
                <div
                  key={message.id}
                  className={cn(
                    "message-fade-in flex",
                    isAssistant ? "justify-start" : "justify-end"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] px-4 py-2.5 text-[13px] leading-relaxed sm:text-sm",
                      isAssistant
                        ? "rounded-2xl rounded-tl-sm border border-white/[0.06] bg-white/[0.04] text-slate-200"
                        : "rounded-2xl rounded-tr-sm bg-violet-500 text-white"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              );
            })}

            {isTyping || autoWaitlistBusy ? (
              <TypingBubble doubtfire={false} />
            ) : null}
          </div>

          {autoWaitlistRetryVisible ? (
            <div className="border-t border-white/[0.06] px-4 py-2 sm:px-5">
              <button
                type="button"
                onClick={handleRetryWaitlist}
                className="w-full rounded-xl bg-violet-500/90 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
              >
                Try saving your waitlist spot again
              </button>
            </div>
          ) : null}

          <form
            onSubmit={handleSend}
            className="border-t border-white/[0.06] px-4 py-3 sm:px-5 sm:py-4"
          >
            <div className="flex items-center gap-2.5">
              <label htmlFor="chat-input" className="sr-only">
                Reply to Bertram
              </label>
              <input
                id="chat-input"
                type="text"
                placeholder="Type your answer..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={
                  !sessionId ||
                  isSending ||
                  isTyping ||
                  chatLocked ||
                  autoWaitlistRetryVisible
                }
                className="flex h-11 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-violet-400/30 focus:ring-1 focus:ring-violet-400/20 disabled:opacity-50 sm:h-12"
              />
              <button
                type="submit"
                disabled={
                  !input.trim() ||
                  !sessionId ||
                  isSending ||
                  isTyping ||
                  chatLocked ||
                  autoWaitlistRetryVisible
                }
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white transition-colors hover:bg-violet-400 disabled:pointer-events-none disabled:opacity-40 sm:h-12 sm:w-12"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
