import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

/** Account, auth and API surfaces: never indexable. */
const PRIVATE = [
  "/dashboard",
  "/dashboard/",
  "/admin",
  "/admin/",
  "/chat",
  "/chat/",
  "/api/",
  "/auth/",
  "/login",
  "/register",
  "/reset-password",
];

/**
 * AI search and assistant crawlers, allowed explicitly so a future "*" change
 * cannot silently block them. Discovery bots (OAI-SearchBot, PerplexityBot,
 * Claude-SearchBot) are what get the site cited in AI answers; the training
 * bots (GPTBot, ClaudeBot, Google-Extended) are allowed too: a sweepstakes
 * guide site gains more from being known than from being withheld.
 */
const AI_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "Google-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL.replace(/^https?:\/\//, ""),
  };
}
