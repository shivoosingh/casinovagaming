import "server-only";

// Admin command bot (TELEGRAM_ADMIN_BOT_TOKEN). Staff link their account from
// /admin/telegram, then ask for business numbers in Telegram. Every command
// is gated on the same role_permissions the web admin uses (bot-policy.ts)
// and audited like an admin action. Reads only; nothing here moves money.

import { adminDb, writeAudit } from "@/lib/actions/admin/core";
import { rateLimit } from "@/lib/api/rate-limit";
import { can, getStaffContextForUserId, type StaffContext } from "@/lib/data/admin";
import { getDashboardStats } from "@/lib/data/admin-stats";
import { adminLink, tgEsc } from "@/lib/telegram";
import { ADMIN_COMMANDS, decideAdminCommand, money } from "@/lib/telegram/bot-policy";
import { consumeLinkCode, findLinkedUser } from "@/lib/telegram/linking";
import { tgReply } from "@/lib/telegram/send";
import { parseCommand, type TelegramUpdate } from "@/lib/telegram/types";

type AdminCtx = { staff: StaffContext; chatId: number };
type Handler = (ctx: AdminCtx, args: string) => Promise<string>;

const HELP_TEXT = [
  "<b>Casinova Admin</b>",
  "/dashboard /today /weekly /monthly: business pulse",
  "/users /newusers /activeusers /vip /banned /find &lt;email|name&gt;: players",
  "/wallet &lt;email|name&gt; /deposits /cashouts /loads /transactions /finance: money",
  "/campaigns /tickets /kyc: operations",
  "/blogs /seo: content",
  "/analytics /traffic /conversion /revenue: numbers",
  "/settings: site settings",
].join("\n");

const DAY_MS = 86_400_000;

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  wallet_balance: number | null;
  cashout_wallet: number | null;
  vip_tier: string | null;
  vip_points: number | null;
  kyc_status: string | null;
  is_suspended: boolean | null;
  created_at: string | null;
};

function who(p: { full_name?: string | null; email?: string | null }): string {
  const name = p.full_name?.trim();
  const email = p.email ?? "";
  if (name && email) return `${tgEsc(name)} (${tgEsc(email)})`;
  return tgEsc(name || email || "player");
}

async function findProfile(query: string): Promise<ProfileRow | null> {
  const db = adminDb();
  const columns = "id, email, full_name, wallet_balance, cashout_wallet, vip_tier, vip_points, kyc_status, is_suspended, created_at";
  const byEmail = await db.from("profiles").select(columns).ilike("email", query).limit(1).maybeSingle();
  if (byEmail.data) return byEmail.data as ProfileRow;
  const byName = await db.from("profiles").select(columns).ilike("full_name", `%${query}%`).limit(1).maybeSingle();
  return (byName.data as ProfileRow | null) ?? null;
}

async function namesById(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const { data } = await adminDb().from("profiles").select("id, email, full_name").in("id", unique);
  return new Map((data ?? []).map((p) => [p.id as string, who(p)]));
}

// ── pulse ────────────────────────────────────────────────────────────────

async function cmdDashboard(windowMs: number, label: string): Promise<string> {
  const s = await getDashboardStats(windowMs);
  return [
    `<b>Casinova: ${label}</b>`,
    `Players: ${s.totalUsers.toLocaleString()} (+${s.newUsersInWindow.toLocaleString()} new)`,
    `Wallet credits issued: ${money(s.coinsIssuedInWindow)}`,
    `Deposit requests pending: ${s.pendingRequests.toLocaleString()}`,
    `Open tickets: ${s.openTickets.toLocaleString()}`,
  ].join("\n");
}

// ── players ──────────────────────────────────────────────────────────────

async function cmdUsers(): Promise<string> {
  const db = adminDb();
  const [{ count }, { data: recent }] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("profiles").select("email, full_name, created_at").order("created_at", { ascending: false }).limit(5),
  ]);
  const lines = (recent ?? []).map((u) => `• ${who(u)}`);
  return [`<b>Players</b>: ${(count ?? 0).toLocaleString()} total`, "Newest:", ...lines].join("\n");
}

