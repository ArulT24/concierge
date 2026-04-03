import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const raw = await response.text();
    let data: { detail?: string; error?: string } | null = null;

    try {
      data = raw ? (JSON.parse(raw) as { detail?: string; error?: string }) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const errorMessage =
        data?.detail ?? data?.error ?? (raw.trim() || "Backend request failed.");

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    return NextResponse.json(data ?? {});
  } catch (error) {
    console.error("Chat API proxy error:", error);

    return NextResponse.json(
      {
        error:
          "Could not reach the planning assistant. Start the backend: uvicorn backend.main:app --reload",
      },
      { status: 502 }
    );
  }
}
