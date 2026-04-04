import type { Metadata } from "next";

import { ArdenLanding } from "@/components/arden/arden-landing";

export const metadata: Metadata = {
  title: "bertram — planning demo",
  description:
    "Chat demo for parties, holidays, travel, and itineraries — waitlist and layout inspired by arden.co.",
};

export default function Home() {
  return <ArdenLanding />;
}
