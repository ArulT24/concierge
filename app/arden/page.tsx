import { permanentRedirect } from "next/navigation";

/** Old path; bookmarks and shared links resolve to the canonical home waitlist. */
export default function ArdenLegacyPath() {
  permanentRedirect("/");
}
