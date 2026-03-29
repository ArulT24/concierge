"use client";

import { useRef, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

type SubmitStatus = "idle" | "loading" | "success";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
};

/** Decorative backgrounds (Unsplash). */
const SPIN_BG_LARGE =
  "https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=2000&q=80";
const SPIN_BG_MID =
  "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&w=1200&q=80";
const SPIN_BG_FRONT =
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80";
const APP_ICON =
  "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=400&q=80";

function signupErrorMessage(data: unknown): string {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error: unknown }).error;
    if (typeof err === "string") return err;
  }
  return "Something went wrong. Try again.";
}

export function WaitlistHero() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fireConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles: Particle[] = [];
    const particleColors = [
      "#0079da",
      "#10b981",
      "#fbbf24",
      "#f472b6",
      "#fff",
    ];

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const createParticle = (): Particle => ({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 2) * 10,
      life: 100,
      color: particleColors[Math.floor(Math.random() * particleColors.length)]!,
      size: Math.random() * 4 + 2,
    });

    for (let i = 0; i < 50; i++) {
      particles.push(createParticle());
    }

    const animate = () => {
      if (particles.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]!;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.5;
        p.life -= 2;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / 100);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (p.life <= 0) {
          particles.splice(i, 1);
          i--;
        }
      }

      requestAnimationFrame(animate);
    };

    animate();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) return;

    setErrorMessage(null);
    setStatus("loading");

    try {
      const res = await fetch("/api/landing-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
      fireConfetti();
    } catch {
      setStatus("idle");
      setErrorMessage("Could not reach the server. Please try again.");
    }
  };

  const colors = {
    textMain: "#ffffff",
    textSecondary: "#94a3b8",
    bluePrimary: "#0079da",
    success: "#10b981",
    inputBg: "#27272a",
    baseBg: "#09090b",
    inputShadow: "rgba(255, 255, 255, 0.1)",
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-black">
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 60s linear infinite;
        }
        @keyframes spin-slow-reverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        .animate-spin-slow-reverse {
          animation: spin-slow-reverse 60s linear infinite;
        }
        @keyframes bounce-in {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes success-pulse {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.1); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes success-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.4); }
          50% { box-shadow: 0 0 60px rgba(16, 185, 129, 0.8), 0 0 100px rgba(16, 185, 129, 0.4); }
        }
        @keyframes checkmark-draw {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes celebration-ring {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
        .animate-success-pulse {
          animation: success-pulse 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .animate-success-glow {
          animation: success-glow 2s ease-in-out infinite;
        }
        .animate-checkmark {
          stroke-dasharray: 24;
          stroke-dashoffset: 24;
          animation: checkmark-draw 0.4s ease-out 0.3s forwards;
        }
        .animate-ring {
          animation: celebration-ring 0.8s ease-out forwards;
        }
      `}</style>

      <div
        className="relative h-screen w-full overflow-hidden shadow-2xl"
        style={{
          backgroundColor: colors.baseBg,
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{
            perspective: "1200px",
            transform: "perspective(1200px) rotateX(15deg)",
            transformOrigin: "center bottom",
            opacity: 1,
          }}
        >
          <div className="animate-spin-slow absolute inset-0">
            <div
              className="absolute top-1/2 left-1/2"
              style={{
                width: "2000px",
                height: "2000px",
                transform: "translate(-50%, -50%) rotate(279.05deg)",
                zIndex: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={SPIN_BG_LARGE}
                alt=""
                className="h-full w-full object-cover opacity-50"
              />
            </div>
          </div>

          <div className="animate-spin-slow-reverse absolute inset-0">
            <div
              className="absolute top-1/2 left-1/2"
              style={{
                width: "1000px",
                height: "1000px",
                transform: "translate(-50%, -50%) rotate(304.42deg)",
                zIndex: 1,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={SPIN_BG_MID}
                alt=""
                className="h-full w-full object-cover opacity-60"
              />
            </div>
          </div>

          <div className="animate-spin-slow absolute inset-0">
            <div
              className="absolute top-1/2 left-1/2"
              style={{
                width: "800px",
                height: "800px",
                transform: "translate(-50%, -50%) rotate(48.33deg)",
                zIndex: 2,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={SPIN_BG_FRONT}
                alt=""
                className="h-full w-full object-cover opacity-80"
              />
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background: `linear-gradient(to top, ${colors.baseBg} 10%, rgba(9, 9, 11, 0.8) 40%, transparent 100%)`,
          }}
        />

        <div className="relative z-20 flex h-full w-full flex-col items-center justify-end gap-6 pb-24">
          <div className="mb-2 h-16 w-16 overflow-hidden rounded-2xl shadow-lg ring-1 ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={APP_ICON}
              alt="Event planning"
              className="h-full w-full object-cover"
            />
          </div>

          <h1
            className="text-center text-5xl font-bold tracking-tight md:text-6xl"
            style={{ color: colors.textMain }}
          >
            Coming soon
          </h1>

          <p
            className="max-w-md px-4 text-center text-lg font-medium"
            style={{ color: colors.textSecondary }}
          >
            Thoughtful party planning for busy parents. Join the waitlist.
          </p>

          <div className="mt-4 w-full max-w-md px-4">
            <div className="perspective-1000 relative h-[60px] w-full">
            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute top-1/2 left-1/2 z-50 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2"
            />

            <div
              className={`absolute inset-0 flex items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                status === "success"
                  ? "animate-success-pulse animate-success-glow rotate-x-0 scale-100 opacity-100"
                  : "pointer-events-none -rotate-x-90 scale-95 opacity-0"
              }`}
              style={{ backgroundColor: colors.success }}
            >
              {status === "success" && (
                <>
                  <div
                    className="animate-ring absolute top-1/2 left-1/2 h-full w-full rounded-full border-2 border-emerald-400"
                    style={{ animationDelay: "0s" }}
                  />
                  <div
                    className="animate-ring absolute top-1/2 left-1/2 h-full w-full rounded-full border-2 border-emerald-300"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <div
                    className="animate-ring absolute top-1/2 left-1/2 h-full w-full rounded-full border-2 border-emerald-200"
                    style={{ animationDelay: "0.3s" }}
                  />
                </>
              )}
              <div
                className={`flex items-center gap-2 text-lg font-semibold text-white ${
                  status === "success" ? "animate-bounce-in" : ""
                }`}
              >
                <div className="rounded-full bg-white/20 p-1">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      className={
                        status === "success" ? "animate-checkmark" : ""
                      }
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span>You&apos;re on the list!</span>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className={`group relative h-full w-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                status === "success"
                  ? "pointer-events-none rotate-x-90 scale-95 opacity-0"
                  : "rotate-x-0 scale-100 opacity-100"
              }`}
            >
              <input
                type="email"
                required
                placeholder="name@email.com"
                value={email}
                disabled={status === "loading"}
                onChange={(e) => setEmail(e.target.value)}
                className="h-[60px] w-full rounded-full pl-6 pr-[150px] outline-none transition-all duration-200 placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                  backgroundColor: colors.inputBg,
                  color: colors.textMain,
                  boxShadow: `inset 0 0 0 1px ${colors.inputShadow}`,
                }}
              />

              <div className="absolute top-[6px] right-[6px] bottom-[6px]">
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="flex h-full min-w-[130px] items-center justify-center rounded-full px-6 font-medium text-white transition-all hover:brightness-110 active:scale-95 disabled:cursor-wait disabled:active:scale-100 disabled:hover:brightness-100"
                  style={{ backgroundColor: colors.bluePrimary }}
                >
                  {status === "loading" ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    "Join waitlist"
                  )}
                </button>
              </div>
            </form>
            </div>
            {errorMessage ? (
              <p
                className="mt-3 text-center text-sm text-red-400"
                role="alert"
              >
                {errorMessage}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
