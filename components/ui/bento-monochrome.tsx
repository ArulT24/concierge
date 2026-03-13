"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Aperture,
  Lock,
} from "lucide-react";

type ThemeMode = "light" | "dark";

type FeatureItem = {
  title: string;
  blurb: string;
  meta: string;
  icon: typeof Aperture;
  animation: string;
  locked?: boolean;
};

type BentoItemProps = {
  feature: FeatureItem;
  span?: string;
  theme?: ThemeMode;
  index?: number;
  isVisible?: boolean;
};

const getRootTheme = (): ThemeMode => {
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    if (root.classList.contains("dark")) return "dark";
    if (root.getAttribute("data-theme") === "dark" || root.dataset?.theme === "dark") {
      return "dark";
    }
    if (root.classList.contains("light")) return "light";
  }

  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return "light";
};

type PartyRequirements = {
  child_name?: string;
  child_age?: number;
  event_date?: string;
  event_time?: string;
  guest_count?: number;
  zip_code?: string;
  theme?: string;
  venue_preferences?: string;
  food_preferences?: string;
  snack_preferences?: string;
  decoration_preferences?: string;
  entertainment_preferences?: string;
  dietary_restrictions?: string[];
  budget_low?: number;
  budget_high?: number;
  notes?: string;
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  try {
    const clean = timeStr.replace("Z", "").replace("z", "");
    const [hours, minutes] = clean.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    const h = hours % 12 || 12;
    return `${h}:${String(minutes).padStart(2, "0")} ${ampm}`;
  } catch {
    return timeStr;
  }
}

function formatBudget(low?: number, high?: number): string {
  if (low && high) return `$${low} to $${high}`;
  if (low) return `around $${low}`;
  if (high) return `up to $${high}`;
  return "";
}

function buildPartySummary(req: PartyRequirements): string {
  const sentences: string[] = [];

  const nameAge = req.child_name && req.child_age
    ? `${req.child_name} is turning ${req.child_age}`
    : req.child_name
      ? `A birthday party for ${req.child_name}`
      : req.child_age
        ? `A birthday party for a ${req.child_age}-year-old`
        : "A birthday party";

  const themePart = req.theme ? ` with a ${req.theme} theme` : "";
  sentences.push(`${nameAge}${themePart}!`);

  const when: string[] = [];
  if (req.event_date) when.push(formatDate(req.event_date));
  if (req.event_time) when.push(`at ${formatTime(req.event_time)}`);
  if (req.zip_code) when.push(`near ${req.zip_code}`);
  if (when.length > 0) {
    sentences.push(`The party is planned for ${when.join(" ")}.`);
  }

  if (req.guest_count) {
    sentences.push(`We're expecting around ${req.guest_count} guests.`);
  }

  if (req.venue_preferences) {
    sentences.push(`Venue preference: ${req.venue_preferences}.`);
  }

  if (req.food_preferences) {
    const snackPart = req.snack_preferences ? `, plus ${req.snack_preferences}` : "";
    sentences.push(`For food, ${req.food_preferences}${snackPart}.`);
  } else if (req.snack_preferences) {
    sentences.push(`Snacks will include ${req.snack_preferences}.`);
  }

  if (req.entertainment_preferences && req.entertainment_preferences.toLowerCase() !== "none") {
    sentences.push(`Entertainment includes ${req.entertainment_preferences}.`);
  }

  if (req.decoration_preferences && req.decoration_preferences.toLowerCase() !== "none") {
    sentences.push(`Decorations: ${req.decoration_preferences}.`);
  }

  if (req.dietary_restrictions && req.dietary_restrictions.length > 0 && req.dietary_restrictions[0].toLowerCase() !== "none") {
    sentences.push(`Dietary considerations: ${req.dietary_restrictions.join(", ")}.`);
  }

  const budget = formatBudget(req.budget_low, req.budget_high);
  if (budget) {
    sentences.push(`Budget is ${budget}.`);
  }

  if (req.notes && req.notes.toLowerCase() !== "none") {
    sentences.push(req.notes);
  }

  return sentences.join(" ");
}

