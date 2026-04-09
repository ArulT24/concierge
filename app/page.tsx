import type { Metadata } from "next";

import { DoubtfireLanding } from "@/components/doubtfire/doubtfire-landing";

export const metadata: Metadata = {
  title: "bertram",
  description:
    "Chat demo for parties, holidays, travel, and itineraries — Doubtfire-style marketing layout.",
};

export default function Home() {
  return <DoubtfireLanding />;
}
