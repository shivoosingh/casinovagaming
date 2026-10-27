// Self-check for the pure Telegram bot helpers. Runs on plain Node:
//   node --experimental-strip-types scripts/check-telegram-bots.ts
// Covers command parsing, channel/env resolution (with the single-bot
// fallbacks), the admin/customer command gate, money formatting and the
// constant-time secret compare used by the webhook routes.
import assert from "node:assert/strict";

import { parseCommand } from "../src/lib/telegram/types.ts";
import { OPS_CHANNELS, resolveBotToken, resolveChatIds, splitChatIds } from "../src/lib/telegram/channels.ts";
import {
  ADMIN_COMMAND_PERMISSIONS,
  decideAdminCommand,
  decideCustomerCommand,
  money,
} from "../src/lib/telegram/bot-policy.ts";
import { safeEqual } from "../src/lib/telegram/verify.ts";

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

console.log(`check-telegram-bots: ${checks} checks ok`);
