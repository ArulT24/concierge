"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

type AppSessionProviderProps = {
  children: React.ReactNode;
};

export function AppSessionProvider({ children }: AppSessionProviderProps) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
