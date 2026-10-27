// Command-gating rules shared by the admin and customer bots, kept pure
// (no imports) so the self-check script can run them on plain Node.

/**
 * Permission each admin command requires. Keys are Casinova permission keys
 * (see ADMIN_MODULES in src/lib/data/admin-modules.ts). A command absent from
 * this map needs only staff access (help, dashboard, today, weekly, monthly).
 */
export const ADMIN_COMMAND_PERMISSIONS: Record<string, string> = {
  users: "users.manage",
  newusers: "users.manage",
  activeusers: "users.manage",
  banned: "users.manage",
  find: "users.manage",
  vip: "vip.manage",
  wallet: "requests.manage",
  deposits: "requests.manage",
  cashouts: "requests.manage",
  loads: "requests.manage",
  transactions: "requests.manage",
  finance: "requests.manage",
  campaigns: "promotions.manage",
  tickets: "support.manage",
  support: "support.manage",
  blogs: "cms.manage",
  seo: "cms.manage",
  kyc: "cms.manage",
  analytics: "analytics.read",
  traffic: "analytics.read",
  conversion: "analytics.read",
  revenue: "analytics.read",
  settings: "settings.manage",
};

/** Every command the admin bot answers (its /help text is built from this). */
export const ADMIN_COMMANDS: readonly string[] = [
  "start", "help",
  "dashboard", "today", "weekly", "monthly",
  "users", "newusers", "activeusers", "vip", "banned", "find",
  "wallet", "deposits", "cashouts", "loads", "transactions", "finance",
  "campaigns", "tickets", "support", "kyc",
  "blogs", "seo",
  "analytics", "traffic", "conversion", "revenue",
  "settings",
];

/** Every command the customer bot answers. */
export const CUSTOMER_COMMANDS: readonly string[] = [
  "start", "help",
  "wallet", "games", "loads", "deposits", "promos", "referral", "vip",
  "ticket", "status", "support",
  "register", "login", "faq", "terms", "privacy", "contact", "website",
];

export type CommandDecision = "unlinked" | "not_staff" | "unknown" | "forbidden" | "ok";

/** Order matters: an unlinked chat learns nothing about which commands exist. */
export function decideAdminCommand(input: {
  command: string;
  known: boolean;
  linked: boolean;
  isStaff: boolean;
  hasPermission: (permission: string) => boolean;
}): CommandDecision {
  if (!input.linked) return "unlinked";
  if (!input.isStaff) return "not_staff";
  if (!input.known) return "unknown";
  const permission = ADMIN_COMMAND_PERMISSIONS[input.command];
  if (permission && !input.hasPermission(permission)) return "forbidden";
  return "ok";
}

export function decideCustomerCommand(input: { known: boolean; linked: boolean }): "unlinked" | "unknown" | "ok" {
  if (!input.linked) return "unlinked";
  if (!input.known) return "unknown";
  return "ok";
}

/** "$1,234.50" — bot replies always show two decimals. */
export function money(n: number | string | null | undefined): string {
  const value = Number(n ?? 0);
  const safe = Number.isFinite(value) ? value : 0;
  return `$${safe.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
