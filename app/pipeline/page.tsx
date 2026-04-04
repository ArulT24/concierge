import { Suspense } from "react";

import { PipelineClient } from "./pipeline-client";

export default function PipelinePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background px-4 py-10 text-muted-foreground">
          Loading…
        </div>
      }
    >
      <PipelineClient />
    </Suspense>
  );
}