async function cmdNewUsers(): Promise<string> {
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const { data } = await adminDb()
    .from("profiles")
    .select("email, full_name")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(15);
  const rows = data ?? [];
  if (!rows.length) return "No new signups in the last 24h.";
  return [`<b>New signups (24h)</b>: ${rows.length}`, ...rows.map((u) => `• ${who(u)}`)].join("\n");
}

async function cmdActiveUsers(): Promise<string> {
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const { count } = await adminDb().from("profiles").select("id", { count: "exact", head: true }).gte("last_seen_at", since);
  return `<b>Active players (24h)</b>: ${(count ?? 0).toLocaleString()}`;
}

async function cmdVip(): Promise<string> {
  const { data } = await adminDb().from("profiles").select("vip_tier");
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const tier = (row.vip_tier as string | null) ?? "bronze";
    counts.set(tier, (counts.get(tier) ?? 0) + 1);
  }
  const order = ["bronze", "silver", "gold", "platinum"];
  const tiers = [...counts.keys()].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  if (!tiers.length) return "No players yet.";
  return ["<b>VIP tiers</b>", ...tiers.map((t) => `• ${tgEsc(t)}: ${counts.get(t)}`)].join("\n");
}

async function cmdBanned(): Promise<string> {
  const { data, count } = await adminDb()
    .from("profiles")
    .select("email, full_name", { count: "exact" })
    .eq("is_suspended", true)
    .order("updated_at", { ascending: false })
    .limit(15);
  const rows = data ?? [];
  if (!rows.length) return "No suspended players.";
  return [`<b>Suspended players</b>: ${(count ?? rows.length).toLocaleString()}`, ...rows.map((u) => `• ${who(u)}`)].join("\n");
}

async function cmdFind(_ctx: AdminCtx, args: string): Promise<string> {
  const query = args.trim();
  if (!query) return "Usage: /find &lt;email or name&gt;";
  const p = await findProfile(query);
  if (!p) return `No player found for "${tgEsc(query)}".`;
  return [
    `<b>${who(p)}</b>`,
    `Wallet: ${money(p.wallet_balance)}, Cash-out: ${money(p.cashout_wallet)}`,
    `VIP: ${tgEsc(p.vip_tier ?? "bronze")} (${(p.vip_points ?? 0).toLocaleString()} pts)`,
    `KYC: ${tgEsc(p.kyc_status ?? "unverified")}${p.is_suspended ? ", <b>suspended</b>" : ""}`,
    `Joined: ${p.created_at ? p.created_at.slice(0, 10) : "?"}`,
    adminLink(`/admin/users/${p.id}`, "👉 Open in admin"),
  ].join("\n");
}

// ── money ────────────────────────────────────────────────────────────────

async function cmdWallet(_ctx: AdminCtx, args: string): Promise<string> {
  const query = args.trim();
  if (!query) return "Usage: /wallet &lt;email or name&gt;";
  const p = await findProfile(query);
  if (!p) return `No player found for "${tgEsc(query)}".`;
  return [
    `<b>${who(p)}</b>`,
    `Wallet: ${money(p.wallet_balance)}`,
    `Cash-out: ${money(p.cashout_wallet)}`,
    `VIP: ${tgEsc(p.vip_tier ?? "bronze")} (${(p.vip_points ?? 0).toLocaleString()} pts)`,
  ].join("\n");
}

