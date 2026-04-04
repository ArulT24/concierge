"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type PipelineSnapshot = {
  event_id: string;
  event_status: string;
  requirements: Record<string, unknown>;
  vendor_search_row_count: number;
  pipeline_needs_finalize: boolean;
  counts_by_stage: Record<string, number>;
  candidates: Array<{
    id: string;
    category: string;
    url: string;
    exa_name: string;
    exa_description: string;
    exa_score: number | null;
    stage: string;
    enrichment: Record<string, unknown>;
    fit_score: number | null;
    fit_rationale: string | null;
    scoring_meta: Record<string, unknown>;
    display_rank: number | null;
    error_message: string | null;
    created_at: string;
  }>;
  ranked_options: Array<{
    category: string;
    options_summary: Array<Record<string, unknown>>;
    created_at: string;
  }>;
};

const STAGE_ORDER = [
  "shortlisted",
  "enriching",
  "enriched",
  "scoring",
  "scored",
  "failed",
];

function stageBadgeClass(stage: string) {
  if (stage === "scored") return "bg-emerald-500/20 text-emerald-200";
  if (stage === "failed") return "bg-red-500/20 text-red-200";
  if (stage === "enriching" || stage === "scoring")
    return "bg-amber-500/20 text-amber-200";
  return "bg-muted text-muted-foreground";
}

