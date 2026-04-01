import type { Metadata } from "next";

import { ArdenLanding } from "@/components/arden/arden-landing";

export const metadata: Metadata = {
  title: "Arden-style travel demo",
  description:
    "Scroll-snap demo landing with staggered chat, inspired by arden.co.",
};

export default function ArdenDemoPage() {
  return <ArdenLanding />;
}
