import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-16 text-white">
      <Card className="w-full max-w-lg border-white/20 bg-black text-white shadow-none">
        <CardHeader className="space-y-5 text-left sm:text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Coming soon
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed text-white/60">
            Sign in with Google to chat with Bertram, share what you need for
            your event, and join the waitlist.
          </CardDescription>
          <GoogleSignInButton className="mx-auto w-full max-w-sm rounded-xl bg-violet-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-400 sm:w-auto sm:px-8" />
          <p className="border-t border-white/10 pt-5 text-sm leading-relaxed text-white/80">
            Think of Mrs. Doubtfire in the kitchen: someone who steps in, keeps
            the chaos off your plate, and makes sure everything feels handled
            with care. That&apos;s the idea here for your kid&apos;s party, we
            listen to what you want, chase the details you don&apos;t have time
            for, and help the day come together so you can focus on being there
            with your family.
          </p>
        </CardHeader>
      </Card>
    </main>
  );
}