export function PipelineClient() {
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("event") ?? "";
  const [eventId, setEventId] = useState(fromUrl);
  const [tab, setTab] = useState<"monitor" | "results">("monitor");
  const [data, setData] = useState<PipelineSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [finalizeMsg, setFinalizeMsg] = useState<string | null>(null);
  const [finalizeLoading, setFinalizeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const id = eventId.trim();
    if (!id) {
      setError("Enter an event UUID.");
      return;
    }
    setLoading(true);
    setError(null);
    setFinalizeMsg(null);
    try {
      const res = await fetch(`/api/pipeline/${id}`);
      const json = await res.json();
      if (!res.ok) {
        setData(null);
        setError(json.error ?? "Load failed.");
        return;
      }
      setData(json as PipelineSnapshot);
    } catch {
      setError("Network error.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  async function queueFinalize() {
    const id = eventId.trim();
    if (!id) return;
    setFinalizeLoading(true);
    setFinalizeMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/pipeline/${id}/finalize`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not queue finalize.");
        return;
      }
      setFinalizeMsg(
        (json as { message?: string }).message ??
          "Queued. Watch Celery / refresh in a few minutes."
      );
      void load();
    } catch {
      setError("Network error queueing finalize.");
    } finally {
      setFinalizeLoading(false);
    }
  }

  useEffect(() => {
    const q = fromUrl.trim();
    if (q) {
      setEventId(q);
    }
  }, [fromUrl]);

  useEffect(() => {
    if (fromUrl.trim()) {
      void load();
    }
  }, [fromUrl, load]);

  const statusHint =
    data &&
    ({
      intake: "Not started",
      planning: "Planning search…",
      researching: "Exa searches running (Celery)",
      enriching: "Browserbase enrichment",
      scoring: "Anthropic fit scoring",
      ready: "Pipeline complete",
      archived: "Archived",
    }[data.event_status] ?? data.event_status);

  const enrichingCount = data
    ? (data.counts_by_stage.enriching ?? 0)
    : 0;
  const browserbaseActive =
    !!data &&
    (data.event_status === "enriching" || enrichingCount > 0);

  useEffect(() => {
    if (!eventId.trim() || !browserbaseActive) return;
    const id = window.setInterval(() => {
      void load();
    }, 6000);
    return () => window.clearInterval(id);
  }, [browserbaseActive, eventId, load]);

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Vendor pipeline
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor Exa → Browserbase → Anthropic scoring. Use{" "}
              <code className="text-xs">?event=UUID</code> in the URL.
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link
              href="/search-dashboard"
              className="text-muted-foreground underline-offset-4 hover:underline"
            >
              Search dashboard
            </Link>
            <Link
              href="/"
              className="text-muted-foreground underline-offset-4 hover:underline"
            >
              Home
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Event</CardTitle>
            <CardDescription>
              Same <code className="text-xs">events.id</code> as search dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="font-mono text-sm"
              placeholder="event uuid"
            />
            <Button onClick={() => void load()} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {finalizeMsg && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary-foreground">
            {finalizeMsg}
          </div>
        )}

        {data && data.pipeline_needs_finalize && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="text-amber-100">
                Exa data exists — pipeline not run yet
              </CardTitle>
              <CardDescription>
                This event has{" "}
                <strong>{data.vendor_search_row_count}</strong> row(s) in{" "}
                <code className="text-xs">vendor_searches</code>, but{" "}
                <code className="text-xs">vendor_candidates</code> is empty.
                Stages stay at 0 until <strong>finalize</strong> runs (Browserbase
                + Anthropic). If searches ran before the chord was added, or finalize
                failed, queue it manually:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => void queueFinalize()}
                disabled={finalizeLoading || loading}
              >
                {finalizeLoading
                  ? "Queueing…"
                  : "Run enrichment & scoring (Celery)"}
              </Button>
            </CardContent>
          </Card>
        )}

        {data && !data.pipeline_needs_finalize && data.vendor_search_row_count > 0 && (
          <p className="text-xs text-muted-foreground">
            Exa rows in DB: {data.vendor_search_row_count} · Candidates:{" "}
            {data.candidates.length}
          </p>
        )}

        {data && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Event status</CardTitle>
                <CardDescription>{statusHint}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/20 px-3 py-1 text-sm font-medium capitalize">
                  {data.event_status}
                </span>
                {data.candidates.length === 0 &&
                  data.event_status === "researching" && (
                    <span className="text-sm text-muted-foreground">
                      Waiting for all 4 Exa categories to finish…
                    </span>
                  )}
              </CardContent>
            </Card>

            {browserbaseActive && (
              <div className="overflow-hidden rounded-2xl border border-violet-500/35 bg-gradient-to-r from-violet-950/40 via-primary/10 to-violet-950/40 px-4 py-4 shadow-lg shadow-violet-900/20">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex shrink-0 items-center gap-3">
                    <div
                      className="size-9 shrink-0 rounded-full border-2 border-primary border-t-transparent animate-spin"
                      aria-hidden
                    />
                    <div className="flex gap-1.5" aria-hidden>
                      <span className="inline-block size-2 rounded-full bg-violet-400/90 animate-[browserbase-dot_1.4s_ease-in-out_infinite]" />
                      <span className="inline-block size-2 rounded-full bg-violet-400/90 animate-[browserbase-dot_1.4s_ease-in-out_0.2s_infinite]" />
                      <span className="inline-block size-2 rounded-full bg-violet-400/90 animate-[browserbase-dot_1.4s_ease-in-out_0.4s_infinite]" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Browserbase is working…
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Opening vendor sites and pulling contact details. This can
                      take several minutes (many URLs × remote browsers). This page
                      refreshes every 6s while enrichment runs.
                    </p>
                    {enrichingCount > 0 && (
                      <p className="mt-1 text-xs text-violet-200/90">
                        {enrichingCount} URL
                        {enrichingCount === 1 ? "" : "s"} currently in{" "}
                        <span className="font-mono">enriching</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-transparent via-primary/70 to-transparent animate-[shimmer_1.8s_linear_infinite]"
                    aria-hidden
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 border-b border-white/10 pb-2">
              <Button
                type="button"
                variant={tab === "monitor" ? "default" : "secondary"}
                size="sm"
                onClick={() => setTab("monitor")}
              >
                Monitor
              </Button>
              <Button
                type="button"
                variant={tab === "results" ? "default" : "secondary"}
                size="sm"
                onClick={() => setTab("results")}
              >
                Ranked results
              </Button>
            </div>

            {tab === "monitor" && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Stages</CardTitle>
                    <CardDescription>
                      Row counts per candidate stage (empty until pipeline runs).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {STAGE_ORDER.map((s) => (
                        <li
                          key={s}
                          className="flex justify-between rounded-lg border border-white/5 px-3 py-2"
                        >
                          <span className="capitalize text-muted-foreground">
                            {s}
                          </span>
                          <span className="font-mono">
                            {data.counts_by_stage[s] ?? 0}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Party requirements</CardTitle>
                    <CardDescription>
                      Baseline used for Anthropic scoring.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="max-h-64 overflow-auto rounded-lg bg-muted/30 p-3 text-xs">
                      {JSON.stringify(data.requirements, null, 2)}
                    </pre>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Candidates ({data.candidates.length})</CardTitle>
                    <CardDescription>
                      One row per shortlisted URL (top 10 / category from Exa).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.candidates.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No candidates yet. Trigger search from search-dashboard;
                        after Exa finishes, the Celery chord runs enrichment +
                        scoring.
                      </p>
                    ) : (
                      data.candidates.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-xl border border-white/10 bg-card/40 p-4 text-sm"
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs capitalize ${stageBadgeClass(c.stage)}`}
                            >
                              {c.stage}
                            </span>
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
                              {c.category}
                            </span>
                            {c.display_rank != null && (
                              <span className="text-xs text-muted-foreground">
                                rank {c.display_rank}
                              </span>
                            )}
                          </div>
                          <p className="font-medium">{c.exa_name || c.url}</p>
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noreferrer"
                            className="break-all text-xs text-primary underline-offset-2 hover:underline"
                          >
                            {c.url}
                          </a>
                          {c.error_message && (
                            <p className="mt-2 text-xs text-red-300">
                              {c.error_message}
                            </p>
                          )}
                          <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                            <span>
                              exa_score:{" "}
                              {c.exa_score != null
                                ? c.exa_score.toFixed(4)
                                : "—"}
                            </span>
                            <span>
                              fit_score:{" "}
                              {c.fit_score != null ? c.fit_score : "—"}
                            </span>
                            <span>
                              phone:{" "}
                              {(c.enrichment.phone as string) || "—"}
                            </span>
                            <span>
                              email:{" "}
                              {(c.enrichment.email as string) || "—"}
                            </span>
                          </div>
                          {c.fit_rationale && (
                            <p className="mt-2 text-xs leading-relaxed text-foreground/90">
                              {c.fit_rationale}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === "results" && (
              <div className="space-y-6">
                {data.ranked_options.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      No ranked options in DB yet. When{" "}
                      <code className="text-xs">event_status</code> is{" "}
                      <code className="text-xs">ready</code>, summaries appear
                      here.
                    </CardContent>
                  </Card>
                ) : (
                  data.ranked_options.map((block) => (
                    <Card key={block.category}>
                      <CardHeader>
                        <CardTitle className="capitalize">
                          {block.category}
                        </CardTitle>
                        <CardDescription>
                          From <code className="text-xs">event_options</code>{" "}
                          (sorted by fit score).
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {(block.options_summary || []).map(
                          (opt: Record<string, unknown>, i: number) => (
                            <div
                              key={`${block.category}-${i}`}
                              className="rounded-xl border border-white/10 bg-card/50 p-4"
                            >
                              <div className="flex flex-wrap items-baseline gap-2">
                                <span className="text-lg font-semibold">
                                  #{String(opt.rank ?? i + 1)}
                                </span>
                                <span>{String(opt.name ?? "")}</span>
                                {opt.fit_score != null && (
                                  <span className="rounded-md bg-primary/20 px-2 py-0.5 text-xs">
                                    fit {String(opt.fit_score)}
                                  </span>
                                )}
                              </div>
                              <a
                                href={String(opt.url ?? "#")}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 block break-all text-xs text-primary underline-offset-2 hover:underline"
                              >
                                {String(opt.url ?? "")}
                              </a>
                              <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                                <span>phone: {String(opt.phone ?? "—")}</span>
                                <span>email: {String(opt.email ?? "—")}</span>
                                <span>address: {String(opt.address ?? "—")}</span>
                              </div>
                              {opt.fit_rationale ? (
                                <p className="mt-2 text-sm leading-relaxed">
                                  {String(opt.fit_rationale)}
                                </p>
                              ) : null}
                            </div>
                          )
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
