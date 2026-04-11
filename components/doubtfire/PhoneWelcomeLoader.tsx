"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { DoubtfireWelcome } from "./doubtfire-welcome";

interface Props {
  initialReferredBy?: string;
}

/**
 * Loaded only for phone-OTP users (?method=phone).
 * Reads the Supabase session client-side to get the phone number,
 * checks waitlist status, then renders the intake wizard.
 */
export function PhoneWelcomeLoader({ initialReferredBy }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [phone, setPhone] = useState<string | null>(null);
  const [alreadyOnWaitlist, setAlreadyOnWaitlist] = useState(false);
  const [initialReferralCode, setInitialReferralCode] = useState<string | undefined>();
  const [initialReferralCount, setInitialReferralCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.phone) {
        // No valid Supabase phone session — send back to landing
        router.replace("/");
        return;
      }

      setPhone(user.phone);

      // Check waitlist status
      try {
        const res = await fetch(
          `/api/landing-waitlist?phone=${encodeURIComponent(user.phone)}`
        );
        if (res.ok) {
          const data = (await res.json()) as {
            on_waitlist: boolean;
            referral_code?: string;
            referral_count?: number;
          };
          setAlreadyOnWaitlist(data.on_waitlist);
          setInitialReferralCode(data.referral_code);
          setInitialReferralCount(data.referral_count ?? 0);
        }
      } catch {
        // Non-fatal — proceed with wizard
      }

      setReady(true);
    }

    void init();
  }, [router, supabase]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-400">Loading…</p>
      </div>
    );
  }

  async function getAuthToken(): Promise<string | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  return (
    <DoubtfireWelcome
      identifier={phone!}
      identifierType="phone"
      alreadyOnWaitlist={alreadyOnWaitlist}
      initialReferralCode={initialReferralCode}
      initialReferralCount={initialReferralCount}
      referredBy={initialReferredBy}
      getAuthToken={getAuthToken}
    />
  );
}
