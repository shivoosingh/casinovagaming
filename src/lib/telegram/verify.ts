// Constant-time string compare for the webhook secret header. Pure (no Node
// crypto import) so it runs in any runtime and in the self-check script.
/**
 * Whether a webhook delivery may be handled. Fails closed: with no secret
 * configured nothing is accepted, so an unconfigured route can never be
 * driven by an unauthenticated POST.
 */
export function webhookAccepts(headerValue: string | null | undefined, secret: string | undefined): boolean {
  if (!secret) return false;
  return safeEqual(headerValue ?? "", secret);
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