function FeaturesSectionMinimal({ sessionId }: { sessionId?: string | null }) {
  const [theme, setTheme] = useState<ThemeMode>(() => getRootTheme());
  const [sectionVisible, setSectionVisible] = useState(false);
  const [partyInfo, setPartyInfo] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = "bento2-animations";
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = `
      @keyframes bento2-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6%); }
      }
      @keyframes bento2-pulse {
        0%, 100% { transform: scale(1); opacity: 0.85; }
        50% { transform: scale(1.08); opacity: 1; }
      }
      @keyframes bento2-tilt {
        0% { transform: rotate(-2deg); }
        50% { transform: rotate(2deg); }
        100% { transform: rotate(-2deg); }
      }
      @keyframes bento2-drift {
        0%, 100% { transform: translate3d(0, 0, 0); }
        50% { transform: translate3d(6%, -6%, 0); }
      }
      @keyframes bento2-glow {
        0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 0 rgba(0,0,0,0.4)); }
        50% { opacity: 1; filter: drop-shadow(0 0 6px rgba(0,0,0,0.2)); }
      }
      @keyframes bento2-intro {
        0% { opacity: 0; transform: translate3d(0, 28px, 0); }
        100% { opacity: 1; transform: translate3d(0, 0, 0); }
      }
      @keyframes bento2-card {
        0% { opacity: 0; transform: translate3d(0, 18px, 0) scale(0.96); }
        100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
      }
    `;

    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    const syncTheme = () => {
      const next = getRootTheme();
      setTheme((prev) => (prev === next ? prev : next));
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class", "data-theme"] });

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "bento-theme") syncTheme();
    };

    const media =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;

    const handleMediaChange = () => syncTheme();

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
    }
    media?.addEventListener("change", handleMediaChange);

    return () => {
      observer.disconnect();
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorage);
      }
      media?.removeEventListener("change", handleMediaChange);
    };
  }, []);

  useEffect(() => {
    if (!sectionRef.current || typeof window === "undefined") return;

    const node = sectionRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setSectionVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.25 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function fetchPartyDetails() {
      try {
        const response = await fetch(`/api/events/${sessionId}`);
        const data = await response.json();
        if (!cancelled && response.ok && data.requirements) {
          setPartyInfo(buildPartySummary(data.requirements));
        }
      } catch {
        // Silently fall back to default text
      }
    }

    void fetchPartyDetails();
    return () => { cancelled = true; };
  }, [sessionId]);

  const toggleTheme = () => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const current = getRootTheme();
    const next: ThemeMode = current === "dark" ? "light" : "dark";
    root.classList.toggle("dark", next === "dark");
    root.classList.toggle("light", next === "light");
    root.setAttribute("data-theme", next);
    setTheme(next);

    try {
      window.localStorage?.setItem("bento-theme", next);
    } catch {
      // Ignore localStorage failures in restricted environments.
    }
  };

  const features: FeatureItem[] = [
    {
      title: "Party Information",
      blurb:
        partyInfo ?? "Loading your party details...",
      meta: "Overview",
      icon: Aperture,
      animation: "bento2-float 6s ease-in-out infinite",
    },
    {
      title: "Venue",
      blurb: "Calling venues right now!",
      meta: "Locked",
      icon: Lock,
      animation: "bento2-pulse 4s ease-in-out infinite",
      locked: true,
    },
    {
      title: "Entertainment",
      blurb: "Entertainment isn't going to find itself!",
      meta: "Locked",
      icon: Lock,
      animation: "bento2-tilt 5.5s ease-in-out infinite",
      locked: true,
    },
    {
      title: "Catering",
      blurb: "On the phone with chefs!",
      meta: "Locked",
      icon: Lock,
      animation: "bento2-drift 8s ease-in-out infinite",
      locked: true,
    },
    {
      title: "Decorations",
      blurb: "Creating the coolest mood board ever!",
      meta: "Locked",
      icon: Lock,
      animation: "bento2-glow 7s ease-in-out infinite",
      locked: true,
    },
  ];

  const spans = [
    "md:col-span-4 md:row-span-2",
    "md:col-span-2 md:row-span-1",
    "md:col-span-2 md:row-span-1",
    "md:col-span-3 md:row-span-1",
    "md:col-span-3 md:row-span-1",
  ];

  return (
    <div className="relative min-h-screen w-full bg-white text-neutral-900 transition-colors duration-500 dark:bg-black dark:text-white">
      <div className="absolute inset-0 -z-30 overflow-hidden">
        <div
          className="absolute inset-0 [--aurora-base:#ffffff] [--aurora-accent:rgba(148,163,184,0.15)] dark:[--aurora-base:#040404] dark:[--aurora-accent:rgba(59,130,246,0.15)]"
          style={{
            background:
              "radial-gradient(ellipse 55% 100% at 12% 0%, var(--aurora-accent), transparent 65%), radial-gradient(ellipse 40% 80% at 88% 0%, rgba(148,163,184,0.1), transparent 70%), var(--aurora-base)",
          }}
        />
        <div
          className="absolute inset-0 [--grid-color:rgba(17,17,17,0.08)] dark:[--grid-color:rgba(255,255,255,0.06)]"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--grid-color) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-color) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0, 0 0",
            maskImage:
              "repeating-linear-gradient(to right, black 0px, black 3px, transparent 3px, transparent 8px), repeating-linear-gradient(to bottom, black 0px, black 3px, transparent 3px, transparent 8px)",
            WebkitMaskImage:
              "repeating-linear-gradient(to right, black 0px, black 3px, transparent 3px, transparent 8px), repeating-linear-gradient(to bottom, black 0px, black 3px, transparent 3px, transparent 8px)",
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
            opacity: 0.9,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 [--edge-color:rgba(255,255,255,1)] dark:[--edge-color:rgba(0,0,0,1)]"
          style={{
            background:
              "radial-gradient(circle at center, rgba(0,0,0,0) 55%, var(--edge-color) 100%)",
            filter: "blur(40px)",
            opacity: 0.75,
          }}
        />
      </div>

      <section
        ref={sectionRef}
        className={`relative mx-auto max-w-6xl px-6 py-20 motion-safe:opacity-0 ${
          sectionVisible ? "motion-safe:animate-[bento2-intro_0.9s_ease-out_forwards]" : ""
        }`}
      >
        <header className="mb-10 flex flex-col gap-6 border-b border-neutral-900/10 pb-6 transition-colors duration-500 md:flex-row md:items-end md:justify-between dark:border-white/10">
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.35em] text-neutral-500 transition-colors duration-500 dark:text-white/40">
              You have joined the waitlist
            </span>
            <h2 className="text-3xl font-black tracking-tight text-neutral-900 transition-colors duration-500 md:text-5xl dark:text-white">
              Coming soon!
            </h2>
          </div>
          <div className="flex flex-col items-start gap-4 md:items-end">
            <p className="max-w-sm text-sm text-neutral-600 transition-colors duration-500 md:text-base dark:text-white/60">
              We are calling venues, cooking food, and baking cakes right now!
            </p>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full border border-neutral-900/15 px-4 py-1 text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-600 transition-colors duration-500 hover:bg-neutral-900/5 hover:text-neutral-900 dark:border-white/20 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-3 md:auto-rows-[minmax(120px,auto)] md:grid-cols-6">
          {features.map((feature, index) => (
            <BentoItem
              key={feature.title}
              span={spans[index]}
              feature={feature}
              theme={theme}
              index={index}
              isVisible={sectionVisible}
            />
          ))}
        </div>

        <footer className="mt-16 border-t border-neutral-900/10 pt-6 text-xs uppercase tracking-[0.2em] text-neutral-500 transition-colors duration-500 dark:border-white/10 dark:text-white/40">
          Quiet precision for expressive systems.
        </footer>
      </section>
    </div>
  );
}

