import { NextResponse } from "next/server";

type WaitlistPayload = {
  email?: string;
  city?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as WaitlistPayload;
    const email = body.email?.trim() ?? "";
    const city = body.city?.trim() ?? "";

    if (!email || !city) {
      return NextResponse.json(
        { error: "Email and city are required." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    console.log("Waitlist signup", {
      email,
      city,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      message: `Thanks! ${email} from ${city} is on the waitlist.`,
    });
  } catch (error) {
    console.error("Waitlist API error", error);

    return NextResponse.json(
      { error: "Could not save your waitlist request." },
      { status: 500 }
    );
  }
}
