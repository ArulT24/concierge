import { Suspense } from "react";

import SearchDashboardClient from "./search-dashboard-client";

export default function SearchDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background px-4 py-10 text-muted-foreground">
          <div className="mx-auto max-w-5xl">Loading dashboard…</div>
        </div>
      }
    >
      <SearchDashboardClient />
    </Suspense>
  );
}
