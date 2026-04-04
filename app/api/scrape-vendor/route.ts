import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const response = await fetch(`${BACKEND_URL}/api/scrape-vendor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "The backend returned an unexpected response." },
        { status: 502 }
      );
    }

    if (!response.ok) {
      const err = data as { detail?: string | { msg?: string } };
      const detail =
        typeof err.detail === "string"
          ? err.detail
          : JSON.stringify(err.detail ?? "Scrape failed.");
      return NextResponse.json({ error: detail }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("scrape-vendor proxy error:", error);
    return NextResponse.json(
      { error: "Could not reach the backend." },
      { status: 502 }
    );
  }
}
