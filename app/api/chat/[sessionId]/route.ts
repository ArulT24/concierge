import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { chatProxyHeaders } from "@/lib/backend-chat-headers";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  try {
    const session = await auth();
    const forwardHeaders = chatProxyHeaders(session);

    const response = await fetch(`${BACKEND_URL}/api/chat/${sessionId}`, {
      headers: forwardHeaders,
    });
    const raw = await response.text();
    let data: { detail?: string; error?: string } | null = null;

    try {
      data = raw ? (JSON.parse(raw) as { detail?: string; error?: string }) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.detail ??
            data?.error ??
            (raw.trim() || "Could not resume session."),
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data ?? {});
  } catch (error) {
    console.error("Chat resume proxy error:", error);

    return NextResponse.json(
      {
        error:
          "Could not reach the planning assistant. Start the backend: uvicorn backend.main:app --reload",
      },
      { status: 502 }
    );
  }
}
