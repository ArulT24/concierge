import { NextResponse } from "next/server";

import { auth } from "@/auth";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(request: Request) {
  const session = await auth();
  const sessionEmail = session?.user?.email?.trim().toLowerCase();

  if (!session || !sessionEmail) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/landing-waitlist?email=${encodeURIComponent(sessionEmail)}`
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Check failed." },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Could not reach backend." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const sessionEmail = session?.user?.email?.trim().toLowerCase();

  if (!session || !sessionEmail) {
    return NextResponse.json(
      { error: "You must be signed in to join the waitlist." },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      planning_interest?: string;
      event_category?: string;
      intake_answers?: Record<string, string>;
    };

    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email || email.toLowerCase() !== sessionEmail) {
      return NextResponse.json(
        { error: "Email must match your signed-in Google account." },
        { status: 403 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/landing-waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        planning_interest: body.planning_interest ?? null,
        event_category: body.event_category ?? null,
        intake_answers: body.intake_answers ?? null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Waitlist request failed." },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Landing waitlist API proxy error:", error);

    return NextResponse.json(
      { error: "Could not reach the backend. Make sure it is running." },
      { status: 502 }
    );
  }
}
