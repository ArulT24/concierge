"use client";

import { useState, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────

interface SearchResultItem {
  name: string;
  category: string;
  website: string;
  description: string;
  exa_score: number | null;
}

interface SearchRunDetail {
  id: string;
  category: string;
  query: string;
  created_at: string;
  result_count: number;
  results: SearchResultItem[];
}

interface SearchRunsResponse {
  event_id: string;
  runs: SearchRunDetail[];
}

interface SearchStatusResponse {
  event_id: string;
  event_status: string;
  categories: { category: string; query_count: number; result_count: number }[];
  total_results: number;
}

interface CandidateOut {
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
  display_rank: number | null;
  error_message: string | null;
  created_at: string;
}

interface PipelineSnapshotResponse {
  event_id: string;
  event_status: string;
  requirements: Record<string, unknown>;
  vendor_search_row_count: number;
  pipeline_needs_finalize: boolean;
  counts_by_stage: Record<string, number>;
  candidates: CandidateOut[];
  ranked_options: { category: string; options_summary: unknown[]; created_at: string }[];
}

interface VendorPageData {
  url: string;
  business_name: string;
  phone: string;
  email: string;
  address: string;
  pricing_info: string;
  hours: string;
  description: string;
  photos: string[];
  scrape_success: boolean;
  error: string;
}

// ── Helpers ──────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  venue: "bg-violet-100 text-violet-800 border-violet-200",
  entertainment: "bg-blue-100 text-blue-800 border-blue-200",
  cake: "bg-pink-100 text-pink-800 border-pink-200",
  decoration: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const STAGE_COLORS: Record<string, string> = {
  shortlisted: "bg-yellow-100 text-yellow-800",
  enriched: "bg-blue-100 text-blue-800",
  scored: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
};

function CategoryBadge({ category }: { category: string }) {
  const cls = CATEGORY_COLORS[category] ?? "bg-gray-100 text-gray-800 border-gray-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {category}
    </span>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const cls = STAGE_COLORS[stage] ?? "bg-gray-100 text-gray-800";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {stage}
    </span>
  );
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-xs">—</span>;
  const pct = Math.min(100, Math.round(score * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-violet-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 w-10 text-right">{score.toFixed(3)}</span>
    </div>
  );
}

// ── Exa Runs Panel ────────────────────────────────────────────

function ExaRunsPanel({ runs, status }: { runs: SearchRunsResponse | null; status: SearchStatusResponse | null }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (!runs) return null;

  const grouped: Record<string, SearchRunDetail[]> = {};
  for (const run of runs.runs) {
    (grouped[run.category] ??= []).push(run);
  }

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="space-y-3">
      {status && (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="text-gray-500">
            Status:{" "}
            <span className="font-semibold text-gray-900">{status.event_status}</span>
          </span>
          <span className="text-gray-500">
            Total results:{" "}
            <span className="font-semibold text-gray-900">{status.total_results}</span>
          </span>
          <span className="text-gray-500">
            Search rows:{" "}
            <span className="font-semibold text-gray-900">{runs.runs.length}</span>
          </span>
        </div>
      )}

      {Object.entries(grouped).map(([cat, catRuns]) => (
        <div key={cat} className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
            <CategoryBadge category={cat} />
            <span className="text-xs text-gray-500">{catRuns.length} run{catRuns.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="divide-y divide-gray-100">
            {catRuns.map((run) => {
              const isOpen = expanded.has(run.id);
              return (
                <div key={run.id}>
                  <button
                    onClick={() => toggle(run.id)}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-gray-800 leading-snug break-words">
                          {run.query}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {run.result_count} result{run.result_count !== 1 ? "s" : ""} ·{" "}
                          {run.created_at ? new Date(run.created_at).toLocaleTimeString() : ""}
                        </p>
                      </div>
                      <span className="text-gray-400 text-xs mt-1 shrink-0">
                        {isOpen ? "▲" : "▼"}
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-3 pb-3 space-y-1.5">
                      {run.results.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No results</p>
                      ) : (
                        run.results.map((r, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 p-2 rounded bg-white border border-gray-100"
                          >
                            <span className="text-xs text-gray-400 w-5 shrink-0 text-right pt-0.5">
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <a
                                href={r.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-violet-700 hover:underline truncate block"
                              >
                                {r.name || r.website}
                              </a>
                              <p className="text-xs text-gray-400 truncate">{r.website}</p>
                              {r.description && (
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{r.description}</p>
                              )}
                            </div>
                            <div className="w-28 shrink-0">
                              <ScoreBar score={r.exa_score} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {runs.runs.length === 0 && (
        <p className="text-sm text-gray-400 italic text-center py-6">
          No Exa search runs found for this event.
        </p>
      )}
    </div>
  );
}

// ── Pipeline Candidates Panel ─────────────────────────────────

function PipelinePanel({ snapshot }: { snapshot: PipelineSnapshotResponse | null; onFinalize: () => void; finalizing: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  if (!snapshot) return null;

  const grouped: Record<string, CandidateOut[]> = {};
  for (const c of snapshot.candidates) {
    (grouped[c.category] ??= []).push(c);
  }

  const stageOrder = ["scored", "enriched", "shortlisted", "error"];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(snapshot.counts_by_stage).map(([stage, count]) => (
          <div key={stage} className="flex items-center gap-1">
            <StageBadge stage={stage} />
            <span className="text-gray-500">{count}</span>
          </div>
        ))}
      </div>

      {snapshot.pipeline_needs_finalize && (
        <div className="flex items-center justify-between gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <p className="text-amber-800">
            Exa data exists but no candidates yet. Run finalize to enrich + score.
          </p>
        </div>
      )}

      {Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([cat, candidates]) => (
          <div key={cat} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
              <CategoryBadge category={cat} />
              <span className="text-xs text-gray-500">{candidates.length} candidate{candidates.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {[...candidates]
                .sort((a, b) => {
                  const ai = stageOrder.indexOf(a.stage);
                  const bi = stageOrder.indexOf(b.stage);
                  if (ai !== bi) return ai - bi;
                  return (b.fit_score ?? 0) - (a.fit_score ?? 0);
                })
                .map((c) => {
                  const isOpen = expandedId === c.id;
                  const enrich = c.enrichment as Record<string, string>;
                  const hasContact = enrich?.phone || enrich?.email;

                  return (
                    <div key={c.id}>
                      <button
                        onClick={() => setExpandedId(isOpen ? null : c.id)}
                        className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <StageBadge stage={c.stage} />
                              {c.display_rank !== null && (
                                <span className="text-xs text-gray-400">#{c.display_rank}</span>
                              )}
                              <span className="text-sm font-medium text-gray-800 truncate">
                                {c.exa_name || c.url}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 truncate mt-0.5">{c.url}</p>
                            {hasContact && (
                              <div className="flex gap-3 mt-1">
                                {enrich.phone && (
                                  <span className="text-xs text-green-700 font-medium">📞 {enrich.phone}</span>
                                )}
                                {enrich.email && (
                                  <span className="text-xs text-blue-700 font-medium">✉️ {enrich.email}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="w-28 shrink-0 pt-1">
                            {c.fit_score !== null ? (
                              <>
                                <p className="text-xs text-gray-400 mb-0.5">Fit</p>
                                <ScoreBar score={c.fit_score} />
                              </>
                            ) : (
                              <span className="text-xs text-gray-300">no fit score</span>
                            )}
                          </div>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-3 pb-3 space-y-2 bg-gray-50">
                          {c.fit_rationale && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Fit rationale</p>
                              <p className="text-xs text-gray-700 leading-relaxed">{c.fit_rationale}</p>
                            </div>
                          )}
                          {c.exa_description && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Exa description</p>
                              <p className="text-xs text-gray-600 leading-relaxed">{c.exa_description}</p>
                            </div>
                          )}
                          {Object.keys(enrich).length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Browserbase enrichment</p>
                              <div className="grid grid-cols-2 gap-1">
                                {Object.entries(enrich).map(([k, v]) => (
                                  v ? (
                                    <div key={k}>
                                      <span className="text-xs text-gray-400 capitalize">{k}: </span>
                                      <span className="text-xs text-gray-700 break-words">{String(v).slice(0, 200)}</span>
                                    </div>
                                  ) : null
                                ))}
                              </div>
                            </div>
                          )}
                          {c.error_message && (
                            <p className="text-xs text-red-600 bg-red-50 rounded p-2">{c.error_message}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}

      {snapshot.candidates.length === 0 && (
        <p className="text-sm text-gray-400 italic text-center py-4">
          No pipeline candidates yet.
        </p>
      )}
    </div>
  );
}

// ── Browserbase Panel ─────────────────────────────────────────

function BrowserbasePanel() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VendorPageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scrape = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/scrape-vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Scrape failed");
      } else {
        setResult(data as VendorPageData);
      }
    } catch {
      setError("Network error — is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        Requires <code className="font-mono">APP_DEBUG=true</code> and the FastAPI backend running at{" "}
        <code className="font-mono">localhost:8000</code>.
      </p>

      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && scrape()}
          placeholder="https://vendor-website.com"
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 font-mono"
        />
        <button
          onClick={scrape}
          disabled={loading || !url.trim()}
          className="px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scraping…
            </span>
          ) : (
            "Scrape"
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
            <span
              className={`w-2 h-2 rounded-full ${result.scrape_success ? "bg-green-500" : "bg-red-400"}`}
            />
            <span className="text-sm font-medium text-gray-800">
              {result.business_name || result.url}
            </span>
            <span className="ml-auto text-xs text-gray-400">
              {result.scrape_success ? "Success" : "Partial / failed"}
            </span>
          </div>

          <div className="p-3 space-y-2">
            {result.error && (
              <p className="text-xs text-red-600 bg-red-50 rounded p-2">{result.error}</p>
            )}

            <div className="grid grid-cols-1 gap-2 text-sm">
              {[
                { label: "Phone", value: result.phone, icon: "📞" },
                { label: "Email", value: result.email, icon: "✉️" },
                { label: "Address", value: result.address, icon: "📍" },
                { label: "Hours", value: result.hours, icon: "🕐" },
                { label: "Pricing", value: result.pricing_info, icon: "💰" },
              ].map(({ label, value, icon }) =>
                value ? (
                  <div key={label} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                    <span className="text-base">{icon}</span>
                    <div>
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-sm text-gray-800 font-medium">{value}</p>
                    </div>
                  </div>
                ) : null
              )}
            </div>

            {result.description && (
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Description</p>
                <p className="text-sm text-gray-700 leading-relaxed">{result.description}</p>
              </div>
            )}

            {result.photos.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Photos</p>
                <div className="flex flex-wrap gap-2">
                  {result.photos.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt=""
                      className="w-24 h-16 object-cover rounded border border-gray-200"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                    />
                  ))}
                </div>
              </div>
            )}

            {!result.phone && !result.email && !result.address && !result.description && !result.error && (
              <p className="text-xs text-gray-400 italic text-center py-2">
                No contact data extracted from this page.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function PipelineDebugPage() {
  const [eventId, setEventId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<SearchStatusResponse | null>(null);
  const [runs, setRuns] = useState<SearchRunsResponse | null>(null);
  const [snapshot, setSnapshot] = useState<PipelineSnapshotResponse | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  const [activeTab, setActiveTab] = useState<"exa" | "pipeline">("exa");

  const loadPipeline = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const [statusRes, runsRes, snapRes] = await Promise.all([
        fetch(`/api/search/${id.trim()}`),
        fetch(`/api/search/${id.trim()}/runs`),
        fetch(`/api/pipeline/${id.trim()}`),
      ]);

      const [statusData, runsData, snapData] = await Promise.all([
        statusRes.json(),
        runsRes.json(),
        snapRes.json(),
      ]);

      if (!statusRes.ok) {
        setError(statusData.error ?? `${statusRes.status}: event not found`);
        return;
      }

      setStatus(statusData as SearchStatusResponse);
      setRuns(runsData as SearchRunsResponse);
      setSnapshot(snapRes.ok ? (snapData as PipelineSnapshotResponse) : null);
    } catch {
      setError("Could not reach the backend. Make sure FastAPI is running at localhost:8000.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFinalize = async () => {
    if (!eventId.trim()) return;
    setFinalizing(true);
    try {
      const res = await fetch(`/api/pipeline/${eventId.trim()}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(data.message ?? "Finalize queued. Reload in a minute.");
      } else {
        alert(data.error ?? "Finalize failed.");
      }
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <h1 className="text-base font-semibold text-gray-900 whitespace-nowrap">
            Pipeline Debug
          </h1>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <input
              type="text"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadPipeline(eventId)}
              placeholder="Paste event UUID…"
              className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 font-mono"
            />
            <button
              onClick={() => loadPipeline(eventId)}
              disabled={loading || !eventId.trim()}
              className="px-4 py-1.5 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {loading ? "Loading…" : "Load"}
            </button>
            {snapshot?.pipeline_needs_finalize && (
              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="px-4 py-1.5 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {finalizing ? "Queuing…" : "Run Finalize"}
              </button>
            )}
            {status && (
              <button
                onClick={() => loadPipeline(eventId)}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                title="Refresh"
              >
                ↻
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Exa + Pipeline */}
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 text-sm">
              <button
                onClick={() => setActiveTab("exa")}
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  activeTab === "exa"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Exa Runs
                {runs && (
                  <span className="ml-1.5 text-xs text-gray-400">({runs.runs.length})</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("pipeline")}
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  activeTab === "pipeline"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Pipeline Candidates
                {snapshot && (
                  <span className="ml-1.5 text-xs text-gray-400">({snapshot.candidates.length})</span>
                )}
              </button>
            </div>

            {!status && !loading && (
              <div className="text-center py-16 text-gray-400 text-sm">
                <p className="text-3xl mb-3">🔍</p>
                <p>Enter an event ID above to inspect its search pipeline.</p>
              </div>
            )}

            {loading && (
              <div className="text-center py-16 text-gray-400 text-sm">
                <svg className="animate-spin w-6 h-6 mx-auto mb-3 text-violet-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading pipeline data…
              </div>
            )}

            {activeTab === "exa" && !loading && (
              <ExaRunsPanel runs={runs} status={status} />
            )}

            {activeTab === "pipeline" && !loading && (
              <PipelinePanel
                snapshot={snapshot}
                onFinalize={handleFinalize}
                finalizing={finalizing}
              />
            )}
          </div>

          {/* Right: Browserbase */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">Browserbase Scraper</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                single-URL test
              </span>
            </div>
            <BrowserbasePanel />
          </div>
        </div>
      </div>
    </div>
  );
}
