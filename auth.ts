import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

function authSecret(): string | undefined {
  const fromEnv =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "development") {
    // Lets `npm run dev` work before you copy .env.example; never use in production.
    return "dev-only-auth-secret-replace-with-openssl-rand-base64-32";
  }
  return undefined;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret(),
  providers: [Google],
  trustHost: true,
});
