"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ScrapeResult = {
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
};

export default function ScrapeTestPage() {
  const [url, setUrl] = useState("https://");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  async function runScrape() {
    setLoading(true);
    setRequestError(null);
    setResult(null);
    try {
      const res = await fetch("/api/scrape-vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRequestError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setResult(data as ScrapeResult);
    } catch {
      setRequestError("Network error — is Next dev running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Vendor scrape test
            </h1>
            <p className="text-sm text-muted-foreground">
              Calls Browserbase via{" "}
              <code className="rounded bg-muted px-1 text-xs">
                POST /api/scrape-vendor
              </code>{" "}
              (FastAPI,{" "}
              <code className="text-xs">APP_DEBUG=true</code> only).
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Home
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>URL</CardTitle>
            <CardDescription>
              Paste a vendor homepage. Takes ~5–15s per run (remote browser).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="font-mono text-sm"
              placeholder="https://example-vendor.com"
            />
            <Button
              onClick={() => void runScrape()}
              disabled={loading || !url.trim().startsWith("http")}
            >
              {loading ? "Scraping…" : "Scrape"}
            </Button>
          </CardContent>
        </Card>

        {requestError && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {requestError}
          </div>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
              <CardDescription>
                <span
                  className={
                    result.scrape_success
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }
                >
                  scrape_success: {String(result.scrape_success)}
                </span>
                {" — "}
                True when phone, email, or address was found.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {result.error ? (
                <p className="text-red-300">
                  <span className="font-medium">error:</span> {result.error}
                </p>
              ) : null}
              <dl className="grid gap-2">
                {(
                  [
                    ["business_name", result.business_name],
                    ["phone", result.phone],
                    ["email", result.email],
                    ["address", result.address],
                    ["description", result.description],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {k}
                    </dt>
                    <dd className="whitespace-pre-wrap break-words font-mono text-xs">
                      {v || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
              {result.photos.length > 0 && (
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                    photos
                  </p>
                  <ul className="space-y-1 break-all font-mono text-xs">
                    {result.photos.map((p) => (
                      <li key={p}>
                        <a
                          href={p}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {p}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <details className="rounded-lg border border-white/10 bg-card/50 p-3">
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  Raw JSON
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto text-xs">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
