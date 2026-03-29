"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Store,
} from "lucide-react";

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

/**
 * Party planning context: social, local discovery, listings, and how parents coordinate.
 * Brands via Simple Icons CDN. Phone / email / messages / “listings” use Lucide glyphs
 * (Simple Icons has no Craigslist mark; the store tile reads as classifieds / local picks).
 * eBay reads as generic buy-sell marketplace next to Facebook/Instagram.
 */
type OrbitBrand = { type: "brand"; slug: string; color: string };
type OrbitGlyph = {
  type: "glyph";
  id: "phone" | "mail" | "messages" | "listings";
  bgClass: string;
};

type OrbitItem = OrbitBrand | OrbitGlyph;

const ORBIT_INNER: OrbitItem[] = [
  { type: "brand", slug: "facebook", color: "0866FF" },
  { type: "brand", slug: "instagram", color: "E4405F" },
  { type: "brand", slug: "reddit", color: "FF4500" },
  { type: "brand", slug: "ebay", color: "E53238" },
  { type: "glyph", id: "listings", bgClass: "bg-violet-700/95" },
  { type: "glyph", id: "phone", bgClass: "bg-blue-600/95" },
  { type: "glyph", id: "mail", bgClass: "bg-sky-500/95" },
  { type: "glyph", id: "messages", bgClass: "bg-emerald-600/95" },
];

const ORBIT_OUTER: OrbitItem[] = [
  /* Amazon/Walmart marks aren’t on Simple Icons CDN; Instacart + Target + Shopify cover shopping. */
  { type: "brand", slug: "instacart", color: "43B02A" },
  { type: "brand", slug: "whatsapp", color: "25D366" },
  { type: "brand", slug: "shopify", color: "7AB55C" },
  { type: "brand", slug: "target", color: "CC0000" },
  { type: "brand", slug: "etsy", color: "F56400" },
  { type: "brand", slug: "doordash", color: "FF3008" },
  { type: "brand", slug: "nextdoor", color: "00C4CC" },
  { type: "brand", slug: "yelp", color: "FF1A1A" },
  { type: "brand", slug: "pinterest", color: "BD081C" },
  { type: "brand", slug: "gmail", color: "EA4335" },
  { type: "brand", slug: "googlemaps", color: "4285F4" },
];

function simpleIconUrl(slug: string, color: string) {
  return `https://cdn.simpleicons.org/${slug}/${color}`;
}

function orbitItemKey(item: OrbitItem, i: number, reverse: boolean) {
  const side = reverse ? "o" : "i";
  if (item.type === "brand") return `${side}-${i}-${item.slug}`;
  return `${side}-${i}-g-${item.id}`;
}

const GLYPH_ICONS = {
  phone: Phone,
  mail: Mail,
  messages: MessageCircle,
  listings: Store,
} as const;

type OrbitTileBlur = "off" | "soft" | "heavy";

