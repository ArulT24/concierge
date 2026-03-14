"use client";

import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  Music,
  Palette,
  Sparkles,
  Users,
  UtensilsCrossed,
  PartyPopper,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

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
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  try {
    const clean = timeStr.replace(/[Zz]/, "");
    const [hours, minutes] = clean.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    const h = hours % 12 || 12;
    return `${h}:${String(minutes).padStart(2, "0")} ${ampm}`;
  } catch {
    return timeStr;
  }
}

function formatBudget(low?: number, high?: number): string {
  if (low && high) return `$${low} – $${high}`;
  if (low) return `~$${low}`;
  if (high) return `Up to $${high}`;
  return "";
}

type DetailRowProps = {
  icon: React.ElementType;
  label: string;
  value: string;
};

function DetailRow({ icon: Icon, label, value }: DetailRowProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] ring-1 ring-white/10">
        <Icon className="h-4 w-4 text-violet-300" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-sm leading-snug text-slate-100">{value}</p>
      </div>
    </div>
  );
}

type CategoryCardProps = {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  accentFrom: string;
  accentTo: string;
  delay: number;
  visible: boolean;
};

function CategoryCard({
  title,
  subtitle,
  icon: Icon,
  accentFrom,
  accentTo,
  delay,
  visible,
}: CategoryCardProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.05]"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] transition-opacity duration-300 group-hover:opacity-[0.12]"
        style={{
          background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})`,
        }}
      />

      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 -translate-x-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
            animation: "shimmer 2.5s ease-in-out infinite",
            animationDelay: `${delay + 400}ms`,
          }}
        />
      </div>

      <div className="flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-white/10"
          style={{
            background: `linear-gradient(135deg, ${accentFrom}22, ${accentTo}11)`,
          }}
        >
          <Icon className="h-5 w-5 text-white/80" />
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: accentFrom,
              animation: "pulse-dot 2s ease-in-out infinite",
            }}
          />
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
            Searching
          </span>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-[15px] font-semibold tracking-tight text-white">
          {title}
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-400">
          {subtitle}
        </p>
      </div>

      <div className="mt-4 space-y-2">
        <div className="h-2 w-3/4 rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full opacity-60"
            style={{
              width: "40%",
              background: `linear-gradient(90deg, ${accentFrom}, ${accentTo})`,
              animation: "pulse-dot 2s ease-in-out infinite",
            }}
          />
        </div>
        <div className="h-2 w-1/2 rounded-full bg-white/[0.06]" />
      </div>
    </div>
  );
}

function FeaturesSectionMinimal({
  sessionId,
}: {
  sessionId?: string | null;
}) {
  const [visible, setVisible] = useState(false);
  const [party, setParty] = useState<PartyRequirements | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const node = sectionRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
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
          setParty(data.requirements);
        }
      } catch {
        /* fall back to loading state */
      }
    }

    void fetchPartyDetails();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const childName = party?.child_name;
  const headline = childName
    ? `We're planning ${childName}'s party`
    : "We're planning your party";

  const categories: CategoryCardProps[] = [
    {
      title: "Venue",
      subtitle: party?.venue_preferences
        ? `Looking for ${party.venue_preferences} options nearby`
        : "Finding the perfect spot for the celebration",
      icon: MapPin,
      accentFrom: "#3b82f6",
      accentTo: "#6366f1",
      delay: 200,
      visible,
    },
    {
      title: "Entertainment",
      subtitle: party?.entertainment_preferences
        ? `Searching for ${party.entertainment_preferences}`
        : "Discovering fun activities and performers",
      icon: Music,
      accentFrom: "#f59e0b",
      accentTo: "#f97316",
      delay: 320,
      visible,
    },
    {
      title: "Catering",
      subtitle: party?.food_preferences
        ? `Finding ${party.food_preferences} catering options`
        : "Reaching out to caterers and chefs",
      icon: UtensilsCrossed,
      accentFrom: "#f43f5e",
      accentTo: "#e11d48",
      delay: 440,
      visible,
    },
    {
      title: "Decorations",
      subtitle: party?.decoration_preferences
        ? `Curating ${party.decoration_preferences} decor`
        : "Putting together a beautiful mood board",
      icon: Palette,
      accentFrom: "#10b981",
      accentTo: "#059669",
      delay: 560,
      visible,
    },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#08111f] text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(124,58,237,0.18), transparent 70%), radial-gradient(ellipse 40% 40% at 80% 100%, rgba(59,130,246,0.08), transparent 60%)",
          }}
        />
      </div>

      <section
        ref={sectionRef}
        className="relative mx-auto max-w-5xl px-6 py-16 sm:py-24"
      >
        {/* Back link */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to chat
          </Link>
        </div>

        {/* Hero */}
        <header
          className="mt-8 mb-12"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.6s ease 100ms, transform 0.6s ease 100ms",
          }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3.5 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
            <span className="text-xs font-medium text-violet-200">
              Planning in progress
            </span>
          </div>

          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            {headline}
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
            Our AI agents are researching the best venues, food, entertainment,
            and decorations for you. We&apos;ll have options ready soon.
          </p>
        </header>

        {/* Party details card */}
        <div
          className="mb-8"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.6s ease 150ms, transform 0.6s ease 150ms",
          }}
        >
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm">
            <div className="border-b border-white/[0.06] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-400/20">
                  <PartyPopper className="h-4.5 w-4.5 text-violet-300" />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold tracking-tight">
                    Party Details
                  </h2>
                  <p className="text-xs text-slate-500">
                    What you told us so far
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-x-8 gap-y-1 px-6 py-4 sm:grid-cols-2 lg:grid-cols-3">
              {party ? (
                <>
                  {party.child_name && (
                    <DetailRow
                      icon={PartyPopper}
                      label="Birthday kid"
                      value={
                        party.child_age
                          ? `${party.child_name}, turning ${party.child_age}`
                          : party.child_name
                      }
                    />
                  )}
                  {party.event_date && (
                    <DetailRow
                      icon={Calendar}
                      label="Date"
                      value={formatDate(party.event_date)}
                    />
                  )}
                  {party.event_time && (
                    <DetailRow
                      icon={Clock}
                      label="Time"
                      value={formatTime(party.event_time)}
                    />
                  )}
                  {party.guest_count != null && (
                    <DetailRow
                      icon={Users}
                      label="Guests"
                      value={`${party.guest_count} people`}
                    />
                  )}
                  {party.zip_code && (
                    <DetailRow
                      icon={MapPin}
                      label="Location"
                      value={party.zip_code}
                    />
                  )}
                  {party.theme && (
                    <DetailRow
                      icon={Sparkles}
                      label="Theme"
                      value={party.theme}
                    />
                  )}
                  {(party.budget_low != null || party.budget_high != null) && (
                    <DetailRow
                      icon={DollarSign}
                      label="Budget"
                      value={formatBudget(party.budget_low, party.budget_high)}
                    />
                  )}
                </>
              ) : (
                <div className="col-span-full flex items-center gap-3 py-4 text-sm text-slate-500">
                  <span
                    className="h-2 w-2 rounded-full bg-violet-400"
                    style={{ animation: "pulse-dot 1.5s ease-in-out infinite" }}
                  />
                  Loading your party details...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category cards grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {categories.map((cat) => (
            <CategoryCard key={cat.title} {...cat} />
          ))}
        </div>

        {/* Footer */}
        <footer
          className="mt-16 flex items-center justify-between border-t border-white/[0.06] pt-6"
          style={{
            opacity: visible ? 1 : 0,
            transition: "opacity 0.6s ease 700ms",
          }}
        >
          <span className="text-xs tracking-wide text-slate-500">
            Concierge
          </span>
          <Link
            href="/"
            className="text-xs text-slate-500 transition-colors hover:text-white"
          >
            Back to chat
          </Link>
        </footer>
      </section>
    </div>
  );
}

export default FeaturesSectionMinimal;
export { FeaturesSectionMinimal };
