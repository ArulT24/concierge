import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { AppSessionProvider } from "@/components/session-provider";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "bertram",
  description: "Plan your event with Bertram and join the waitlist.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppSessionProvider>{children}</AppSessionProvider>
      </body>
    </html>
  );
}
