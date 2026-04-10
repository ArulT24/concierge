import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/api/pipeline/${eventId}`);
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.detail ?? "Backend error" }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Could not reach backend." }, { status: 502 });
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/api/pipeline/${eventId}/finalize`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.detail ?? "Backend error" }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Could not reach backend." }, { status: 502 });
  }
}
