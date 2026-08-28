import type { Locator } from "playwright";

const ACCOUNTISH =
  /account|username|user\s*name|login|nickname|nick\s*name|password|search|phone|email|mobile/i;
const AMOUNTISH =
  /amount|money|recharge|redeem|score|balance|coin|credit|withdraw/i;

/**
 * Pick the recharge/redeem amount field — never the Account/username field.
 * Game Vault / Vegas / Juwa dialogs often use "Please enter" on BOTH account and amount;
 * matching that alone puts text (or focus) in the wrong box.
 */
export async function findDialogAmountInput(
  dlg: Locator,
  kind: "recharge" | "redeem" = "recharge"
): Promise<Locator> {
  const kindLabel =
    kind === "recharge"
      ? /recharge\s*(balance|amount)?|amount|money|score|balance/i
      : /redeem\s*(balance|amount)?|withdraw|amount|money|score|balance/i;

  const byNumber = dlg.locator('input[type="number"]:not([readonly]):not([disabled])').first();
  if (await byNumber.isVisible().catch(() => false)) return byNumber;

  const labeled = dlg
    .locator(".el-form-item, .layui-form-item, .ant-form-item, .form-group")
    .filter({ hasText: kindLabel })
    .filter({ hasNotText: ACCOUNTISH })
    .locator('input:not([type="password"]):not([type="hidden"]):not([readonly]):not([disabled])')
    .first();
  if (await labeled.isVisible().catch(() => false)) return labeled;

  // Specific placeholders only — do NOT match bare "please enter"
  const byPh = dlg
    .getByPlaceholder(/amount|money|recharge|redeem|score|balance|coin|withdraw/i)
    .first();
  if (await byPh.isVisible().catch(() => false)) return byPh;

  const candidates = dlg.locator(
    'input.el-input__inner:not([type="password"]):not([readonly]):not([disabled]), input:not([type="password"]):not([type="hidden"]):not([type="checkbox"]):not([readonly]):not([disabled])'
  );
  const n = await candidates.count();
  for (let i = n - 1; i >= 0; i--) {
    const input = candidates.nth(i);
    if (!(await input.isVisible().catch(() => false))) continue;
    const ph = ((await input.getAttribute("placeholder").catch(() => "")) || "").trim();
    const name = ((await input.getAttribute("name").catch(() => "")) || "").trim();
    const id = ((await input.getAttribute("id").catch(() => "")) || "").trim();
    const aria = ((await input.getAttribute("aria-label").catch(() => "")) || "").trim();
    const blob = `${ph} ${name} ${id} ${aria}`;
    if (ACCOUNTISH.test(blob)) continue;
    if (AMOUNTISH.test(blob) || /please enter/i.test(ph) || !ph) {
      // Prefer amountish; allow generic "please enter" only as last editable non-account field from the end
      if (AMOUNTISH.test(blob) || i === n - 1) return input;
    }
  }

  // Last resort: last visible non-account input
  for (let i = n - 1; i >= 0; i--) {
    const input = candidates.nth(i);
    if (!(await input.isVisible().catch(() => false))) continue;
    const ph = ((await input.getAttribute("placeholder").catch(() => "")) || "").trim();
    const name = ((await input.getAttribute("name").catch(() => "")) || "").trim();
    if (ACCOUNTISH.test(`${ph} ${name}`)) continue;
    return input;
  }

  return byNumber;
}

/** True if the field holds the numeric amount (not a username / empty). */
export function amountFieldMatches(typed: string, amount: number): boolean {
  const cleaned = typed.replace(/[^0-9.]/g, "").trim();
  if (!cleaned) return false;
  if (/[a-z]/i.test(typed)) return false; // username leaked into amount
  return cleaned === String(amount) || Math.abs(Number(cleaned) - amount) < 0.001;
}

export async function assertAmountFilled(
  input: Locator,
  amount: number,
  kind: string
): Promise<void> {
  const typed = ((await input.inputValue().catch(() => "")) || "").trim();
  if (!amountFieldMatches(typed, amount)) {
    throw new Error(
      `${kind} amount field shows "${typed}" instead of "${amount}" — wrong input (account/username?)`
    );
  }
}

/** Layui iframe recharge/withdraw: prefer name=balance/money/amount, never username. */
export async function findLayuiAmountInput(
  scope: { locator: (sel: string) => Locator },
  kind: "recharge" | "redeem" | "withdraw" = "recharge"
): Promise<Locator> {
  const names =
    kind === "recharge"
      ? ["balance", "money", "amount", "recharge_balance", "score"]
      : ["balance", "money", "amount", "redeem_balance", "withdraw_balance", "score"];
  for (const name of names) {
    const loc = scope
      .locator(`input[name="${name}"]:not([type="hidden"]):not([readonly]):not([disabled])`)
      .first();
    if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) return loc;
  }
  const byNumber = scope.locator('input[type="number"]:not([readonly]):not([disabled])').first();
  if (await byNumber.isVisible().catch(() => false)) return byNumber;
  return scope.locator('input[name="balance"]').first();
}
