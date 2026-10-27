import "server-only";

// Customer command bot (TELEGRAM_CUSTOMER_BOT_TOKEN). Players link their
// account from /dashboard/security, then check their wallet, game accounts,
// loads, deposits and tickets from Telegram. Every query is scoped to the
// linked user id; nothing here moves money. The same bot owns the public
// promo channel (promo-broadcast.ts), which is one-way.

import { rateLimit } from "@/lib/api/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminLink, tgEsc, tgNotify } from "@/lib/telegram";
import { CUSTOMER_COMMANDS, decideCustomerCommand, money, ticketSubjectFrom } from "@/lib/telegram/bot-policy";
import { consumeLinkCode, findLinkedUser } from "@/lib/telegram/linking";
import { tgReply } from "@/lib/telegram/send";
import { parseCommand, type TelegramUpdate } from "@/lib/telegram/types";

type CustomerCtx = { userId: string; chatId: number };
type Handler = (ctx: CustomerCtx, args: string) => Promise<string>;

const HELP_TEXT = [
  "<b>Casinova Gaming</b>",
  "/wallet: your balances",
  "/games /loads /deposits: your game accounts and recent activity",
  "/promos /vip /referral: offers and rewards",
  "/ticket &lt;message&gt; /status /support: help",
  "/register /login /faq /terms /privacy /contact /website: links",
].join("\n");

function db() {
  const client = createAdminClient();
  if (!client) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for the customer bot.");
  return client;
}

async function cmdWallet(ctx: CustomerCtx): Promise<string> {
  const { data } = await db()
    .from("profiles")
    .select("wallet_balance, cashout_wallet, vip_tier, vip_points")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (!data) return "Couldn't find your account.";
  return [
    "<b>Your wallet</b>",
    `Balance: ${money(data.wallet_balance)}`,
    `Cash-out: ${money(data.cashout_wallet)}`,
    `VIP: ${tgEsc(String(data.vip_tier ?? "bronze"))} (${Number(data.vip_points ?? 0).toLocaleString()} pts)`,
    adminLink("/dashboard/deposit", "Deposit"),
  ].join("\n");
}

async function cmdGames(ctx: CustomerCtx): Promise<string> {
  const { data } = await db()
    .from("game_load_requests")
    .select("game_slug, game_name, game_username, completed_at")
    .eq("user_id", ctx.userId)
    .eq("status", "completed")
    .in("load_type", ["create_account", "new_account"])
    .not("game_username", "is", null)
    .order("completed_at", { ascending: false });
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const row of data ?? []) {
    const slug = String(row.game_slug ?? row.game_name);
    if (seen.has(slug)) continue;
    seen.add(slug);
    lines.push(`• ${tgEsc(String(row.game_name))}: <code>${tgEsc(String(row.game_username))}</code>`);
  }
  if (!lines.length) return `You have no game accounts yet. ${adminLink("/dashboard/games", "Create one")}`;
  return ["<b>Your game accounts</b>", ...lines].join("\n");
}

async function cmdLoads(ctx: CustomerCtx): Promise<string> {
  const { data } = await db()
    .from("game_load_requests")
    .select("game_name, amount, load_type, status, created_at")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(5);
  const rows = data ?? [];
  if (!rows.length) return "No game loads yet.";
  return [
    "<b>Your recent game activity</b>",
    ...rows.map(
      (r) => `• ${r.created_at ? String(r.created_at).slice(0, 10) : ""} ${tgEsc(String(r.load_type))} ${money(r.amount)} → ${tgEsc(String(r.game_name))}: <i>${tgEsc(String(r.status))}</i>`
    ),
  ].join("\n");
}

async function cmdDeposits(ctx: CustomerCtx): Promise<string> {
  const { data } = await db()
    .from("deposit_requests")
    .select("amount, payment_method, game_name, status, created_at")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(5);
  const rows = data ?? [];
  if (!rows.length) return `No deposits yet. ${adminLink("/dashboard/deposit", "Make a deposit")}`;
  return [
    "<b>Your recent deposits</b>",
    ...rows.map(
      (r) => `• ${r.created_at ? String(r.created_at).slice(0, 10) : ""} ${money(r.amount)} ${tgEsc(String(r.payment_method))} → ${tgEsc(String(r.game_name))}: <i>${tgEsc(String(r.status))}</i>`
    ),
  ].join("\n");
}

async function cmdPromos(): Promise<string> {
  const { data } = await db()
    .from("promotions")
    .select("title, summary, bonus_amount")
    .eq("status", "active")
    .order("priority", { ascending: true })
    .limit(10);
  const rows = data ?? [];
  if (!rows.length) return `Nothing active right now, check back soon! ${adminLink("/promotions", "Promotions")}`;
  return [
    "<b>Current promotions</b>",
    ...rows.map((p) => `• <b>${tgEsc(String(p.title))}</b>${Number(p.bonus_amount) > 0 ? ` (${money(p.bonus_amount)})` : ""}${p.summary ? `\n${tgEsc(String(p.summary))}` : ""}`),
    adminLink("/promotions", "See all promotions"),
  ].join("\n");
}

