import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-16 text-white">
      <Card className="w-full max-w-md border-white/20 bg-black text-white shadow-none">
        <CardHeader className="space-y-3 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Coming soon
          </CardTitle>
          <CardDescription className="text-sm text-white/60">
            We&apos;re building something new. Check back shortly.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-3 border-t border-white/10 px-6 pb-6 pt-4 sm:flex-row sm:justify-center">
          <Button
            asChild
            variant="outline"
            className="w-full border-white/30 bg-transparent text-white hover:bg-white hover:text-black sm:w-auto"
          >
            <Link href="/demo">Open demo</Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
