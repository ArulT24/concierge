import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  try {
    const response = await fetch(`${BACKEND_URL}/api/chat/${sessionId}`);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Could not resume session." },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Chat resume proxy error:", error);

    return NextResponse.json(
      { error: "Could not reach the backend." },
      { status: 502 }
    );
  }
}
