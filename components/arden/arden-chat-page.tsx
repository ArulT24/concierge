"use client";

import { ChatDemo } from "@/components/chat-demo";

import { ArdenSiteHeader, BertramStaticBg } from "./arden-chrome";

export function ArdenChatPage() {
  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        WebkitOverflowScrolling: "touch",
        backgroundColor: "#000000",
      }}
    >
      <BertramStaticBg />
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col isolate">
        <ArdenSiteHeader />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col px-4 pt-0 sm:px-6">
          <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
            <ChatDemo variant="authenticated" theme="arden" />
          </div>
        </div>
      </div>
    </div>
  );
}