function BentoItem({
  feature,
  span = "",
  theme = "light",
  index = 0,
  isVisible = false,
}: BentoItemProps) {
  const { icon: Icon, animation, title, blurb, meta, locked } = feature;
  const gradientFill =
    theme === "dark"
      ? "radial-gradient(ellipse 60% 120% at 12% 0%, rgba(59,130,246,0.24), transparent 72%)"
      : "radial-gradient(ellipse 60% 120% at 12% 0%, rgba(148,163,184,0.32), transparent 72%)";
  const animationDelay = `${Math.max(index * 0.12, 0)}s`;

  return (
    <article
      className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-neutral-900/10 bg-white/80 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.04)] transition-transform duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] motion-safe:opacity-0 ${
        isVisible ? "motion-safe:animate-[bento2-card_0.8s_ease-out_forwards]" : ""
      } dark:border-white/10 dark:bg-white/5 dark:shadow-[0_18px_40px_rgba(0,0,0,0.35)] dark:hover:shadow-[0_28px_70px_rgba(0,0,0,0.55)] ${span}`}
      style={{ animationDelay }}
    >
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-white/85 transition-colors duration-500 dark:bg-white/8" />
        <div
          className="absolute inset-0 opacity-70 transition-opacity duration-500 dark:opacity-60"
          style={{ background: gradientFill }}
        />
      </div>
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-900/15 bg-white transition-colors duration-500 dark:border-white/15 dark:bg-white/10">
          <Icon
            className="h-7 w-7 text-neutral-900 transition-colors duration-500 dark:text-white"
            strokeWidth={locked ? 1.75 : 1.5}
            style={{ animation }}
          />
        </div>
        <div className="flex-1">
          <header className="flex items-start gap-3">
            <h3 className="text-base font-semibold uppercase tracking-wide text-neutral-900 transition-colors duration-500 dark:text-white">
              {title}
            </h3>
            {meta ? (
              <span className="ml-auto rounded-full border border-neutral-900/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.3em] text-neutral-500 transition-colors duration-500 dark:border-white/15 dark:text-white/60">
                {meta}
              </span>
            ) : null}
          </header>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600 transition-colors duration-500 dark:text-white/60">
            {blurb}
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div
          className="absolute inset-0 rounded-2xl border border-neutral-900/10 transition-colors duration-500 dark:border-white/10"
          style={{
            maskImage:
              "radial-gradient(220px_220px_at_var(--x,50%)_var(--y,50%), black, transparent)",
            WebkitMaskImage:
              "radial-gradient(220px_220px_at_var(--x,50%)_var(--y,50%), black, transparent)",
          }}
        />
      </div>
    </article>
  );
}

export default FeaturesSectionMinimal;
export { FeaturesSectionMinimal };
