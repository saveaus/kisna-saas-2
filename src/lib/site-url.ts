import "server-only";
import { headers } from "next/headers";

/**
 * The app's public address, for links in emails. Set NEXT_PUBLIC_SITE_URL
 * in production; in development it falls back to the request's host.
 */
export async function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
}