async function cmdReferral(ctx: CustomerCtx): Promise<string> {
  const client = db();
  const [{ data: profile }, { count }] = await Promise.all([
    client.from("profiles").select("referral_code").eq("id", ctx.userId).maybeSingle(),
    client.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", ctx.userId),
  ]);
  if (!profile) return "Couldn't find your account.";
  return [
    "<b>Your referral code</b>",
    `<code>${tgEsc(String(profile.referral_code))}</code>`,
    `Friends joined: ${count ?? 0}`,
    adminLink("/dashboard/referrals", "Share & track referrals"),
  ].join("\n");
}

async function cmdVip(ctx: CustomerCtx): Promise<string> {
  const { data } = await db().from("profiles").select("vip_tier, vip_points").eq("id", ctx.userId).maybeSingle();
  if (!data) return "Couldn't find your account.";
  return [
    "<b>Your VIP status</b>",
    `Tier: ${tgEsc(String(data.vip_tier ?? "bronze"))}`,
    `Points: ${Number(data.vip_points ?? 0).toLocaleString()}`,
    adminLink("/dashboard/vip", "VIP details"),
  ].join("\n");
}

async function cmdStatus(ctx: CustomerCtx): Promise<string> {
  const { data } = await db()
    .from("support_tickets")
    .select("ticket_no, subject, status")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(5);
  const rows = data ?? [];
  if (!rows.length) return "You have no support tickets. Open one with /ticket &lt;message&gt;.";
  return ["<b>Your tickets</b>", ...rows.map((t) => `#${t.ticket_no} ${tgEsc(String(t.subject))}: <i>${tgEsc(String(t.status))}</i>`)].join("\n");
}

async function cmdTicket(ctx: CustomerCtx, args: string): Promise<string> {
  const subject = ticketSubjectFrom(args);
  if (!subject) return "Tell us a bit more. Usage: /ticket &lt;what's going on&gt;";
  const body = args.trim();

  const client = db();
  const { data: ticket, error } = await client
    .from("support_tickets")
    .insert({ user_id: ctx.userId, subject, category: "other" })
    .select("id, ticket_no")
    .single();
  if (error || !ticket) return "Could not open a ticket. Try again in a moment.";

  await client.from("ticket_messages").insert({ ticket_id: ticket.id, sender_id: ctx.userId, is_staff: false, body });
  await tgNotify(
    "users",
    `🎫 <b>New ticket #${ticket.ticket_no}</b> (via Telegram): ${tgEsc(subject)}\n` + adminLink(`/admin/support/${ticket.id}`, "👉 View")
  );
  return `Ticket #${ticket.ticket_no} opened. We'll reply soon; check /status for updates.`;
}

const STATIC: Record<string, string> = {
  register: `Create your account: ${adminLink("/register", "Sign up")}`,
  login: `Log in here: ${adminLink("/login", "Log in")}`,
  faq: `Answers to common questions: ${adminLink("/help", "Help center")}`,
  terms: adminLink("/terms", "Terms & Conditions"),
  privacy: adminLink("/privacy", "Privacy Policy"),
  contact: adminLink("/contact", "Contact us"),
  website: adminLink("/", "casinovasgaming.com"),
  support: `Open a ticket with /ticket &lt;message&gt;, or chat with us at ${adminLink("/dashboard/messages", "Messages")}.`,
};

const COMMANDS: Record<string, Handler> = {
  help: async () => HELP_TEXT,
  wallet: cmdWallet,
  games: cmdGames,
  loads: cmdLoads,
  deposits: cmdDeposits,
  promos: cmdPromos,
  referral: cmdReferral,
  vip: cmdVip,
  status: cmdStatus,
  ticket: cmdTicket,
};
for (const [name, text] of Object.entries(STATIC)) COMMANDS[name] = async () => text;

const UNLINKED_TEXT = "This chat isn't linked to a Casinova account yet. Open Dashboard → Security, tap Link Telegram, then tap the link it gives you.";

async function handleStart(token: string, chatId: number, telegramUserId: number, username: string | undefined, code: string): Promise<void> {
  if (!code) {
    await tgReply(token, chatId, UNLINKED_TEXT);
    return;
  }
  const result = await consumeLinkCode({ purpose: "player", code, telegramUserId, chatId, telegramUsername: username });
  await tgReply(token, chatId, result.ok ? "Linked! Send /help to see what you can ask." : result.error);
}

export async function handleCustomerUpdate(update: TelegramUpdate): Promise<void> {
  const token = process.env.TELEGRAM_CUSTOMER_BOT_TOKEN?.trim();
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

  if (!rateLimit(`tg-player:${telegramUserId}`, 20, 60_000).ok) {
    await tgReply(token, chatId, "Slow down a bit. Try again in a minute.");
    return;
  }

  const userId = await findLinkedUser("player", telegramUserId);
  const decision = decideCustomerCommand({
    known: CUSTOMER_COMMANDS.includes(command) && command in COMMANDS,
    linked: Boolean(userId),
  });

  if (decision === "unlinked") {
    await tgReply(token, chatId, UNLINKED_TEXT);
    return;
  }
  if (decision === "unknown") {
    await tgReply(token, chatId, `Unknown command.\n${HELP_TEXT}`);
    return;
  }

  try {
    const text = await COMMANDS[command]({ userId: userId!, chatId }, args);
    await tgReply(token, chatId, text);
  } catch (err) {
    console.error("[telegram] customer command failed:", command, err);
    await tgReply(token, chatId, "Something went wrong running that command.");
  }
}
