"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { FeaturesSectionMinimal } from "@/components/ui/bento-monochrome";

function BentoContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  return <FeaturesSectionMinimal sessionId={sessionId} />;
}

export default function BentoDemoPage() {
  return (
    <Suspense>
      <BentoContent />
    </Suspense>
  );
}
