/** Redeem is saved, but the game bot must not pay it until an admin approves. */
export const REDEEM_AWAITING_ADMIN = "AWAITING_ADMIN_APPROVAL";

export function isRedeemAwaitingAdmin(load: {
  load_type?: string | null;
  status?: string | null;
  admin_notes?: string | null;
}): boolean {
  return (
    load.load_type === "redeem" &&
    load.status === "cancelled" &&
    load.admin_notes === REDEEM_AWAITING_ADMIN
  );
}
