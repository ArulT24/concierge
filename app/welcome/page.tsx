import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DoubtfireWelcome } from "@/components/doubtfire/doubtfire-welcome";

export const metadata: Metadata = {
  title: "bertram",
  description: "Tell us what you're planning and we'll reach out when Bertram is ready for you.",
};

export default async function WelcomePage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/api/auth/signin?callbackUrl=/welcome");
  }

  return <DoubtfireWelcome email={session.user.email} />;
}
