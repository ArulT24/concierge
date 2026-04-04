import { NextResponse } from "next/server";

import { auth } from "@/auth";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

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
      session_id?: string;
      email?: string;
      city?: string;
    };

    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email || email.toLowerCase() !== sessionEmail) {
      return NextResponse.json(
        { error: "Email must match your signed-in Google account." },
        { status: 403 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
    console.error("Waitlist API proxy error:", error);

    return NextResponse.json(
      { error: "Could not reach the backend. Make sure it is running." },
      { status: 502 }
    );
  }
}
