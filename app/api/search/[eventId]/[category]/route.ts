import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string; category: string }> }
) {
  const { eventId, category } = await params;

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/search/${eventId}/${category}`
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
        { error: data.detail ?? "Could not load search results." },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Search results API proxy error:", error);
    return NextResponse.json(
      { error: "Could not reach the backend." },
      { status: 502 }
    );
  }
}
