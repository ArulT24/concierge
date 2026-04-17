import type { Metadata } from "next";

import { ChiefCultureDemo } from "@/components/chief-culture-officer/chief-culture-demo";

export const metadata: Metadata = {
  title: "Chief Culture Officer — Demo",
  description:
    "Presentation-style demo: an agent employee for startup culture—milestones, offsites, in-office games, and large events—with chat and dashboard.",
};

export default function RecruitingDemoRoute() {
  return <ChiefCultureDemo />;
}
