"use client";

import { useState } from "react";
import { CheckCircle2, Copy, Check } from "lucide-react";

import {
  DOUBTFIRE_SOFT_SHADOW as SOFT_SHADOW,
  BertramStaticBg,
  DoubtfireSiteHeader,
} from "./doubtfire-chrome";

const BLUE = "#111827";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Category =
  | "birthday"
  | "vacation"
  | "celebration"
  | "holiday"
  | "other";

type Answers = Record<string, string>;

// ---------------------------------------------------------------------------
// Per-category question definitions
// ---------------------------------------------------------------------------

type QuestionKind = "text" | "options" | "date" | "multi";

interface Question {
  id: string;
  prompt: string;
  kind: QuestionKind;
  placeholder?: string;
  options?: string[];
  optional?: boolean;
}

const HELP_QUESTION: Question = {
  id: "help",
  prompt: "What do you need most help with?",
  kind: "multi",
  options: [
    "Finding a venue",
    "Catering & food",
    "Entertainment",
    "Decorations",
    "Invitations & RSVPs",
    "Budget planning",
    "All of it",
  ],
};

const QUESTIONS: Record<Category, Question[]> = {
  birthday: [
    {
      id: "name",
      prompt: "Whose birthday is it?",
      kind: "text",
      placeholder: "Their name",
    },
    {
      id: "relationship",
      prompt: "What's your relationship to them?",
      kind: "options",
      options: ["Myself", "My child", "Partner", "Parent", "Friend"],
    },
    {
      id: "age",
      prompt: "How old are they turning?",
      kind: "text",
      placeholder: "e.g. 7, 30, 50…",
    },
    {
      id: "when",
      prompt: "When is the party?",
      kind: "date",
      placeholder: "Not sure yet",
    },
    {
      id: "location",
      prompt: "Where is the party?",
      kind: "text",
      placeholder: "City, venue, or address",
    },
    {
      id: "guests",
      prompt: "How many guests?",
      kind: "options",
      options: ["Under 10", "10–25", "25–50", "50+"],
    },
    HELP_QUESTION,
  ],
  vacation: [
    {
      id: "destination",
      prompt: "Where are you headed?",
      kind: "text",
      placeholder: "Destination — or 'help me decide'",
    },
    {
      id: "when",
      prompt: "When are you going?",
      kind: "date",
      placeholder: "Flexible",
    },
    {
      id: "who",
      prompt: "Who's coming?",
      kind: "options",
      options: ["Just me", "Couple", "Family with kids", "Group of friends"],
    },
    {
      id: "occasion",
      prompt: "Is this trip for a special occasion?",
      kind: "options",
      options: [
        "Just for fun",
        "Birthday trip",
        "Bachelorette or bachelor",
        "Honeymoon",
        "Other",
      ],
    },
    {
      id: "budget",
      prompt: "What's your rough budget?",
      kind: "options",
      options: ["Under $1k", "$1–3k", "$3–7k", "$7k+", "Flexible"],
    },
  ],
  celebration: [
    {
      id: "type",
      prompt: "What are you celebrating?",
      kind: "options",
      options: [
        "Anniversary",
        "Graduation",
        "Retirement",
        "Promotion",
        "Baby shower",
        "Other",
      ],
    },
    {
      id: "honoree",
      prompt: "Who is it for?",
      kind: "text",
      placeholder: "Their name",
    },
    {
      id: "when",
      prompt: "When is it?",
      kind: "date",
      placeholder: "Rough timeframe is fine",
    },
    {
      id: "location",
      prompt: "Where?",
      kind: "text",
      placeholder: "City or region",
    },
    {
      id: "style",
      prompt: "What kind of experience?",
      kind: "options",
      options: [
        "Intimate dinner (< 10)",
        "Small party (10–30)",
        "Big bash (30+)",
        "Other",
      ],
    },
    HELP_QUESTION,
  ],
  holiday: [
    {
      id: "holiday",
      prompt: "Which holiday?",
      kind: "text",
      placeholder: "e.g. Christmas, Diwali, Eid, New Year's…",
    },
    {
      id: "when",
      prompt: "When is it?",
      kind: "date",
      placeholder: "Approximate date is fine",
    },
    {
      id: "guests",
      prompt: "How many guests?",
      kind: "options",
      options: ["Under 10", "10–25", "25–50", "50+"],
    },
    HELP_QUESTION,
  ],
  other: [
    {
      id: "description",
      prompt: "Tell us what you're planning",
      kind: "text",
      placeholder: "The more detail the better — Bertram will thank you.",
    },
    HELP_QUESTION,
  ],
};

