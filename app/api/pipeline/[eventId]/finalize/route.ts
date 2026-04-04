import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/pipeline/${eventId}/finalize`,
      { method: "POST" }
    );

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
      const err = data as { detail?: string };
      return NextResponse.json(
        { error: err.detail ?? "Could not queue finalize." },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("pipeline finalize proxy error:", error);
    return NextResponse.json(
      { error: "Could not reach the backend." },
      { status: 502 }
    );
  }
}
