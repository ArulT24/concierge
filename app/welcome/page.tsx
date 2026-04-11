import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DoubtfireWelcome } from "@/components/doubtfire/doubtfire-welcome";
import { PhoneWelcomeLoader } from "@/components/doubtfire/PhoneWelcomeLoader";

export const metadata: Metadata = {
  title: "bertram",
  description: "Tell us what you're planning and we'll reach out when Bertram is ready for you.",
};

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

interface WaitlistStatus {
  on_waitlist: boolean;
  referral_code?: string;
  referral_count?: number;
}

async function getWaitlistStatus(email: string): Promise<WaitlistStatus> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/landing-waitlist?email=${encodeURIComponent(email.trim().toLowerCase())}`,
      { cache: "no-store" }
    );
    if (!res.ok) return { on_waitlist: false };
    return (await res.json()) as WaitlistStatus;
  } catch {
    return { on_waitlist: false };
  }
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; ref?: string; method?: string; email?: string }>;
}) {
  const { reset, ref, method, email: emailParam } = await searchParams;
  const forceReset = reset === "1" || process.env.DISABLE_WAITLIST_DEDUP === "true";

  // Phone OTP users: Supabase session is client-side only, delegate entirely to PhoneWelcomeLoader.
  if (method === "phone") {
    return <PhoneWelcomeLoader initialReferredBy={ref} />;
  }

  // Email-only users: no auth required, email comes from the query param typed on the landing page.
  if (method === "email" && emailParam) {
    const status = forceReset
      ? { on_waitlist: false }
      : await getWaitlistStatus(emailParam);

    return (
      <DoubtfireWelcome
        identifier={emailParam}
        identifierType="email"
        alreadyOnWaitlist={status.on_waitlist}
        initialReferralCode={status.referral_code}
        initialReferralCount={status.referral_count}
        referredBy={ref}
      />
    );
  }

  // Google / NextAuth users: require a server-side session.
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/api/auth/signin?callbackUrl=/welcome");
  }

  const status = forceReset
    ? { on_waitlist: false }
    : await getWaitlistStatus(session.user.email);

  return (
    <DoubtfireWelcome
      identifier={session.user.email}
      identifierType="email"
      alreadyOnWaitlist={status.on_waitlist}
      initialReferralCode={status.referral_code}
      initialReferralCount={status.referral_count}
      referredBy={ref}
    />
  );
}
