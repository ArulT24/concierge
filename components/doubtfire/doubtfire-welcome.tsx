"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

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

type QuestionKind = "text" | "options" | "date";

interface Question {
  id: string;
  prompt: string;
  kind: QuestionKind;
  placeholder?: string;
  options?: string[];
  optional?: boolean;
}

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
      kind: "options",
      options: ["Under 10", "Teen", "21", "30s", "40s", "50+", "Other"],
    },
    {
      id: "when",
      prompt: "When is the party?",
      kind: "date",
      placeholder: "Not sure yet",
    },
    {
      id: "location",
      prompt: "Where, and how many guests?",
      kind: "options",
      options: ["Under 10 guests", "10–30 guests", "30+ guests", "Not sure yet"],
    },
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
        "Surprise",
        "Trip away",
      ],
    },
  ],
  holiday: [
    {
      id: "holiday",
      prompt: "Which holiday?",
      kind: "options",
      options: ["Christmas", "Hanukkah", "Thanksgiving", "New Year's", "Other"],
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
    {
      id: "help",
      prompt: "What do you need most help with?",
      kind: "options",
      options: [
        "Menu & food",
        "Décor",
        "Activities",
        "Managing RSVPs",
        "All of it",
      ],
    },
  ],
  other: [
    {
      id: "description",
      prompt: "Tell us what you're planning",
      kind: "text",
      placeholder: "The more detail the better — Bertram will thank you.",
    },
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

export function DoubtfireWelcome({ email }: { email: string }) {
  const [category, setCategory] = useState<Category | null>(null);
  const [step, setStep] = useState<WizardStep>({ kind: "category" });
  const [answers, setAnswers] = useState<Answers>({});
  const [pendingText, setPendingText] = useState("");
  const [pendingDate, setPendingDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const questions = category ? QUESTIONS[category] : [];

  // Total dot count: category step + all questions
  const totalDots = category ? 1 + questions.length : 1;
  const currentDot =
    step.kind === "category"
      ? 0
      : step.kind === "question"
        ? 1 + step.index
        : totalDots - 1;

  function handleCategorySelect(cat: Category) {
    setCategory(cat);
    setAnswers({});
    setPendingText("");
    setPendingDate("");
  }

  function handleCategoryNext() {
    if (!category) return;
    setStep({ kind: "question", index: 0 });
  }

  function advanceFromQuestion(qIndex: number, value: string) {
    if (!category) return;
    const q = questions[qIndex];
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
    setPendingText("");
    setPendingDate("");

    if (qIndex + 1 < questions.length) {
      setStep({ kind: "question", index: qIndex + 1 });
    } else {
      handleSubmit({ ...answers, [q.id]: value });
    }
  }

  async function handleSubmit(finalAnswers: Answers) {
    if (!category) return;
    setSubmitting(true);
    setSubmitError(null);

    const planning_interest = buildPlanningInterest(category, finalAnswers);

    try {
      const res = await fetch("/api/landing-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          planning_interest,
          event_category: category,
          intake_answers: finalAnswers,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Something went wrong.");
      }

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
          <p className="mt-1.5 text-[15px] text-neutral-500">
            Pick the one that fits best — we&apos;ll tailor everything to you.
          </p>
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

        <button
          type="button"
          disabled={!category}
          onClick={handleCategoryNext}
          className="mt-1 w-full rounded-full py-3 text-sm font-semibold text-white transition-[filter] hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            backgroundColor: BLUE,
            boxShadow: category
              ? "0 8px 28px -8px rgba(27,111,245,0.55)"
              : "none",
          }}
        >
          Continue
        </button>
      </div>
    );
  }

  function renderQuestionStep(qIndex: number) {
    if (!category) return null;
    const q = questions[qIndex];
    const currentAnswer = answers[q.id] ?? "";

    const inputValue = q.kind === "date" ? pendingDate : pendingText;
    const hasValue =
      q.kind === "options" ? !!currentAnswer : inputValue.trim().length > 0;

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
                onClick={() => advanceFromQuestion(qIndex, opt)}
              />
            ))}
          </div>
        )}

        {q.kind === "text" && (
          <textarea
            rows={3}
            className="w-full resize-none rounded-xl border border-neutral-200 px-4 py-3 text-[15px] leading-snug text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder={q.placeholder ?? ""}
            value={pendingText}
            onChange={(e) => setPendingText(e.target.value)}
          />
        )}

        {q.kind === "date" && (
          <div className="flex flex-col gap-2">
            <input
              type="date"
              className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-[15px] text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={pendingDate}
              onChange={(e) => setPendingDate(e.target.value)}
            />
            <button
              type="button"
              className="text-center text-sm text-neutral-400 underline underline-offset-2 hover:text-neutral-600"
              onClick={() => advanceFromQuestion(qIndex, q.placeholder ?? "Not sure yet")}
            >
              {q.placeholder ?? "Not sure yet"}
            </button>
          </div>
        )}

        {q.kind === "text" && (
          <button
            type="button"
            disabled={!hasValue || submitting}
            onClick={() => advanceFromQuestion(qIndex, inputValue.trim())}
            className="w-full rounded-full py-3 text-sm font-semibold text-white transition-[filter] hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              backgroundColor: BLUE,
              boxShadow: hasValue
                ? "0 8px 28px -8px rgba(27,111,245,0.55)"
                : "none",
            }}
          >
            {submitting ? "Saving…" : "Continue"}
          </button>
        )}

        {q.kind === "date" && pendingDate && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => advanceFromQuestion(qIndex, pendingDate)}
            className="w-full rounded-full py-3 text-sm font-semibold text-white transition-[filter] hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              backgroundColor: BLUE,
              boxShadow: "0 8px 28px -8px rgba(27,111,245,0.55)",
            }}
          >
            {submitting ? "Saving…" : "Continue"}
          </button>
        )}

        {submitError && (
          <p className="text-center text-sm text-red-500">{submitError}</p>
        )}

        {qIndex > 0 && (
          <button
            type="button"
            className="text-center text-sm text-neutral-400 hover:text-neutral-600"
            onClick={() => {
              setPendingText("");
              setPendingDate("");
              setStep({ kind: "question", index: qIndex - 1 });
            }}
          >
            ← Back
          </button>
        )}
      </div>
    );
  }

  function renderConfirmStep() {
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
        <p className="text-[13px] text-neutral-400">{email}</p>
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
