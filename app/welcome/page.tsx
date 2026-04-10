import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DoubtfireWelcome } from "@/components/doubtfire/doubtfire-welcome";

export const metadata: Metadata = {
  title: "bertram",
  description: "Tell us what you're planning and we'll reach out when Bertram is ready for you.",
};

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

async function isAlreadyOnWaitlist(email: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/landing-waitlist?email=${encodeURIComponent(email.trim().toLowerCase())}`,
      { cache: "no-store" }
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { on_waitlist?: boolean };
    return data.on_waitlist === true;
  } catch {
    return false;
  }
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/api/auth/signin?callbackUrl=/welcome");
  }

  const { reset } = await searchParams;
  const forceReset = reset === "1";

  const alreadyOnWaitlist =
    forceReset ? false : await isAlreadyOnWaitlist(session.user.email);

  return (
    <DoubtfireWelcome
      email={session.user.email}
      alreadyOnWaitlist={alreadyOnWaitlist}
    />
  );
}
