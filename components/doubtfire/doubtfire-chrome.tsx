"use client";

import { useId } from "react";

/** Shared Doubtfire marketing surface: background, header, tokens. */

export const DOUBTFIRE_BLUE = "#1B6FF5";

export const DOUBTFIRE_SOFT_SHADOW =
  "shadow-[0_10px_40px_-12px_rgba(15,23,42,0.18),0_2px_8px_-4px_rgba(15,23,42,0.08)]";

/** Black + white fractal noise (TV static); stays under UI; unique filter id per mount. */
export function BertramStaticBg() {
  const filterId = `bertram-static-${useId().replace(/:/g, "")}`;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 bg-black [transform:translateZ(0)]"
      aria-hidden
    >
      <svg
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <filter
            id={filterId}
            x="0"
            y="0"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85"
              numOctaves="4"
              seed="47"
              stitchTiles="stitch"
              result="noise"
            />
            <feColorMatrix in="noise" type="luminanceToAlpha" result="mask" />
            <feComponentTransfer in="mask" result="maskA">
              <feFuncA type="linear" slope="4.5" intercept="-1.2" />
            </feComponentTransfer>
            <feFlood floodColor="#ffffff" floodOpacity="0.28" result="flood" />
            <feComposite in="flood" in2="maskA" operator="in" result="speckle" />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="speckle" />
            </feMerge>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="#000000" filter={`url(#${filterId})`} />
      </svg>
    </div>
  );
}

export function DoubtfireSiteHeader() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-5 sm:px-8 sm:pt-6">
      <div
        className="pointer-events-auto flex flex-row items-center gap-2.5 rounded-full border border-neutral-200/95 bg-white py-2 pl-2 pr-4 shadow-[0_12px_42px_-10px_rgba(0,0,0,0.45),0_6px_20px_-8px_rgba(0,0,0,0.28),0_0_0_1px_rgba(0,0,0,0.04)_inset] ring-1 ring-black/10"
      >
        <svg
          viewBox="0 0 36 36"
          className="size-9 shrink-0"
          aria-hidden
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="18" cy="18" r="18" fill="#0a0a0a" />
          <ellipse cx="13" cy="11" rx="5.5" ry="2.8" fill="#ffffff" opacity="0.14" />
          <circle cx="18" cy="20" r="10.5" fill="#fafafa" />
          <text
            x="18"
            y="24.5"
            textAnchor="middle"
            fill="#0a0a0a"
            fontSize="14"
            fontWeight="700"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            B
          </text>
        </svg>
        <span className="text-[17px] font-bold tracking-tight text-neutral-900 lowercase">
          bertram
        </span>
      </div>
    </header>
  );
}
