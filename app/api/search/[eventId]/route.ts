import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  try {
    const response = await fetch(`${BACKEND_URL}/api/search/${eventId}`);
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "The backend returned an unexpected response." },
        { status: 502 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Could not load search status." },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Search status API proxy error:", error);
    return NextResponse.json(
      { error: "Could not reach the backend." },
      { status: 502 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const response = await fetch(
      `${BACKEND_URL}/api/search/${eventId}/trigger`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "The backend returned an unexpected response." },
        { status: 502 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Search trigger failed." },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Search trigger API proxy error:", error);
    return NextResponse.json(
      { error: "Could not reach the backend." },
      { status: 502 }
    );
  }
}