async function cmdDeposits(): Promise<string> {
  const db = adminDb();
  const [{ count: pending }, { data }] = await Promise.all([
    db.from("deposit_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]),
    db
      .from("deposit_requests")
      .select("user_id, amount, payment_method, status, game_name")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const rows = data ?? [];
  const names = await namesById(rows.map((r) => r.user_id as string));
  const lines = rows.map(
    (r) => `• ${names.get(r.user_id as string) ?? "?"}: ${money(r.amount)} ${tgEsc(String(r.payment_method))} → ${tgEsc(String(r.game_name))} <i>${tgEsc(String(r.status))}</i>`
  );
  return [
    `<b>Deposit requests</b>: ${(pending ?? 0).toLocaleString()} pending`,
    ...(lines.length ? ["Latest:", ...lines] : ["No deposit requests yet."]),
    adminLink("/admin/deposits", "👉 Review deposits"),
  ].join("\n");
}

async function cmdCashouts(): Promise<string> {
  const { data } = await adminDb()
    .from("profiles")
    .select("email, full_name, cashout_wallet")
    .gt("cashout_wallet", 0)
    .order("cashout_wallet", { ascending: false })
    .limit(10);
  const rows = data ?? [];
  if (!rows.length) return "No cash-out balances waiting.";
  const total = rows.reduce((sum, r) => sum + Number(r.cashout_wallet ?? 0), 0);
  return [
    `<b>Cash-out balances</b>: ${money(total)} across the top ${rows.length}`,
    ...rows.map((r) => `• ${who(r)}: ${money(r.cashout_wallet)}`),
    adminLink("/admin/payouts", "👉 Pay out"),
  ].join("\n");
}

async function cmdLoads(): Promise<string> {
  const { data, count } = await adminDb()
    .from("game_load_requests")
    .select("user_id, game_name, amount, load_type, status", { count: "exact" })
    .in("status", ["pending", "processing"])
    .order("created_at", { ascending: false })
    .limit(10);
  const rows = data ?? [];
  if (!rows.length) return "No game loads in flight.";
  const names = await namesById(rows.map((r) => r.user_id as string));
  return [
    `<b>Game loads in flight</b>: ${(count ?? rows.length).toLocaleString()}`,
    ...rows.map(
      (r) => `• ${names.get(r.user_id as string) ?? "?"}: ${tgEsc(String(r.load_type))} ${money(r.amount)} → ${tgEsc(String(r.game_name))} <i>${tgEsc(String(r.status))}</i>`
    ),
    adminLink("/admin/game-loads", "👉 Wallet loads"),
  ].join("\n");
}

async function cmdTransactions(): Promise<string> {
  const { data } = await adminDb()
    .from("wallet_transactions")
    .select("user_id, amount, wallet_type, transaction_type, source, description")
    .order("created_at", { ascending: false })
    .limit(10);
  const rows = data ?? [];
  if (!rows.length) return "No wallet transactions yet.";
  const names = await namesById(rows.map((r) => r.user_id as string));
  return [
    "<b>Recent wallet transactions</b>",
    ...rows.map(
      (r) =>
        `• ${names.get(r.user_id as string) ?? "?"}: ${tgEsc(String(r.transaction_type))} ${money(r.amount)} (${tgEsc(String(r.wallet_type))}, ${tgEsc(String(r.source))})${r.description ? ` ${tgEsc(String(r.description))}` : ""}`
    ),
  ].join("\n");
}

async function cmdFinance(): Promise<string> {
  const db = adminDb();
  const since24h = new Date(Date.now() - DAY_MS).toISOString();
  const [{ data: deposits }, { data: owed }, { count: loads }] = await Promise.all([
    db
      .from("wallet_transactions")
      .select("amount")
      .eq("source", "deposit")
      .eq("transaction_type", "credit")
      .gte("created_at", since24h)
      .limit(5000),
    db.from("profiles").select("cashout_wallet").gt("cashout_wallet", 0),
    db.from("game_load_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]),
  ]);
  const depositTotal = (deposits ?? []).reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  const owedTotal = (owed ?? []).reduce((sum, r) => sum + Number(r.cashout_wallet ?? 0), 0);
  return [
    "<b>Finance overview</b>",
    `Deposits credited (24h): ${(deposits ?? []).length} (${money(depositTotal)})`,
    `Cash-out owed: ${money(owedTotal)}`,
    `Game loads in flight: ${(loads ?? 0).toLocaleString()}`,
  ].join("\n");
}

// ── operations ───────────────────────────────────────────────────────────

async function cmdCampaigns(): Promise<string> {
  const { data } = await adminDb()
    .from("promotions")
    .select("title, bonus_amount, is_featured")
    .eq("status", "active")
    .order("priority", { ascending: true })
    .limit(10);
  const rows = data ?? [];
  if (!rows.length) return "No active promotions.";
  return [
    "<b>Active promotions</b>",
    ...rows.map((p) => `• ${tgEsc(String(p.title))}${Number(p.bonus_amount) > 0 ? `: ${money(p.bonus_amount)}` : ""}${p.is_featured ? " ⭐" : ""}`),
  ].join("\n");
}

async function cmdTickets(): Promise<string> {
  const { data, count } = await adminDb()
    .from("support_tickets")
    .select("id, ticket_no, subject, status", { count: "exact" })
    .in("status", ["open", "pending", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(10);
  const rows = data ?? [];
  if (!rows.length) return "No open tickets.";
  return [
    `<b>Open tickets</b>: ${(count ?? rows.length).toLocaleString()}`,
    ...rows.map((t) => `• #${t.ticket_no} ${tgEsc(String(t.subject))}: <i>${tgEsc(String(t.status))}</i>`),
    adminLink("/admin/support", "👉 Support inbox"),
  ].join("\n");
}

async function cmdKyc(): Promise<string> {
  const { data, count } = await adminDb()
    .from("kyc_submissions")
    .select("user_email, user_name, created_at", { count: "exact" })
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(10);
  const rows = data ?? [];
  if (!rows.length) return "No KYC submissions waiting.";
  return [
    `<b>KYC pending</b>: ${(count ?? rows.length).toLocaleString()}`,
    ...rows.map((k) => `• ${who({ full_name: k.user_name as string | null, email: k.user_email as string | null })}`),
    adminLink("/admin/kyc", "👉 Review KYC"),
  ].join("\n");
}

// ── content ──────────────────────────────────────────────────────────────

async function cmdBlogs(): Promise<string> {
  const { data } = await adminDb()
    .from("blog_posts")
    .select("title, is_published")
    .order("created_at", { ascending: false })
    .limit(10);
  const rows = data ?? [];
  if (!rows.length) return "No blog posts yet.";
  return ["<b>Recent blog posts</b>", ...rows.map((b) => `• ${tgEsc(String(b.title))}${b.is_published ? "" : " (draft)"}`)].join("\n");
}

async function cmdSeo(): Promise<string> {
  const db = adminDb();
  const [{ count: blogs }, { count: cities }] = await Promise.all([
    db.from("blog_posts").select("id", { count: "exact", head: true }).eq("is_published", true),
    db.from("geo_cities").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);
  return ["<b>SEO</b>", `Published blog posts: ${blogs ?? 0}`, `Active city pages: ${cities ?? 0}`].join("\n");
}

// ── numbers ──────────────────────────────────────────────────────────────

async function cmdAnalytics(): Promise<string> {
  const db = adminDb();
  const since30d = new Date(Date.now() - 30 * DAY_MS).toISOString();
  const [{ count: signups }, { data: deposits }, { count: referrals }] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since30d),
    db
      .from("wallet_transactions")
      .select("amount")
      .eq("source", "deposit")
      .eq("transaction_type", "credit")
      .gte("created_at", since30d)
      .limit(5000),
    db.from("referrals").select("id", { count: "exact", head: true }).gte("created_at", since30d),
  ]);
  const depositTotal = (deposits ?? []).reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  return [
    "<b>Analytics (30d)</b>",
    `Signups: ${signups ?? 0}`,
    `Deposits credited: ${(deposits ?? []).length} (${money(depositTotal)})`,
    `Referrals: ${referrals ?? 0}`,
  ].join("\n");
}

async function cmdSettings(): Promise<string> {
  const { data } = await adminDb().from("site_settings").select("key, value").order("key").limit(20);
  const rows = data ?? [];
  if (!rows.length) return "No settings configured.";
  return [
    "<b>Site settings</b>",
    ...rows.map((s) => `• ${tgEsc(String(s.key))}: ${typeof s.value === "boolean" ? (s.value ? "on" : "off") : tgEsc(JSON.stringify(s.value))}`),
  ].join("\n");
}

// ── router ───────────────────────────────────────────────────────────────

const COMMANDS: Record<string, Handler> = {
  help: async () => HELP_TEXT,
  dashboard: () => cmdDashboard(DAY_MS, "Today"),
  today: () => cmdDashboard(DAY_MS, "Today"),
  weekly: () => cmdDashboard(7 * DAY_MS, "This week"),
  monthly: () => cmdDashboard(30 * DAY_MS, "This month"),
  users: cmdUsers,
  newusers: cmdNewUsers,
  activeusers: cmdActiveUsers,
  vip: cmdVip,
  banned: cmdBanned,
  find: cmdFind,
  wallet: cmdWallet,
  deposits: cmdDeposits,
  cashouts: cmdCashouts,
  loads: cmdLoads,
  transactions: cmdTransactions,
  finance: cmdFinance,
  campaigns: cmdCampaigns,
  tickets: cmdTickets,
  support: cmdTickets,
  kyc: cmdKyc,
  blogs: cmdBlogs,
  seo: cmdSeo,
  analytics: cmdAnalytics,
  traffic: cmdAnalytics,
  conversion: cmdAnalytics,
  revenue: cmdAnalytics,
  settings: cmdSettings,
};

const UNLINKED_TEXT = "This chat isn't linked to a Casinova staff account. Generate a link from Admin → Telegram Bot and tap it.";

async function handleStart(token: string, chatId: number, telegramUserId: number, username: string | undefined, code: string): Promise<void> {
  if (!code) {
    await tgReply(token, chatId, UNLINKED_TEXT);
    return;
  }
  const result = await consumeLinkCode({ purpose: "admin", code, telegramUserId, chatId, telegramUsername: username });
  await tgReply(token, chatId, result.ok ? "Linked! Send /help to see what you can ask." : result.error);
}

export async function handleAdminUpdate(update: TelegramUpdate): Promise<void> {
  const token = process.env.TELEGRAM_ADMIN_BOT_TOKEN?.trim();
  if (!token) return;
  const msg = update.message;
  const telegramUserId = msg?.from?.id;
  if (!msg?.text || !telegramUserId) return;

  const chatId = msg.chat.id;
  const parsed = parseCommand(msg.text);
  if (!parsed) return;
  const { command, args } = parsed;

  if (command === "start") {
    await handleStart(token, chatId, telegramUserId, msg.from?.username, args);
    return;
  }

  if (!rateLimit(`tg-admin:${telegramUserId}`, 30, 60_000).ok) {
    await tgReply(token, chatId, "Slow down a bit. Try again in a minute.");
    return;
  }

  const userId = await findLinkedUser("admin", telegramUserId);
  const staff = userId ? await getStaffContextForUserId(userId) : null;
  const decision = decideAdminCommand({
    command,
    known: ADMIN_COMMANDS.includes(command) && command in COMMANDS,
    linked: Boolean(userId),
    isStaff: Boolean(staff),
    hasPermission: (p) => (staff ? can(staff, p) : false),
  });

  switch (decision) {
    case "unlinked":
      await tgReply(token, chatId, UNLINKED_TEXT);
      return;
    case "not_staff":
      await tgReply(token, chatId, "You no longer have staff access.");
      return;
    case "unknown":
      await tgReply(token, chatId, `Unknown command.\n${HELP_TEXT}`);
      return;
    case "forbidden":
      await tgReply(token, chatId, "You don't have permission to do that.");
      return;
    case "ok":
      break;
  }

  try {
    const text = await COMMANDS[command]({ staff: staff!, chatId }, args);
    await tgReply(token, chatId, text);
    await writeAudit({ actorId: staff!.userId, action: `telegram.${command}`, entityType: "telegram_bot" });
  } catch (err) {
    console.error("[telegram] admin command failed:", command, err);
    await tgReply(token, chatId, "Something went wrong running that command.");
  }
}
