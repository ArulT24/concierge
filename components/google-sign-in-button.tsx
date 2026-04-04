"use client";

import { signIn } from "next-auth/react";

type GoogleSignInButtonProps = {
  className?: string;
  children?: React.ReactNode;
};

export function GoogleSignInButton({
  className,
  children,
}: GoogleSignInButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => signIn("google", { callbackUrl: "/chat" })}
    >
      {children ?? "Continue with Google"}
    </button>
  );
}
