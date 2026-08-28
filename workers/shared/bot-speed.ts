/** Scale down intentional pauses. Game panels are remote — this won't make them "instant", but cuts bot dead-time a lot. */
export function botWaitMs(ms: number): number {
  const scale = Number(process.env.BOT_WAIT_SCALE ?? 0.3);
  const s = Number.isFinite(scale) && scale > 0 ? Math.min(scale, 1) : 0.3;
  return Math.max(40, Math.floor(ms * s));
}

export async function botSleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, botWaitMs(ms)));
}
