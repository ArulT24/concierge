import { redirect } from "next/navigation";

/**
 * Marketing default: Arden-style waitlist / planning demo.
 * Keeps a single primary funnel surface at /arden (and / via redirect).
 */
export default function Home() {
  redirect("/arden");
}
