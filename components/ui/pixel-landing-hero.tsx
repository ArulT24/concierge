"use client";

import { type FormEvent, useEffect, useLayoutEffect, useState } from "react";
import { Loader2, Mail } from "lucide-react";

import { PixelatedCanvas } from "@/components/ui/pixel-art-image-component";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pixelBodyFont } from "@/lib/pixel-landing-fonts";

/** Colorful party scene — larger source for full-viewport sampling. */
const HERO_PIXEL_SRC =
  "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1920&q=85";

type SubmitStatus = "idle" | "loading" | "success";

function signupErrorMessage(data: unknown): string {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error: unknown }).error;
    if (typeof err === "string") return err;
  }
  return "Something went wrong. Try again.";
}

export function PixelLandingHero() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(
    null,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useLayoutEffect(() => {
    setViewport({ w: window.innerWidth, h: window.innerHeight });
  }, []);

  useEffect(() => {
    const update = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;

    setErrorMessage(null);
    setStatus("loading");

    try {
      const res = await fetch("/api/landing-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        setStatus("idle");
        if (res.status === 502) {
          setErrorMessage("Could not reach the server. Please try again.");
        } else {
          setErrorMessage(signupErrorMessage(data));
        }
        return;
      }

      setStatus("success");
      setEmail("");
    } catch {
      setStatus("idle");
      setErrorMessage("Could not reach the server. Please try again.");
    }
  };

  const vw = viewport?.w ?? 0;
  const vh = viewport?.h ?? 0;
  const cellSize = vw > 1280 ? 4 : 3;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#050506] text-zinc-50">
      {/* Mosaic: heavy desaturation + contrast so chroma drops but lights/darks stay punchy */}
      <div className="fixed inset-0 z-0 [filter:saturate(0.32)_contrast(1.12)]">
        {vw > 0 && vh > 0 ? (
          <PixelatedCanvas
            src={HERO_PIXEL_SRC}
            width={vw}
            height={vh}
            cellSize={cellSize}
            dotScale={0.9}
            shape="square"
            backgroundColor="#050506"
            dropoutStrength={0.42}
            interactive={!reduceMotion}
            distortionStrength={3.2}
            distortionRadius={Math.round(Math.min(vw, vh) * 0.12)}
            distortionMode="swirl"
            followSpeed={0.18}
            jitterStrength={3.5}
            jitterSpeed={3.8}
            sampleAverage
            tintColor="#a1a1aa"
            tintStrength={0.04}
            maxFps={60}
            objectFit="cover"
            fadeOnLeave
            fadeSpeed={0.12}
            responsive={false}
            className="block h-full w-full touch-none [filter:brightness(1.04)]"
          />
        ) : null}
      </div>

      {/* Modern halftone stack: flat vignette + offset dot grids (pure CSS) */}
      <div className="pixel-landing-bitmap-vignette" aria-hidden />
      <div className="pixel-landing-bitmap-halftone" aria-hidden />

      <div className="pointer-events-none relative z-10 flex min-h-dvh flex-col items-center justify-center px-5 py-10 sm:px-8 sm:py-12">
        <div className="pixel-landing-bitmap-panel pointer-events-auto w-full max-w-lg p-8 text-center sm:p-10">
          <h1
            className="text-5xl font-semibold tracking-tight text-[#fdfcf9] sm:text-6xl lg:text-7xl lg:leading-none"
            style={{
              textShadow:
                "0 2px 28px rgba(0,0,0,0.92), 0 1px 2px rgba(0,0,0,0.85)",
            }}
          >
            bertram
          </h1>

          <p
            className="mx-auto mt-4 max-w-md text-pretty text-lg font-medium leading-snug tracking-wide text-[#f7f2eb] sm:mt-5 sm:text-xl sm:leading-snug"
            style={{ textShadow: "0 2px 24px rgba(0,0,0,0.8)" }}
          >
            party planning on autopilot.
          </p>

          <p
            className={`${pixelBodyFont.className} mx-auto mt-7 max-w-md text-pretty text-sm font-normal leading-relaxed tracking-[0.01em] text-[#f2ece4] sm:text-base sm:leading-relaxed`}
            style={{ textShadow: "0 1px 18px rgba(0,0,0,0.82)" }}
          >
            We listen to what you want, chase the details you don&apos;t have
            time for, and help the day come together, so you&apos;re not juggling
            logistics when you could be blowing out candles.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 text-left"
            noValidate
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <div className="relative flex-1">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden
                />
                <Input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "loading" || status === "success"}
                  className="h-12 rounded-lg border border-white/20 bg-black/50 pl-10 text-white shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.06)] placeholder:text-zinc-400"
                  aria-invalid={Boolean(errorMessage)}
                  aria-describedby={
                    errorMessage ? "pixel-waitlist-error" : undefined
                  }
                />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={
                  status === "loading" || status === "success" || !email.trim()
                }
                className="h-12 shrink-0 rounded-lg border border-white/25 bg-zinc-800 text-white shadow-[0_1px_0_0_rgb(255_255_255_/_0.14)_inset,0_8px_24px_-6px_rgb(0_0_0_/_0.55)] transition hover:bg-zinc-700"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Joining…
                  </>
                ) : status === "success" ? (
                  "You're on the list"
                ) : (
                  "Join waitlist"
                )}
              </Button>
            </div>

            {errorMessage ? (
              <p
                id="pixel-waitlist-error"
                className="text-sm text-[#d4a5a5]"
                role="alert"
              >
                {errorMessage}
              </p>
            ) : null}

            {status === "success" ? (
              <p className="text-sm font-medium text-[#b8d4c4]">
                Thanks! Check your inbox soon for updates.
              </p>
            ) : (
              <p className="text-xs text-zinc-500">
                No spam—just launch news and an occasional tip for hosts.
              </p>
            )}
          </form>
        </div>

        <p className="pointer-events-none fixed bottom-4 left-1/2 z-10 max-w-[90vw] -translate-x-1/2 text-center text-[0.65rem] text-white/50 sm:text-xs">
          Move your pointer over the page
          {reduceMotion ? " · motion reduced" : ""}
        </p>
      </div>
    </div>
  );
}
