import type { Session } from "next-auth";

/** Headers for FastAPI /api/chat when INTERNAL_CHAT_SECRET is set in production. */
export function internalChatHeaders(): Record<string, string> {
  const secret = process.env.INTERNAL_CHAT_SECRET?.trim();
  if (!secret) return {};
  return { "X-Internal-Chat-Secret": secret };
}

export function chatProxyHeaders(session: Session | null): Record<string, string> {
  const headers: Record<string, string> = {
    ...internalChatHeaders(),
  };
  const email = session?.user?.email?.trim();
  if (email) headers["X-User-Email"] = email;
  return headers;
}
