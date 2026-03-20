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

type CategoryStatus = {
  category: string;
  query_count: number;
  result_count: number;
};

type SearchStatus = {
  event_id: string;
  event_status: string;
  categories: CategoryStatus[];
  total_results: number;
};

type SearchResultItem = {
  name: string;
  category: string;
  website: string;
  description: string;
  exa_score: number | null;
};

type SearchRun = {
  id: string;
  category: string;
  query: string;
  created_at: string;
  result_count: number;
  results: SearchResultItem[];
};

type SearchRunsPayload = {
  event_id: string;
  runs: SearchRun[];
};

type CategoryResultsPayload = {
  event_id: string;
  category: string;
  results: SearchResultItem[];
};

export default function SearchDashboardClient() {
  const searchParams = useSearchParams();
  const eventFromUrl = searchParams.get("event") ?? "";

  const [eventId, setEventId] = useState(eventFromUrl);
  const [status, setStatus] = useState<SearchStatus | null>(null);
  const [runs, setRuns] = useState<SearchRun[]>([]);
  const [mergedCategory, setMergedCategory] = useState<SearchResultItem[]>(
    []
  );
  const [mergedCategoryName, setMergedCategoryName] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);

  const loadForEventId = useCallback(async (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      setError("Enter an event UUID.");
      return;
    }
    setLoading(true);
    setError(null);
    setTriggerMsg(null);
    setMergedCategory([]);
    setMergedCategoryName(null);

    try {
      const [statusRes, runsRes] = await Promise.all([
        fetch(`/api/search/${trimmed}`),
        fetch(`/api/search/${trimmed}/runs`),
      ]);

      const statusJson = await statusRes.json();
      if (!statusRes.ok) {
        setStatus(null);
        setRuns([]);
        setError(statusJson.error ?? "Failed to load search status.");
        return;
      }
      setStatus(statusJson as SearchStatus);

      const runsJson = await runsRes.json();
      if (!runsRes.ok) {
        setRuns([]);
        setError(runsJson.error ?? "Failed to load search runs.");
        return;
      }
      setRuns((runsJson as SearchRunsPayload).runs ?? []);
    } catch {
      setError("Network error — is the Next app running?");
      setStatus(null);
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = eventFromUrl.trim();
    if (!q) return;
    setEventId(q);
    void loadForEventId(q);
  }, [eventFromUrl, loadForEventId]);

  const loadData = useCallback(() => {
    void loadForEventId(eventId);
  }, [eventId, loadForEventId]);

  async function loadMergedCategory(category: string) {
    const id = eventId.trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/search/${id}/${encodeURIComponent(category)}`
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not load category results.");
        setMergedCategory([]);
        setMergedCategoryName(null);
        return;
      }
      const data = json as CategoryResultsPayload;
      setMergedCategory(data.results ?? []);
      setMergedCategoryName(data.category);
    } catch {
      setError("Could not load merged category view.");
    } finally {
      setLoading(false);
    }
  }

  async function triggerSearch() {
    const id = eventId.trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    setTriggerMsg(null);
    try {
      const res = await fetch(`/api/search/${id}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Trigger failed.");
        return;
      }
      setTriggerMsg(
        `Dispatched ${json.dispatched ?? 0} task(s). ${json.message ?? ""}`
      );
      await loadForEventId(eventId.trim());
    } catch {
      setError("Could not trigger search.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Exa search dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Inspect stored queries and hits per event (via backend{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                /api/search
              </code>
              ).
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-sm">
            {eventId.trim() ? (
              <Link
                href={`/pipeline?event=${encodeURIComponent(eventId.trim())}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                Vendor pipeline →
              </Link>
            ) : null}
            <Link
              href="/"
              className="text-muted-foreground underline-offset-4 hover:underline"
            >
              ← Home
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Event</CardTitle>
            <CardDescription>
              Paste a Postgres event UUID. Optional:{" "}
              <code className="text-xs">?event=…</code> in the URL.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="font-mono text-sm sm:max-w-xl"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void loadData()} disabled={loading}>
                {loading ? "Loading…" : "Load / refresh"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void triggerSearch()}
                disabled={loading || !eventId.trim()}
              >
                Trigger search pipeline
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {triggerMsg && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary-foreground">
            {triggerMsg}
          </div>
        )}

        {status && (
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>
                Event status:{" "}
                <span className="font-medium text-foreground">
                  {status.event_status}
                </span>
                {" · "}
                Total Exa hits (all rows):{" "}
                <span className="font-medium text-foreground">
                  {status.total_results}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {status.categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No vendor_searches rows yet for this event.
                </p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {status.categories.map((c) => (
                    <li
                      key={c.category}
                      className="flex flex-col gap-2 rounded-xl border border-white/10 bg-secondary/30 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium capitalize">
                          {c.category}
                        </span>
                        <span className="text-muted-foreground">
                          {c.query_count} queries · {c.result_count} results
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="shrink-0 self-start sm:self-center"
                        onClick={() => void loadMergedCategory(c.category)}
                        disabled={loading}
                      >
                        Merged view
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {mergedCategoryName !== null && (
          <Card>
            <CardHeader>
              <CardTitle>Merged results — {mergedCategoryName}</CardTitle>
              <CardDescription>
                Deduplicated by URL across all runs in this category (
                {mergedCategory.length} vendors).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mergedCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hits.</p>
              ) : (
                mergedCategory.map((item, i) => (
                  <ResultRow key={`${item.website}-${i}`} item={item} />
                ))
              )}
            </CardContent>
          </Card>
        )}

        {runs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Search runs (raw)</CardTitle>
              <CardDescription>
                Each row is one Exa query stored in{" "}
                <code className="text-xs">vendor_searches</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="rounded-2xl border border-white/10 bg-card/50 p-4"
                >
                  <div className="mb-3 flex flex-wrap items-baseline gap-2 border-b border-white/10 pb-3">
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium capitalize text-primary-foreground">
                      {run.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {run.created_at || "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · {run.result_count} hit(s)
                    </span>
                  </div>
                  <p className="mb-4 font-mono text-sm leading-relaxed text-foreground">
                    {run.query}
                  </p>
                  {run.results.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No structured results in this row.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {run.results.map((item, i) => (
                        <ResultRow key={`${run.id}-${i}`} item={item} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {status && runs.length === 0 && !loading && (
          <p className="text-center text-sm text-muted-foreground">
            Loaded event but no search runs yet. Trigger the pipeline or wait
            for Celery.
          </p>
        )}
      </div>
    </div>
  );
}

function ResultRow({ item }: { item: SearchResultItem }) {
  return (
    <div className="rounded-xl border border-white/5 bg-background/40 p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{item.name || "(no name)"}</p>
          {item.website ? (
            <a
              href={item.website}
              target="_blank"
              rel="noreferrer"
              className="break-all text-xs text-primary underline-offset-2 hover:underline"
            >
              {item.website}
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">No URL</span>
          )}
        </div>
        {item.exa_score != null && (
          <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            exa_score: {Number(item.exa_score).toFixed(4)}
          </span>
        )}
      </div>
      {item.description ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {item.description}
        </p>
      ) : null}
    </div>
  );
}
