// Self-check for the pure Telegram bot helpers. Runs on plain Node:
//   node --experimental-strip-types scripts/check-telegram-bots.ts
// Covers command parsing, channel/env resolution (with the single-bot
// fallbacks), the admin/customer command gate, money formatting and the
// constant-time secret compare used by the webhook routes.
import assert from "node:assert/strict";

import { parseCommand } from "../src/lib/telegram/types.ts";
import {
  OPS_CHANNELS,
  isOpsConfigured,
  isPromoConfigured,
  resolveBotToken,
  resolveChatIds,
  splitChatIds,
} from "../src/lib/telegram/channels.ts";
import {
  ADMIN_COMMAND_PERMISSIONS,
  decideAdminCommand,
  decideCustomerCommand,
  money,
} from "../src/lib/telegram/bot-policy.ts";
import { safeEqual } from "../src/lib/telegram/verify.ts";
import { LINK_CODE_TTL_MINUTES, deepLinkFor, linkCodeStatus, newLinkCode } from "../src/lib/telegram/link-codes.ts";

let checks = 0;
function check(name: string, fn: () => void) {
  fn();
  checks += 1;
  console.log(`ok - ${name}`);
}

// ── parseCommand ─────────────────────────────────────────────────────────
check("parseCommand strips the @bot suffix and keeps the rest as args", () => {
  assert.deepEqual(parseCommand("/wallet@CasinovaBot  abc def"), { command: "wallet", args: "abc def" });
});
check("parseCommand returns null for plain text", () => {
  assert.equal(parseCommand("hello"), null);
});
check("parseCommand lower-cases the command", () => {
  assert.deepEqual(parseCommand("/Start code1"), { command: "start", args: "code1" });
});
check("parseCommand gives empty args for a bare command", () => {
  assert.deepEqual(parseCommand("/help"), { command: "help", args: "" });
});

// ── channels ─────────────────────────────────────────────────────────────
check("splitChatIds trims and drops empty entries", () => {
  assert.deepEqual(splitChatIds(" 1, 2 ,,3"), ["1", "2", "3"]);
  assert.deepEqual(splitChatIds(undefined), []);
  assert.deepEqual(splitChatIds("   "), []);
});
check("OPS_CHANNELS lists the five WinSweeps channels", () => {
  assert.deepEqual([...OPS_CHANNELS], ["finance", "users", "sweepstakes", "errors", "reports"]);
});
check("every ops channel falls back to TELEGRAM_ADMIN_CHAT_ID", () => {
  const env = { TELEGRAM_ADMIN_CHAT_ID: "-1" };
  for (const c of OPS_CHANNELS) assert.deepEqual(resolveChatIds(env, c), ["-1"], c);
  assert.deepEqual(resolveChatIds(env, "admin"), ["-1"]);
});
check("a configured channel id wins over the fallback, others still fall back", () => {
  const env = { TELEGRAM_ADMIN_CHAT_ID: "-1", TELEGRAM_CHAT_FINANCE: "-2" };
  assert.deepEqual(resolveChatIds(env, "finance"), ["-2"]);
  assert.deepEqual(resolveChatIds(env, "users"), ["-1"]);
});
check("promo resolves TELEGRAM_CHAT_PROMO, then TELEGRAM_PROMO_CHAT_ID, then the admin chat", () => {
  assert.deepEqual(resolveChatIds({ TELEGRAM_ADMIN_CHAT_ID: "-1", TELEGRAM_PROMO_CHAT_ID: "-5", TELEGRAM_CHAT_PROMO: "-9" }, "promo"), ["-9"]);
  assert.deepEqual(resolveChatIds({ TELEGRAM_ADMIN_CHAT_ID: "-1", TELEGRAM_PROMO_CHAT_ID: "-5" }, "promo"), ["-5"]);
  assert.deepEqual(resolveChatIds({ TELEGRAM_ADMIN_CHAT_ID: "-1" }, "promo"), ["-1"]);
  assert.deepEqual(resolveChatIds({}, "promo"), []);
});
check("resolveBotToken: promo prefers the customer bot, falls back to the ops bot", () => {
  assert.equal(resolveBotToken({ TELEGRAM_BOT_TOKEN: "ops", TELEGRAM_CUSTOMER_BOT_TOKEN: "cust" }, "promo"), "cust");
  assert.equal(resolveBotToken({ TELEGRAM_BOT_TOKEN: "ops" }, "promo"), "ops");
  assert.equal(resolveBotToken({ TELEGRAM_BOT_TOKEN: "ops", TELEGRAM_CUSTOMER_BOT_TOKEN: "cust" }, "finance"), "ops");
  assert.equal(resolveBotToken({ TELEGRAM_BOT_TOKEN: "  ", TELEGRAM_CUSTOMER_BOT_TOKEN: "" }, "promo"), null);
  assert.equal(resolveBotToken({}, "users"), null);
});

