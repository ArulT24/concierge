"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Gift,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  PartyPopper,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import {
  CATEGORY_COPY,
  CCO_SCENARIOS,
  type CcoScenario,
  type CultureCategory,
} from "./cco-scenarios";

const CATEGORY_ORDER: CultureCategory[] = [
  "milestone",
  "offsite",
  "in_office",
  "large_event",
];

const CATEGORY_ICON: Record<CultureCategory, LucideIcon> = {
  milestone: Gift,
  offsite: MapPin,
  in_office: Building2,
  large_event: PartyPopper,
};

function dashboardStateStyles(state: CcoScenario["dashboardAfter"][0]["state"]) {
  switch (state) {
    case "done":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "in_progress":
      return "border-violet-200 bg-violet-50 text-violet-800";
    case "queued":
      return "border-sky-200 bg-sky-50 text-sky-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

/** Generic follow-up when the user types a custom message (still demo-only). */
const CUSTOM_FALLBACK: Pick<CcoScenario, "agentReply" | "agentActions" | "dashboardAfter"> = {
  agentReply:
    "I parsed your message, matched it to the closest culture playbook (milestone, offsite, in-office, or large event), and drafted the next actions. In production I would confirm details in chat, then execute: schedule, vendor touches, calendar, and dashboard updates—without you chasing threads.",
  agentActions: [
    "Classify intent and map to internal culture templates.",
    "Pull relevant constraints: budget, headcount, city, timing, tone.",
    "Draft execution package: owners, deadlines, comms, and risk notes.",
    "Write dashboard rows so your team sees status in one place.",
    "Optional: send SMS or Slack summaries depending on your policy.",
  ],
  dashboardAfter: [
    {
      id: "cf1",
      label: "New request",
      detail: "Parsed · Routed to playbook",
      state: "in_progress",
    },
    {
      id: "cf2",
      label: "Next step",
      detail: "Confirm 2 details in chat",
      state: "queued",
    },
    {
      id: "cf3",
      label: "Automation",
      detail: "Ready to execute on approve",
      state: "queued",
    },
  ],
};

export function ChiefCultureDemo() {
  const [activeId, setActiveId] = useState<string>(CCO_SCENARIOS[0].id);
  const [customNote, setCustomNote] = useState("");
  const [customThread, setCustomThread] = useState<
    { role: "user" | "agent"; text: string }[]
  >([]);

  const activeScenario = useMemo(
    () => CCO_SCENARIOS.find((s) => s.id === activeId) ?? CCO_SCENARIOS[0],
    [activeId]
  );

  const scenariosByCategory = useMemo(() => {
    const map = new Map<CultureCategory, CcoScenario[]>();
    for (const cat of CATEGORY_ORDER) {
      map.set(
        cat,
        CCO_SCENARIOS.filter((s) => s.category === cat)
      );
    }
    return map;
  }, []);

  function resetDemo() {
    setActiveId(CCO_SCENARIOS[0].id);
    setCustomNote("");
    setCustomThread([]);
  }

  function sendCustomMessage() {
    const trimmed = customNote.trim();
    if (!trimmed) return;
    setCustomThread((prev) => [
      ...prev,
      { role: "user", text: trimmed },
      { role: "agent", text: CUSTOM_FALLBACK.agentReply },
    ]);
    setCustomNote("");
  }

  const showCustomDashboard = customThread.length > 0;
  const displayActions = showCustomDashboard
    ? CUSTOM_FALLBACK.agentActions
    : activeScenario.agentActions;
  const displayDashboard = showCustomDashboard
    ? CUSTOM_FALLBACK.dashboardAfter
    : activeScenario.dashboardAfter;

  return (
    <div className="cco-demo-light min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        {/* Hero */}
        <header className="liquid-glass cco-reveal mb-10 rounded-[2rem] p-8 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <Badge
                variant="outline"
                className="border-slate-200 bg-white/90 text-slate-700 shadow-sm"
              >
                Agent employee · Culture operations
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Chief Culture Officer
              </h1>
              <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
                Your always-on agent for startup culture: it plans and executes employee milestones,
                team offsites, in-office games, and larger brand moments—then reports everything in a
                dashboard and in chat so nothing slips through the cracks.
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 shadow-sm">
                  Small &amp; growing teams
                </span>
                <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 shadow-sm">
                  Dashboard + chat
                </span>
                <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 shadow-sm">
                  Executes + communicates
                </span>
              </div>
            </div>
            <div className="liquid-glass-subtle flex shrink-0 flex-col gap-3 rounded-2xl p-5 lg:max-w-xs">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Video demo tip
              </p>
              <p className="text-sm leading-snug text-slate-700">
                Pick a scenario below, then walk through{" "}
                <span className="font-medium text-slate-900">chat → agent actions → dashboard</span>.
                Use the custom message box to show freeform routing.
              </p>
              <Button variant="outline" size="sm" className="w-full border-slate-200 bg-white shadow-sm" asChild>
                <Link href="/">Exit demo</Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Capability pillars */}
        <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_ORDER.map((cat, i) => {
            const Icon = CATEGORY_ICON[cat];
            const copy = CATEGORY_COPY[cat];
            return (
              <Card
                key={cat}
                className="liquid-glass-subtle cco-reveal border-0 shadow-sm"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                      <Icon className="size-4" />
                    </div>
                    <CardTitle className="text-base text-slate-900">{copy.headline}</CardTitle>
                  </div>
                  <CardDescription className="text-xs leading-relaxed text-slate-600">
                    {copy.examples}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </section>

        {/* Scenario picker */}
        <section className="mb-8">
          <Tabs
            value={activeScenario.category}
            onValueChange={(value) => {
              const cat = value as CultureCategory;
              const first = CCO_SCENARIOS.find((s) => s.category === cat);
              if (first) {
                setActiveId(first.id);
                setCustomThread([]);
              }
            }}
            className="w-full"
          >
            <TabsList className="liquid-glass-subtle mb-4 h-auto w-full flex-wrap justify-start gap-1 border border-slate-200/80 bg-slate-100/60 p-1 shadow-sm">
              <TabsTrigger
                value="milestone"
                className="rounded-xl text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                Milestones
              </TabsTrigger>
              <TabsTrigger
                value="offsite"
                className="rounded-xl text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                Offsites
              </TabsTrigger>
              <TabsTrigger
                value="in_office"
                className="rounded-xl text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                In-office
              </TabsTrigger>
              <TabsTrigger
                value="large_event"
                className="rounded-xl text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                Large events
              </TabsTrigger>
            </TabsList>

            {CATEGORY_ORDER.map((cat) => (
              <TabsContent key={cat} value={cat} className="mt-0">
                <div className="flex flex-wrap gap-2">
                  {(scenariosByCategory.get(cat) ?? []).map((s) => (
                    <Button
                      key={s.id}
                      variant={activeId === s.id ? "default" : "outline"}
                      size="sm"
                      className="rounded-full border-slate-200 bg-white shadow-sm"
                      onClick={() => {
                        setActiveId(s.id);
                        setCustomThread([]);
                      }}
                    >
                      {s.shortLabel}: {s.title}
                    </Button>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </section>

        {/* Main: chat + agent breakdown + dashboard */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Chat column */}
          <Card className="liquid-glass overflow-hidden border-0 shadow-md">
            <CardHeader className="border-b border-slate-200/80 pb-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-5 text-violet-600" />
                  <div>
                    <CardTitle className="text-lg text-slate-900">Chat</CardTitle>
                    <CardDescription className="text-slate-600">
                      What you ask · what the Chief Culture Officer answers
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetDemo}
                  className="shrink-0 gap-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  <RotateCcw className="size-3.5" />
                  Reset
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {!showCustomDashboard ? (
                <>
                  <div className="flex justify-end">
                    <div className="max-w-[92%] rounded-2xl rounded-br-md bg-violet-600 px-4 py-3 text-sm leading-relaxed text-white shadow-md">
                      {activeScenario.userMessage}
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="liquid-glass-subtle max-w-[92%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed text-slate-700">
                      <p className="mb-2 flex items-center gap-2 text-xs font-medium text-violet-700">
                        <Sparkles className="size-3.5" />
                        Chief Culture Officer
                      </p>
                      {activeScenario.agentReply}
                    </div>
                  </div>
                </>
              ) : (
                <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
                  {customThread.map((m, idx) => (
                    <div
                      key={`${idx}-${m.role}`}
                      className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                    >
                      <div
                        className={
                          m.role === "user"
                            ? "max-w-[92%] rounded-2xl rounded-br-md bg-violet-600 px-4 py-3 text-sm leading-relaxed text-white shadow-md"
                            : "liquid-glass-subtle max-w-[92%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed text-slate-700"
                        }
                      >
                        {m.role === "agent" ? (
                          <>
                            <p className="mb-2 flex items-center gap-2 text-xs font-medium text-violet-700">
                              <Sparkles className="size-3.5" />
                              Chief Culture Officer
                            </p>
                            {m.text}
                          </>
                        ) : (
                          m.text
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-200/80 pt-4">
                <p className="mb-2 text-xs font-medium text-slate-500">
                  Try your own message (routes through the same agent loop)
                </p>
                <Textarea
                  placeholder="e.g. Book a comedy night for the sales team in Austin next quarter, keep it under $5k all-in..."
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendCustomMessage();
                    }
                  }}
                />
                <div className="mt-2 flex justify-end">
                  <Button type="button" onClick={sendCustomMessage} className="gap-2">
                    <Send className="size-4" />
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agent + Dashboard column */}
          <div className="flex flex-col gap-6">
            <Card className="liquid-glass border-0 shadow-md">
              <CardHeader className="border-b border-slate-200/80 pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-violet-600" />
                  <div>
                    <CardTitle className="text-lg text-slate-900">What the agent does</CardTitle>
                    <CardDescription className="text-slate-600">
                      After this chat, automation runs end-to-end (demo copy).
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  {displayActions.map((line, i) => (
                    <li
                      key={i}
                      className="flex gap-3 text-sm leading-snug text-slate-600"
                    >
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                        {i + 1}
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="liquid-glass border-0 shadow-md">
              <CardHeader className="border-b border-slate-200/80 pb-4">
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="size-5 text-violet-600" />
                  <div>
                    <CardTitle className="text-lg text-slate-900">Culture dashboard</CardTitle>
                    <CardDescription className="text-slate-600">
                      Live status your team sees—same source as chat updates.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                {displayDashboard.map((row) => (
                  <div
                    key={row.id}
                    className="liquid-glass-subtle flex items-start justify-between gap-3 rounded-2xl p-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{row.label}</p>
                      {row.detail ? (
                        <p className="mt-0.5 text-xs text-slate-600">{row.detail}</p>
                      ) : null}
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 border ${dashboardStateStyles(row.state)}`}
                    >
                      {row.state.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer story */}
        <footer className="mt-12 text-center text-xs text-slate-500">
          Chief Culture Officer is an agent employee: it executes culture programs, coordinates vendors
          and calendars, and keeps leadership aligned—without adding headcount.
        </footer>
      </div>
    </div>
  );
}