function OrbitTile({
  item,
  iconPx,
  blur,
}: {
  item: OrbitItem;
  iconPx: number;
  blur: OrbitTileBlur;
}) {
  const shell =
    "flex size-full items-center justify-center rounded-2xl shadow-[0_8px_30px_-8px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.14)_inset] ring-1 ring-white/25";

  const fade =
    blur === "heavy"
      ? "opacity-[0.52] [filter:blur(3.5px)]"
      : blur === "soft"
        ? "opacity-[0.68] [filter:blur(1.25px)]"
        : "opacity-[0.94]";

  /** Blur sits inside the counter-rotating subtree so it doesn’t break transform composition. */
  if (item.type === "glyph") {
    const Icon = GLYPH_ICONS[item.id];
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className={`${shell} ${item.bgClass} ${fade}`} aria-hidden>
          <Icon
            className="text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]"
            strokeWidth={2.2}
            size={Math.round(iconPx * 0.44)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={simpleIconUrl(item.slug, item.color)}
        alt=""
        width={iconPx}
        height={iconPx}
        className={`${shell} bg-zinc-900/95 object-contain p-2.5 ${fade}`}
        loading="lazy"
      />
    </div>
  );
}

function SpinningAppRing({
  apps,
  radiusVw,
  radiusMaxPx,
  iconPx,
  reverse,
  blurredIndexes,
  centerTopPercent = 54,
  /** When set, every tile uses this blur level (overrides per-index soft blur). */
  ringBlur = "selective",
  /** Must match on ring + counter layers (outer can be slower for parallax). */
  spinDurationSec = 62,
}: {
  apps: OrbitItem[];
  radiusVw: number;
  radiusMaxPx: number;
  iconPx: number;
  reverse: boolean;
  blurredIndexes: Set<number>;
  /** Viewport % from top for the orbit center (higher = lower on screen). */
  centerTopPercent?: number;
  ringBlur?: "selective" | "heavy";
  spinDurationSec?: number;
}) {
  const n = apps.length;
  const half = iconPx / 2;
  /** Ring vs counter must use opposite keyframes, same --orbit-duration (see orbit-anim-* in <style>). */
  const ringSpinClass = reverse ? "orbit-anim-ring-rev" : "orbit-anim-ring";
  const counterSpinClass = reverse ? "orbit-anim-ring" : "orbit-anim-ring-rev";
  const ringBox = {
    width: `min(${radiusVw * 2}vw, ${radiusMaxPx * 2}px)`,
    height: `min(${radiusVw * 2}vw, ${radiusMaxPx * 2}px)`,
    ["--orbit-duration" as string]: `${spinDurationSec}s`,
  } satisfies CSSProperties;
  const counterDuration = {
    ["--orbit-duration" as string]: `${spinDurationSec}s`,
  } satisfies CSSProperties;

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ top: `${centerTopPercent}%` }}
    >
      <div className={ringSpinClass} style={ringBox}>
      {apps.map((app, i) => {
        const angle = (360 / n) * i;
        const blur: OrbitTileBlur =
          ringBlur === "heavy"
            ? "heavy"
            : blurredIndexes.has(i)
              ? "soft"
              : "off";
        return (
          <div
            key={orbitItemKey(app, i, reverse)}
            className="absolute left-1/2 top-1/2"
            style={{
              width: iconPx,
              height: iconPx,
              marginLeft: -half,
              marginTop: -half,
              transform: `rotate(${angle}deg) translateY(calc(-1 * min(${radiusVw}vw, ${radiusMaxPx}px)))`,
            }}
          >
            <div
              className="h-full w-full"
              style={{ transform: `rotate(-${angle}deg)` }}
            >
              <div
                className={`h-full w-full ${counterSpinClass}`}
                style={counterDuration}
              >
                <OrbitTile item={app} iconPx={iconPx} blur={blur} />
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

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
        .orbit-anim-ring {
          animation: spin-slow var(--orbit-duration, 62s) linear infinite;
        }
        @keyframes spin-slow-reverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        .orbit-anim-ring-rev {
          animation: spin-slow-reverse var(--orbit-duration, 62s) linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .orbit-anim-ring,
          .orbit-anim-ring-rev {
            animation: none !important;
          }
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
        {/* Spinning “app” orbits */}
        <div className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden">
          <div
            className="absolute inset-0 origin-center"
            style={{
              perspective: "1400px",
              transform: "perspective(1400px) rotateX(13deg)",
              transformOrigin: "center 52%",
            }}
          >
          <div
            className="absolute inset-0 opacity-95"
            style={{
              background:
                "radial-gradient(ellipse 58% 48% at 50% 48%, rgba(124, 58, 237, 0.16), transparent 72%), radial-gradient(ellipse 42% 38% at 50% 52%, rgba(0, 121, 218, 0.11), transparent 68%), radial-gradient(ellipse 30% 28% at 50% 56%, rgba(251, 191, 36, 0.06), transparent 62%)",
            }}
          />
          <SpinningAppRing
            apps={ORBIT_OUTER}
            radiusVw={54}
            radiusMaxPx={420}
            iconPx={90}
            reverse
            blurredIndexes={new Set()}
            centerTopPercent={63}
            ringBlur="heavy"
            spinDurationSec={74}
          />
          <SpinningAppRing
            apps={ORBIT_INNER}
            radiusVw={25}
            radiusMaxPx={205}
            iconPx={68}
            reverse={false}
            blurredIndexes={new Set([1, 4, 6])}
            centerTopPercent={54}
          />
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background: `linear-gradient(to top, ${colors.baseBg} 10%, rgba(9, 9, 11, 0.8) 40%, transparent 100%)`,
          }}
        />

        <div className="relative z-20 flex h-full w-full flex-col items-center justify-end gap-6 pb-24">
          <h1
            className="text-center text-5xl font-bold tracking-tight md:text-6xl"
            style={{ color: colors.textMain }}
          >
            bertram
          </h1>

          <p
            className="max-w-md px-4 text-center text-lg font-medium"
            style={{ color: colors.textSecondary }}
          >
            From vendors to cakes, bertram has you covered. Party plan less, celebrate more!
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
