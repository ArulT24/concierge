"use client";

import { ChatDemo } from "@/components/chat-demo";

import { DoubtfireSiteHeader, BertramStaticBg } from "./doubtfire-chrome";

export type DoubtfireChatSurface = "waitlist" | "kids_party";

export function DoubtfireChatPage({
  surface = "waitlist",
}: {
  surface?: DoubtfireChatSurface;
}) {
  return (
    <div
      className="fixed inset-0 flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden"
      style={{
        WebkitOverflowScrolling: "touch",
        backgroundColor: "#000000",
      }}
    >
      <BertramStaticBg />
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col isolate">
        <DoubtfireSiteHeader />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col px-4 pt-0 sm:px-6">
          <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
            <ChatDemo variant="authenticated" theme="doubtfire" surface={surface} />
          </div>
        </div>
      </div>
    </div>
  );
}