const CATEGORY_LABELS: Record<Category, string> = {
  birthday: "Birthday party",
  vacation: "Vacation / trip itinerary",
  celebration: "Celebration",
  holiday: "Holiday party or gathering",
  other: "Other",
};

const CATEGORY_SUBTITLES: Record<Category, string> = {
  birthday: "Kids, milestone, or any age",
  vacation: "Trips, itineraries, group travel",
  celebration: "Anniversary, graduation, baby shower…",
  holiday: "Hosting a seasonal get-together",
  other: "Something else entirely",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPlanningInterest(
  category: Category,
  answers: Answers
): string {
  const label = CATEGORY_LABELS[category];
  const parts = Object.values(answers).filter(Boolean);
  if (parts.length === 0) return label;
  return `${label}: ${parts.join(", ")}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function OptionTile({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border px-4 py-3 text-left text-[15px] font-medium leading-snug transition-all"
      style={
        selected
          ? {
              borderColor: BLUE,
              backgroundColor: `${BLUE}12`,
              color: BLUE,
            }
          : {
              borderColor: "#e5e7eb",
              backgroundColor: "#ffffff",
              color: "#111827",
            }
      }
    >
      {label}
    </button>
  );
}

function CategoryTile({
  category,
  selected,
  onClick,
}: {
  category: Category;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border p-4 text-left transition-all"
      style={
        selected
          ? {
              borderColor: BLUE,
              backgroundColor: `${BLUE}0f`,
              boxShadow: `0 0 0 2px ${BLUE}`,
            }
          : {
              borderColor: "#e5e7eb",
              backgroundColor: "#ffffff",
            }
      }
    >
      <div
        className="text-[15px] font-semibold leading-snug"
        style={{ color: selected ? BLUE : "#111827" }}
      >
        {CATEGORY_LABELS[category]}
      </div>
      <div className="mt-0.5 text-[13px] leading-snug text-neutral-500">
        {CATEGORY_SUBTITLES[category]}
      </div>
    </button>
  );
}

function ProgressDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            backgroundColor: i <= current ? BLUE : "#d1d5db",
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type WizardStep =
  | { kind: "category" }
  | { kind: "question"; index: number }
  | { kind: "confirm" };

export function DoubtfireWelcome({
  identifier,
  identifierType = "email",
  alreadyOnWaitlist = false,
  initialReferralCode,
  initialReferralCount = 0,
  referredBy,
  getAuthToken,
}: {
  /** The user's email address (Google) or E.164 phone number (phone OTP). */
  identifier: string;
  identifierType?: "email" | "phone";
  alreadyOnWaitlist?: boolean;
  initialReferralCode?: string;
  initialReferralCount?: number;
  referredBy?: string;
  /** Optional async function that returns the Bearer token for authenticated requests (phone OTP flow). */
  getAuthToken?: () => Promise<string | null>;
}) {
  const [category, setCategory] = useState<Category | null>(null);
  const [step, setStep] = useState<WizardStep>(
    alreadyOnWaitlist ? { kind: "confirm" } : { kind: "category" }
  );
  const [answers, setAnswers] = useState<Answers>({});
  const [pendingText, setPendingText] = useState("");
  const [pendingMultiSelected, setPendingMultiSelected] = useState<Set<string>>(new Set());
  const [pendingCustomItems, setPendingCustomItems] = useState<string[]>([]);
  const [pendingCustomInput, setPendingCustomInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string>(initialReferralCode ?? "");
  const [referralCount, setReferralCount] = useState<number>(initialReferralCount);
  const [copied, setCopied] = useState(false);

  const questions = category ? QUESTIONS[category] : [];

  // Only two steps now: category → confirm (questions are skipped).
  const totalDots = 1;
  const currentDot = step.kind === "category" ? 0 : 0;

  function initPendingForQuestion(q: Question, savedAnswers: Answers) {
    const saved = savedAnswers[q.id] ?? "";
    if (q.kind === "multi") {
      if (!saved) {
        setPendingMultiSelected(new Set());
        setPendingCustomItems([]);
      } else {
        const parts = saved.split(", ").map((s) => s.trim()).filter(Boolean);
        const optionSet = new Set(q.options ?? []);
        const selected = new Set<string>();
        const custom: string[] = [];
        for (const p of parts) {
          if (optionSet.has(p)) selected.add(p);
          else custom.push(p);
        }
        setPendingMultiSelected(selected);
        setPendingCustomItems(custom);
      }
      setPendingCustomInput("");
    } else {
      setPendingText(saved);
    }
  }

  function handleCategorySelect(cat: Category) {
    setCategory(cat);
    setAnswers({});
    setPendingText("");
    setPendingMultiSelected(new Set());
    setPendingCustomItems([]);
    setPendingCustomInput("");
  }

  function handleCategoryNext() {
    if (!category) return;
    const firstQ = QUESTIONS[category][0];
    initPendingForQuestion(firstQ, answers);
    setStep({ kind: "question", index: 0 });
  }

  function advanceFromQuestion(qIndex: number, value: string) {
    if (!category) return;
    const q = questions[qIndex];
    const newAnswers = { ...answers, [q.id]: value };
    setAnswers(newAnswers);

    if (qIndex + 1 < questions.length) {
      const nextQ = questions[qIndex + 1];
      initPendingForQuestion(nextQ, newAnswers);
      setStep({ kind: "question", index: qIndex + 1 });
    } else {
      handleSubmit(newAnswers);
    }
  }

  function goBack(qIndex: number) {
    if (qIndex === 0) {
      setPendingText("");
      setStep({ kind: "category" });
    } else {
      const targetQ = questions[qIndex - 1];
      initPendingForQuestion(targetQ, answers);
      setStep({ kind: "question", index: qIndex - 1 });
    }
  }

  async function handleSubmit(finalAnswers: Answers) {
    if (!category) return;
    setSubmitting(true);
    setSubmitError(null);

    const planning_interest = buildPlanningInterest(category, finalAnswers);

    try {
      const authToken = getAuthToken ? await getAuthToken() : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

      const res = await fetch("/api/landing-waitlist", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...(identifierType === "email"
            ? { email: identifier }
            : { phone_number: identifier }),
          planning_interest,
          event_category: category,
          intake_answers: finalAnswers,
          referred_by: referredBy ?? null,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Something went wrong.");
      }

      const data = (await res.json()) as {
        referral_code?: string;
        referral_count?: number;
      };
      if (data.referral_code) setReferralCode(data.referral_code);
      if (typeof data.referral_count === "number") setReferralCount(data.referral_count);

      setStep({ kind: "confirm" });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function renderCategoryStep() {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold leading-tight text-neutral-900">
            What are you planning?
          </h1>
        </div>

        <div className="flex flex-col gap-2">
          {(
            [
              "birthday",
              "vacation",
              "celebration",
              "holiday",
              "other",
            ] as Category[]
          ).map((cat) => (
            <CategoryTile
              key={cat}
              category={cat}
              selected={category === cat}
              onClick={() => handleCategorySelect(cat)}
            />
          ))}
        </div>

        {submitError && (
          <p className="text-[13px] text-red-600">{submitError}</p>
        )}

        <button
          type="button"
          disabled={!category || submitting}
          onClick={() => void handleSubmit({})}
          className="mt-1 w-full rounded-full py-3 text-sm font-semibold text-white transition-[filter] hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            backgroundColor: BLUE,
            boxShadow: category
              ? "0 8px 28px -8px rgba(27,111,245,0.55)"
              : "none",
          }}
        >
          {submitting ? "Joining…" : "Join Waitlist"}
        </button>
      </div>
    );
  }

  function renderQuestionStep(qIndex: number) {
    if (!category) return null;
    const q = questions[qIndex];
    const currentAnswer = answers[q.id] ?? "";

    const inputValue = pendingText;
    const multiValue = [...pendingMultiSelected, ...pendingCustomItems].join(", ");
    const hasValue =
      q.kind === "options"
        ? !!currentAnswer
        : q.kind === "multi"
          ? pendingMultiSelected.size > 0 || pendingCustomItems.length > 0
          : inputValue.trim().length > 0;

    const isLastQuestion = qIndex + 1 === questions.length;

    function handleNext() {
      if (!hasValue) return;
      if (q.kind === "options") {
        advanceFromQuestion(qIndex, currentAnswer);
      } else if (q.kind === "multi") {
        advanceFromQuestion(qIndex, multiValue);
      } else {
        advanceFromQuestion(qIndex, pendingText.trim());
      }
    }

    function handleAddCustom() {
      const trimmed = pendingCustomInput.trim();
      if (!trimmed) return;
      setPendingCustomItems((prev) => [...prev, trimmed]);
      setPendingCustomInput("");
    }

    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            {CATEGORY_LABELS[category]}
          </p>
          <h2 className="mt-1 text-xl font-bold leading-snug text-neutral-900">
            {q.prompt}
          </h2>
        </div>

        {q.kind === "options" && (
          <div className="flex flex-col gap-2">
            {q.options!.map((opt) => (
              <OptionTile
                key={opt}
                label={opt}
                selected={currentAnswer === opt}
                onClick={() =>
                  setAnswers((prev) => ({ ...prev, [q.id]: opt }))
                }
              />
            ))}
          </div>
        )}

        {q.kind === "multi" && (
          <div className="flex flex-col gap-2">
            {q.options!.map((opt) => {
              const checked = pendingMultiSelected.has(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() =>
                    setPendingMultiSelected((prev) => {
                      const next = new Set(prev);
                      next.has(opt) ? next.delete(opt) : next.add(opt);
                      return next;
                    })
                  }
                  className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] font-medium leading-snug transition-all"
                  style={
                    checked
                      ? { borderColor: BLUE, backgroundColor: `${BLUE}0d`, color: BLUE }
                      : { borderColor: "#e5e7eb", backgroundColor: "#ffffff", color: "#111827" }
                  }
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors"
                    style={
                      checked
                        ? { borderColor: BLUE, backgroundColor: BLUE }
                        : { borderColor: "#d1d5db", backgroundColor: "#ffffff" }
                    }
                  >
                    {checked && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  {opt}
                </button>
              );
            })}

            {/* Custom added items */}
            {pendingCustomItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl border px-4 py-3 text-[15px] font-medium"
                style={{ borderColor: BLUE, backgroundColor: `${BLUE}0d`, color: BLUE }}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2"
                  style={{ borderColor: BLUE, backgroundColor: BLUE }}
                >
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="flex-1">{item}</span>
                <button
                  type="button"
                  onClick={() =>
                    setPendingCustomItems((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="ml-auto text-neutral-400 hover:text-neutral-600"
                >
                  ✕
                </button>
              </div>
            ))}

            {/* Add other input */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={pendingCustomInput}
                onChange={(e) => setPendingCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
                placeholder="Add other…"
                className="flex-1 rounded-xl border border-neutral-200 px-4 py-2.5 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300"
              />
              <button
                type="button"
                onClick={handleAddCustom}
                disabled={!pendingCustomInput.trim()}
                className="rounded-xl border border-neutral-200 px-4 py-2.5 text-[14px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {q.kind === "text" && (
          <textarea
            rows={3}
            className="w-full resize-none rounded-xl border border-neutral-200 px-4 py-3 text-[15px] leading-snug text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300"
            placeholder={q.placeholder ?? ""}
            value={pendingText}
            onChange={(e) => setPendingText(e.target.value)}
          />
        )}

        {q.kind === "date" && (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300"
              placeholder="e.g. December 2026, late spring, not sure yet…"
              value={pendingText}
              onChange={(e) => setPendingText(e.target.value)}
            />
          </div>
        )}

        {submitError && (
          <p className="text-center text-sm text-red-500">{submitError}</p>
        )}

        {/* Back / Next footer */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => goBack(qIndex)}
            className="flex-1 rounded-full border border-neutral-200 py-3 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 active:bg-neutral-100"
          >
            ← Back
          </button>
          <button
            type="button"
            disabled={!hasValue || submitting}
            onClick={handleNext}
            className="flex-1 rounded-full py-3 text-sm font-semibold text-white transition-[filter] hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: BLUE }}
          >
            {submitting
              ? "Saving…"
              : isLastQuestion
                ? "Submit"
                : "Next →"}
          </button>
        </div>
      </div>
    );
  }

  function handleCopyLink() {
    if (!referralCode) return;
    const url = `${window.location.origin}/welcome?ref=${referralCode}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function renderConfirmStep() {
    const spotsLeft = Math.max(0, 3 - referralCount);

    return (
      <div className="flex flex-col items-center gap-5 py-4 text-center">
        <div
          className="flex size-16 items-center justify-center rounded-full"
          style={{ backgroundColor: `${BLUE}15` }}
        >
          <CheckCircle2
            className="size-9"
            style={{ color: BLUE }}
            strokeWidth={2}
          />
        </div>
        <div>
          <h2 className="text-2xl font-bold leading-tight text-neutral-900">
            You&apos;re on the list.
          </h2>
          <p className="mt-2 text-[15px] leading-snug text-neutral-500">
            We&apos;ll reach out when Bertram is ready for you.
          </p>
        </div>

        {referralCode && (
          <div className="w-full rounded-2xl border border-neutral-100 bg-neutral-50 p-4 text-left">
            <p className="text-[13px] font-semibold text-neutral-800">
              Move up the list — refer 3 friends
            </p>
            <p className="mt-0.5 text-[12px] leading-snug text-neutral-500">
              {spotsLeft === 0
                ? "You've referred 3 friends — you're at the top!"
                : `Get early access when ${spotsLeft} more friend${spotsLeft !== 1 ? "s" : ""} sign up.`}
            </p>

            {/* 3-slot progress row */}
            <div className="mt-3 flex gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex h-8 flex-1 items-center justify-center rounded-lg text-[11px] font-semibold transition-colors"
                  style={{
                    backgroundColor: i < referralCount ? BLUE : "#e5e7eb",
                    color: i < referralCount ? "#ffffff" : "#9ca3af",
                  }}
                >
                  {i < referralCount ? "✓" : i + 1}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-2.5 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 active:bg-neutral-100"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-600" strokeWidth={2.5} />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" strokeWidth={2} />
                  Copy invite link
                </>
              )}
            </button>
          </div>
        )}

        <p className="text-[12px] text-neutral-400">{identifier}</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="fixed inset-0 overflow-y-auto overscroll-y-contain"
      style={{ backgroundColor: "#000000" }}
    >
      <BertramStaticBg />
      <DoubtfireSiteHeader />

      <div className="relative z-10 flex min-h-full flex-col items-center justify-center px-4 pb-12 pt-28 sm:px-6 sm:pt-32">
        <div
          className={`w-full max-w-md overflow-hidden rounded-[24px] bg-white p-6 sm:p-7 ${SOFT_SHADOW}`}
        >
          {/* Progress dots — hidden on confirm */}
          {step.kind !== "confirm" && (
            <div className="mb-5">
              <ProgressDots total={totalDots} current={currentDot} />
            </div>
          )}

          {step.kind === "category" && renderCategoryStep()}
          {step.kind === "question" && renderQuestionStep(step.index)}
          {step.kind === "confirm" && renderConfirmStep()}
        </div>
      </div>
    </div>
  );
}
