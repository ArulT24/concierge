"use client";

import { useState, useRef, useCallback } from "react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FlowStep = "phone" | "otp" | "success";

interface PhoneOTPFlowProps {
  /** Called when the user wants to close/cancel the flow. */
  onClose: () => void;
  /** Optional referral code to pass through to /welcome */
  referredBy?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OTP_LENGTH = 6;
const BLUE = "#111827";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PhoneOTPFlow({ onClose, referredBy }: PhoneOTPFlowProps) {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<FlowStep>("phone");
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ---------------------------------------------------------------------------
  // Phone step
  // ---------------------------------------------------------------------------

  async function handleSendOTP() {
    if (!phone || !isValidPhoneNumber(phone)) {
      setError("Please enter a valid phone number including country code.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithOtp({ phone });

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }

    setStep("otp");
    startResendCooldown();
  }

  // ---------------------------------------------------------------------------
  // OTP step
  // ---------------------------------------------------------------------------

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);

    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d !== "")) {
      void handleVerifyOTP(next.join(""));
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (pasted.length === OTP_LENGTH) {
      e.preventDefault();
      const next = pasted.split("");
      setOtp(next);
      otpRefs.current[OTP_LENGTH - 1]?.focus();
      void handleVerifyOTP(pasted);
    }
  }

  async function handleVerifyOTP(token: string) {
    if (!phone) return;
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });

    setLoading(false);
    if (authError) {
      setError("Invalid code. Please try again.");
      setOtp(Array(OTP_LENGTH).fill(""));
      otpRefs.current[0]?.focus();
      return;
    }

    // Redirect to welcome page; phone_number is read from the Supabase session there
    const params = new URLSearchParams({ method: "phone" });
    if (referredBy) params.set("ref", referredBy);
    router.push(`/welcome?${params.toString()}`);
  }

  async function handleResend() {
    if (!phone || resendCooldown > 0) return;
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setOtp(Array(OTP_LENGTH).fill(""));
    otpRefs.current[0]?.focus();
    startResendCooldown();
  }

  function startResendCooldown() {
    setResendCooldown(30);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const setOtpRef = useCallback(
    (index: number) => (el: HTMLInputElement | null) => {
      otpRefs.current[index] = el;
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-neutral-900">
          {step === "phone" ? "Enter your phone number" : "Enter the code"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {step === "phone" && (
        <>
          <p className="text-[15px] leading-snug text-neutral-500">
            We&apos;ll send a one-time code to verify your number.
          </p>

          {/* PhoneInput renders an international dial-code picker + number field */}
          <div
            className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900"
          >
            <PhoneInput
              international
              defaultCountry="US"
              value={phone}
              onChange={setPhone}
              className="w-full text-[15px] text-neutral-900 outline-none"
              inputClassName="w-full bg-transparent text-[15px] text-neutral-900 outline-none placeholder:text-neutral-400"
              placeholder="Phone number"
            />
          </div>

          {error && <p className="text-[13px] text-red-600">{error}</p>}

          <button
            type="button"
            disabled={loading || !phone}
            onClick={() => void handleSendOTP()}
            className="w-full rounded-full py-3 text-sm font-semibold text-white transition-[filter] hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: BLUE }}
          >
            {loading ? "Sending…" : "Send code"}
          </button>
        </>
      )}

      {step === "otp" && (
        <>
          <p className="text-[15px] leading-snug text-neutral-500">
            Sent to <span className="font-medium text-neutral-900">{phone}</span>
          </p>

          {/* 6-digit OTP boxes */}
          <div className="flex gap-2">
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <input
                key={i}
                ref={setOtpRef(i)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={otp[i]}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                onPaste={handleOtpPaste}
                className="h-12 w-full rounded-xl border border-neutral-200 text-center text-lg font-semibold text-neutral-900 outline-none transition-all focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                disabled={loading}
                autoFocus={i === 0}
              />
            ))}
          </div>

          {error && <p className="text-[13px] text-red-600">{error}</p>}

          {loading && (
            <p className="text-center text-[13px] text-neutral-400">Verifying…</p>
          )}

          <button
            type="button"
            disabled={resendCooldown > 0 || loading}
            onClick={() => void handleResend()}
            className="text-center text-[13px] text-neutral-500 underline-offset-2 transition-colors hover:text-neutral-800 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
          >
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setOtp(Array(OTP_LENGTH).fill(""));
              setError(null);
            }}
            className="text-center text-[13px] text-neutral-400 transition-colors hover:text-neutral-600"
          >
            ← Change number
          </button>
        </>
      )}
    </div>
  );
}