check("isOpsConfigured needs the ops token plus an admin/finance/users/errors chat", () => {
  assert.equal(isOpsConfigured({ TELEGRAM_BOT_TOKEN: "ops", TELEGRAM_ADMIN_CHAT_ID: "-1" }), true);
  assert.equal(isOpsConfigured({ TELEGRAM_BOT_TOKEN: "ops", TELEGRAM_CHAT_USERS: "-3" }), true);
  assert.equal(isOpsConfigured({ TELEGRAM_BOT_TOKEN: "ops", TELEGRAM_CHAT_REPORTS: "-4" }), false);
  assert.equal(isOpsConfigured({ TELEGRAM_ADMIN_CHAT_ID: "-1" }), false);
  assert.equal(isOpsConfigured({}), false);
});
check("isPromoConfigured needs a promo-capable token plus a promo chat (with fallbacks)", () => {
  assert.equal(isPromoConfigured({ TELEGRAM_CUSTOMER_BOT_TOKEN: "cust", TELEGRAM_CHAT_PROMO: "-9" }), true);
  assert.equal(isPromoConfigured({ TELEGRAM_BOT_TOKEN: "ops", TELEGRAM_ADMIN_CHAT_ID: "-1" }), true);
  assert.equal(isPromoConfigured({ TELEGRAM_CUSTOMER_BOT_TOKEN: "cust" }), false);
  assert.equal(isPromoConfigured({ TELEGRAM_CHAT_PROMO: "-9" }), false);
});

// ── bot policy ───────────────────────────────────────────────────────────
check("decideAdminCommand: unlinked first", () => {
  assert.equal(decideAdminCommand({ command: "users", known: true, linked: false, isStaff: true, hasPermission: () => true }), "unlinked");
});
check("decideAdminCommand: not_staff before unknown", () => {
  assert.equal(decideAdminCommand({ command: "nope", known: false, linked: true, isStaff: false, hasPermission: () => true }), "not_staff");
});
check("decideAdminCommand: unknown command", () => {
  assert.equal(decideAdminCommand({ command: "nope", known: false, linked: true, isStaff: true, hasPermission: () => true }), "unknown");
});
check("decideAdminCommand: forbidden only for a command in the permission map", () => {
  assert.equal(ADMIN_COMMAND_PERMISSIONS.users, "users.manage");
  assert.equal(decideAdminCommand({ command: "users", known: true, linked: true, isStaff: true, hasPermission: () => false }), "forbidden");
  assert.equal(decideAdminCommand({ command: "help", known: true, linked: true, isStaff: true, hasPermission: () => false }), "ok");
  assert.equal(decideAdminCommand({ command: "dashboard", known: true, linked: true, isStaff: true, hasPermission: () => false }), "ok");
});
check("decideAdminCommand: ok when the permission is held", () => {
  assert.equal(decideAdminCommand({ command: "finance", known: true, linked: true, isStaff: true, hasPermission: (p) => p === "requests.manage" }), "ok");
});
check("permission map uses Casinova permission keys", () => {
  assert.equal(ADMIN_COMMAND_PERMISSIONS.wallet, "requests.manage");
  assert.equal(ADMIN_COMMAND_PERMISSIONS.tickets, "support.manage");
  assert.equal(ADMIN_COMMAND_PERMISSIONS.kyc, "cms.manage");
  assert.equal(ADMIN_COMMAND_PERMISSIONS.analytics, "analytics.read");
  assert.equal(ADMIN_COMMAND_PERMISSIONS.settings, "settings.manage");
  assert.equal(ADMIN_COMMAND_PERMISSIONS.vip, "vip.manage");
  assert.equal(ADMIN_COMMAND_PERMISSIONS.campaigns, "promotions.manage");
});
check("decideCustomerCommand branches", () => {
  assert.equal(decideCustomerCommand({ known: true, linked: false }), "unlinked");
  assert.equal(decideCustomerCommand({ known: false, linked: true }), "unknown");
  assert.equal(decideCustomerCommand({ known: true, linked: true }), "ok");
});
check("money formats dollars with two decimals and thousands separators", () => {
  assert.equal(money(1234.5), "$1,234.50");
  assert.equal(money("7"), "$7.00");
  assert.equal(money(null), "$0.00");
  assert.equal(money(undefined), "$0.00");
});

// ── verify ───────────────────────────────────────────────────────────────
check("safeEqual compares secrets", () => {
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abc", "abd"), false);
  assert.equal(safeEqual("a", "ab"), false);
  assert.equal(safeEqual("", ""), true);
});

// ── link codes ───────────────────────────────────────────────────────────
const now = new Date("2026-10-27T12:00:00Z");
const future = new Date(now.getTime() + 60_000).toISOString();
const past = new Date(now.getTime() - 60_000).toISOString();
check("linkCodeStatus: a live, unconsumed code for the right purpose is ok", () => {
  assert.equal(linkCodeStatus({ purpose: "player", expires_at: future, consumed_at: null }, "player", now), "ok");
});
check("linkCodeStatus: missing row is invalid", () => {
  assert.equal(linkCodeStatus(null, "player", now), "invalid");
});
check("linkCodeStatus: an admin code cannot link the player bot", () => {
  assert.equal(linkCodeStatus({ purpose: "admin", expires_at: future, consumed_at: null }, "player", now), "wrong_purpose");
});
check("linkCodeStatus: consumed and expired codes are refused", () => {
  assert.equal(linkCodeStatus({ purpose: "player", expires_at: future, consumed_at: past }, "player", now), "consumed");
  assert.equal(linkCodeStatus({ purpose: "player", expires_at: past, consumed_at: null }, "player", now), "expired");
});
check("newLinkCode strips dashes from a uuid; deepLinkFor builds the t.me start link", () => {
  assert.equal(newLinkCode("1b4e28ba-2fa1-11d2-883f-0016d3cca427"), "1b4e28ba2fa111d2883f0016d3cca427");
  assert.equal(deepLinkFor("CasinovaBot", "abc123"), "https://t.me/CasinovaBot?start=abc123");
  assert.equal(deepLinkFor("@CasinovaBot", "abc123"), "https://t.me/CasinovaBot?start=abc123");
  assert.equal(LINK_CODE_TTL_MINUTES, 10);
});

console.log(`check-telegram-bots: ${checks} checks ok`);
