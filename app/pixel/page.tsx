import type { Metadata } from "next";

import { PixelLandingHero } from "@/components/ui/pixel-landing-hero";

export const metadata: Metadata = {
  title: "bertram — join the waitlist",
  description:
    "bertram helps you plan your kid's party with calm and care—details handled so you can be with your family. Join the waitlist.",
};

export default function PixelLandingPage() {
  return <PixelLandingHero />;
}
