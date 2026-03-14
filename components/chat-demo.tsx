"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, RotateCcw, Send, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type ChatRole = "assistant" | "user";
type ChatMessageType = "text" | "waitlist";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  type?: ChatMessageType;
};

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
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

function TypingBubble() {
  return (
    <div className="message-fade-in flex justify-start">
      <div className="rounded-2xl rounded-tl-sm border border-white/[0.06] bg-white/[0.04] px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
        </div>
      </div>
    </div>
  );
}

type WaitlistFormProps = {
  disabled: boolean;
  sessionId: string | null;
  onSuccess: (message: string) => void;
};

function WaitlistForm({ disabled, sessionId, onSuccess }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled || isSubmitting) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ session_id: sessionId, email, city }),
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }

      setEmail("");
      setCity("");
      onSuccess(data.message ?? "You're on the waitlist.");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not join waitlist."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="message-fade-in flex justify-start">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm">
        <div className="border-b border-white/[0.06] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-400/20">
              <Mail className="h-4 w-4 text-violet-300" />
            </div>
            <div>
              <p className="text-[13px] font-semibold tracking-tight text-white">
                Join the waitlist
              </p>
              <p className="text-[11px] text-slate-500">
                Get early access when we launch
              </p>
            </div>
          </div>
        </div>
        <form className="space-y-3 px-5 py-4" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={disabled || isSubmitting}
            required
            className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-violet-400/30 focus:ring-1 focus:ring-violet-400/20 disabled:opacity-50"
          />
          <input
            type="text"
            placeholder="City"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            disabled={disabled || isSubmitting}
            required
            className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-violet-400/30 focus:ring-1 focus:ring-violet-400/20 disabled:opacity-50"
          />
          {error ? <p className="text-[13px] text-rose-400">{error}</p> : null}
          <button
            type="submit"
            disabled={disabled || isSubmitting}
            className="flex h-10 w-full items-center justify-center rounded-xl bg-violet-500 text-sm font-medium text-white transition-colors hover:bg-violet-400 disabled:pointer-events-none disabled:opacity-50"
          >
            {isSubmitting ? "Joining..." : "Join Waitlist"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function ChatDemo() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const waitlistVisible = messages.some((message) => message.type === "waitlist");

  const startNewChat = useCallback(() => {
    window.localStorage.removeItem("concierge_session_id");
    setMessages([]);
    setSessionId(null);
    setInput("");
    setIsTyping(true);
    setIsSending(false);
    setWaitlistSubmitted(false);
    setChatKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function tryResumeSession(): Promise<boolean> {
      try {
        const savedId = window.localStorage.getItem("concierge_session_id");
        if (!savedId) return false;

        const response = await fetchWithTimeout(`/api/chat/${savedId}`);
        if (!response.ok) {
          window.localStorage.removeItem("concierge_session_id");
          return false;
        }

        const data = (await response.json()) as {
          session_id?: string;
          messages?: Array<{ role: string; content: string }>;
          showWaitlist?: boolean;
        };

        if (cancelled || !data.messages?.length) return false;

        setSessionId(data.session_id ?? savedId);
        setMessages(
          data.messages.map((msg) => ({
            id: createId(),
            role: msg.role as ChatRole,
            content: msg.content,
            type: "text" as const,
          }))
        );

        if (data.showWaitlist) {
          setMessages((current) => [
            ...current,
            {
              id: createId(),
              role: "assistant",
              content: "waitlist",
              type: "waitlist",
            },
          ]);
        }

        return true;
      } catch {
        window.localStorage.removeItem("concierge_session_id");
        return false;
      }
    }

    async function startNewSession() {
      const response = await fetchWithTimeout("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = (await response.json()) as {
        session_id?: string;
        messages?: string[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not start chat.");
      }

      if (cancelled) return;

      const newId = data.session_id ?? null;
      setSessionId(newId);
      if (newId) {
        window.localStorage.setItem("concierge_session_id", newId);
      }
      setMessages(
        (data.messages ?? []).map((content) => ({
          id: createId(),
          role: "assistant" as const,
          content,
          type: "text" as const,
        }))
      );
    }

    async function initializeChat() {
      try {
        const resumed = await tryResumeSession();
        if (!resumed && !cancelled) {
          await startNewSession();
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
        if (!cancelled) {
          setIsTyping(false);
        }
      }
    }

    void initializeChat();

    return () => {
      cancelled = true;
    };
  }, [chatKey]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = input.trim();

    if (
      !trimmed ||
      !sessionId ||
      isSending ||
      isTyping ||
      (waitlistVisible && !waitlistSubmitted)
    ) {
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
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Chat request failed.");
      }

      await sleep(600);
      const updatedId = data.session_id ?? sessionId;
      setSessionId(updatedId);
      if (updatedId) {
        window.localStorage.setItem("concierge_session_id", updatedId);
      }

      setMessages((current) => {
        const additions: ChatMessage[] = (data.messages ?? []).map((content) => ({
          id: createId(),
          role: "assistant",
          content,
          type: "text",
        }));

        if (data.showWaitlist && !waitlistSubmitted) {
          additions.push({
            id: createId(),
            role: "assistant",
            content: "waitlist",
            type: "waitlist",
          });
        }

        return [...current, ...additions];
      });
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
      setIsTyping(false);
    }
  }

  function handleWaitlistSuccess(message: string) {
    setWaitlistSubmitted(true);
    setMessages((current) => [
      ...current.filter((item) => item.type !== "waitlist"),
      {
        id: createId(),
        role: "assistant",
        content: message,
        type: "text",
      },
    ]);

    window.setTimeout(() => {
      router.push(sessionId ? `/bento-demo?session=${sessionId}` : "/bento-demo");
    }, 900);
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-400/20">
            <Sparkles className="h-4 w-4 text-violet-300" />
          </div>
          <div>
            <p className="text-[13px] font-semibold tracking-tight text-white sm:text-sm">
              Party Planner
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
            disabled={isTyping || isSending}
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

      {/* Messages */}
      <div className="grid min-h-[50vh] grid-rows-[1fr_auto] sm:min-h-[58vh]">
        <div
          ref={scrollRef}
          className="space-y-3 overflow-y-auto px-4 py-4 sm:space-y-4 sm:px-5"
        >
          {messages.map((message) => {
            if (message.type === "waitlist") {
              return (
                <WaitlistForm
                  key={message.id}
                  disabled={waitlistSubmitted}
                  sessionId={sessionId}
                  onSuccess={handleWaitlistSuccess}
                />
              );
            }

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
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed sm:text-sm",
                    isAssistant
                      ? "rounded-tl-sm border border-white/[0.06] bg-white/[0.04] text-slate-200"
                      : "rounded-tr-sm bg-violet-500 text-white"
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            );
          })}

          {isTyping ? <TypingBubble /> : null}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="border-t border-white/[0.06] px-4 py-3 sm:px-5 sm:py-4"
        >
          <div className="flex items-center gap-2.5">
            <label htmlFor="chat-input" className="sr-only">
              Reply to the AI planner
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
                (waitlistVisible && !waitlistSubmitted)
              }
              className="flex h-11 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-violet-400/30 focus:ring-1 focus:ring-violet-400/20 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={
                !input.trim() ||
                !sessionId ||
                isSending ||
                isTyping ||
                (waitlistVisible && !waitlistSubmitted)
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white transition-colors hover:bg-violet-400 disabled:pointer-events-none disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
