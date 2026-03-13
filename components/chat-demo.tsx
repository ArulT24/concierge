"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Mail, MapPin, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

function TypingBubble() {
  return (
    <div className="message-fade-in flex justify-start">
      <div className="max-w-[85%] rounded-[24px] rounded-tl-md border border-white/10 bg-white/[0.08] px-4 py-3 shadow-lg">
        <div className="flex items-center gap-1.5">
          <span className="typing-dot h-2 w-2 rounded-full bg-slate-200" />
          <span className="typing-dot h-2 w-2 rounded-full bg-slate-200" />
          <span className="typing-dot h-2 w-2 rounded-full bg-slate-200" />
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
      <Card className="w-full max-w-md border-violet-400/20 bg-slate-950/70">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Mail className="h-4 w-4 text-violet-300" />
            Join the waitlist
          </CardTitle>
          <CardDescription>
            Get early access when the full planning assistant launches.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <Input
              type="email"
              placeholder="Parent email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={disabled || isSubmitting}
              required
            />
            <Input
              type="text"
              placeholder="City"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              disabled={disabled || isSubmitting}
              required
            />
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            <Button
              type="submit"
              className="w-full bg-violet-500 text-white hover:bg-violet-400"
              disabled={disabled || isSubmitting}
            >
              {isSubmitting ? "Joining..." : "Join Waitlist"}
            </Button>
          </form>
        </CardContent>
      </Card>
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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const waitlistVisible = messages.some((message) => message.type === "waitlist");

  useEffect(() => {
    let cancelled = false;

    async function tryResumeSession(): Promise<boolean> {
      try {
        const savedId = window.localStorage.getItem("concierge_session_id");
        if (!savedId) return false;

        const response = await fetch(`/api/chat/${savedId}`);
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
      const response = await fetch("/api/chat", {
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
  }, []);

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
      const response = await fetch("/api/chat", {
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
    <Card className="w-full max-w-4xl overflow-hidden border-white/10 bg-slate-950/70">
      <CardHeader className="border-b border-white/10 pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-400">
              <Sparkles className="h-4 w-4 text-violet-300" />
              Product demo
            </div>
            <CardTitle className="text-xl text-white">
              Chat with your AI birthday party planner
            </CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              Answer a few quick questions, tell the planner what you want, and
              join the waitlist without leaving the conversation.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Live demo
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid min-h-[62vh] grid-rows-[1fr_auto]">
          <div
            ref={scrollRef}
            className="space-y-4 overflow-y-auto px-4 py-5 sm:px-6"
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
                      "max-w-[85%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-lg sm:text-[15px]",
                      isAssistant
                        ? "rounded-tl-md border border-white/10 bg-white/[0.08] text-slate-100"
                        : "rounded-tr-md bg-violet-500 text-white"
                    )}
                  >
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/60">
                      {isAssistant ? (
                        <>
                          <Bot className="h-3.5 w-3.5" />
                          Planner AI
                        </>
                      ) : (
                        "You"
                      )}
                    </div>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              );
            })}

            {isTyping ? <TypingBubble /> : null}
          </div>

          <form
            onSubmit={handleSend}
            className="border-t border-white/10 bg-slate-950/60 p-4 sm:p-5"
          >
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label htmlFor="chat-input" className="sr-only">
                  Reply to the AI planner
                </label>
                <Input
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
                  className="h-12 rounded-full bg-white/[0.06]"
                />
              </div>
              <Button
                type="submit"
                size="icon"
                disabled={
                  !input.trim() ||
                  !sessionId ||
                  isSending ||
                  isTyping ||
                  (waitlistVisible && !waitlistSubmitted)
                }
                className="h-12 w-12 rounded-full bg-violet-500 text-white hover:bg-violet-400"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Personalized planning intake
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Waitlist form appears in chat
              </span>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
