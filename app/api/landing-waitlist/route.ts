import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isValidEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// GET /api/landing-waitlist
// Supports ?email= (NextAuth session) or ?phone= (Supabase session / PhoneWelcomeLoader)
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phoneParam = searchParams.get("phone");

  // Phone lookup: verify via Supabase JWT, then proxy to backend
  if (phoneParam) {
    const authorization = request.headers.get("Authorization");
    const token = authorization?.replace(/^Bearer\s+/i, "");

    if (token) {
      // Verify the Supabase JWT if present, but allow unauthenticated GET for
      // the PhoneWelcomeLoader which calls with the session cookie instead.
      const supabase = createAdminClient();
      const { error } = await supabase.auth.getUser(token);
      if (error) {
        return NextResponse.json({ error: "Invalid token." }, { status: 401 });
      }
    }

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/landing-waitlist?phone=${encodeURIComponent(phoneParam)}`
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

  // Email lookup: require NextAuth session
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

// ---------------------------------------------------------------------------
// POST /api/landing-waitlist
// Supports email (NextAuth) or phone_number (Supabase JWT in Authorization header)
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      phone_number?: string;
      planning_interest?: string;
      event_category?: string;
      intake_answers?: Record<string, string>;
      referred_by?: string;
    };

    const isPhoneSignup = !!body.phone_number && !body.email;

    if (isPhoneSignup) {
      // Verify the Supabase JWT from the Authorization header
      const authorization = request.headers.get("Authorization");
      const token = authorization?.replace(/^Bearer\s+/i, "");

      if (!token) {
        return NextResponse.json(
          { error: "Authorization token required for phone sign-up." },
          { status: 401 }
        );
      }

      const supabase = createAdminClient();
      const { data: userData, error } = await supabase.auth.getUser(token);

      if (error || !userData.user?.phone) {
        return NextResponse.json(
          { error: "Invalid or expired token." },
          { status: 401 }
        );
      }

      // Ensure the phone_number in the body matches the authenticated user
      const sessionPhone = userData.user.phone;
      if (body.phone_number !== sessionPhone) {
        return NextResponse.json(
          { error: "Phone number must match your authenticated session." },
          { status: 403 }
        );
      }

      const response = await fetch(`${BACKEND_URL}/api/landing-waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: sessionPhone,
          planning_interest: body.planning_interest ?? null,
          event_category: body.event_category ?? null,
          intake_answers: body.intake_answers ?? null,
          referred_by: body.referred_by ?? null,
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
    }

    // Email sign-up: NextAuth users and unauthenticated email-only users.
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
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
        referred_by: body.referred_by ?? null,
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
