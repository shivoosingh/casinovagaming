// Integration test for supabase/fresh-migrations/040-deposit-reward-awards.sql.
//
// Runs the real migration inside an in-memory Postgres (PGlite) against a copy
// of the production table shapes and the live trigger functions, then exercises
// every deposit outcome. It never connects to Supabase.
//
//   npm install --no-save @electric-sql/pglite     (or set PGLITE_DIR to a folder that has it)
//   node --experimental-strip-types scripts/check-deposit-rewards.mjs
//
// Limitation: PGlite is a single connection, so two transactions cannot truly
// overlap here. Duplicate delivery is tested back to back; protection against
// overlapping delivery rests on the primary key, the unique index and the row
// and advisory locks, which are asserted to exist.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

async function loadPGlite() {
  const dir = process.env.PGLITE_DIR;
  if (dir) {
    const require = createRequire(path.join(path.resolve(dir), "noop.js"));
    return (await import(pathToFileURL(require.resolve("@electric-sql/pglite")).href)).PGlite;
  }
  return (await import("@electric-sql/pglite")).PGlite;
}

const { VIP_TIERS } = await import(pathToFileURL(path.resolve("src/lib/constants.ts")).href);
const RATES = Object.fromEntries(VIP_TIERS.map((t) => [t.id, t.referralRate]));
const RATES_JSON = JSON.stringify(RATES);

const PGlite = await loadPGlite();
const db = new PGlite();

// --- Production-shaped schema (columns and constraints as queried from the live database).
await db.exec(`
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;

  CREATE TABLE public.profiles (
    id uuid PRIMARY KEY, email text NOT NULL DEFAULT '', full_name text,
    role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
    vip_tier text NOT NULL DEFAULT 'bronze' CHECK (vip_tier IN ('bronze','silver','gold','platinum')),
    vip_points integer NOT NULL DEFAULT 0, referred_by uuid,
    referral_code text, is_suspended boolean NOT NULL DEFAULT false, kyc_status text NOT NULL DEFAULT 'unverified',
    wallet_balance numeric NOT NULL DEFAULT 0, bonus_wallet numeric NOT NULL DEFAULT 0,
    cashout_wallet numeric NOT NULL DEFAULT 0, bonus_redeem_wallet numeric NOT NULL DEFAULT 0
  );
  CREATE TABLE public.deposit_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_slug text, game_name text NOT NULL DEFAULT 'test', payment_method text NOT NULL DEFAULT 'cashapp',
    amount numeric, proof_url text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','rejected')),
    admin_notes text, wallet_credited boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE public.wallet_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, amount numeric NOT NULL,
    wallet_type text NOT NULL CHECK (wallet_type IN ('current','bonus','cashout','bonus_redeem')),
    transaction_type text NOT NULL CHECK (transaction_type IN ('credit','debit','adjustment')),
    source text NOT NULL, description text, created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, title text NOT NULL, message text NOT NULL,
    type text NOT NULL DEFAULT 'info' CHECK (type IN ('info','success','warning','promo')), is_read boolean NOT NULL DEFAULT false
  );

  -- Live trigger functions, copied from production.
  CREATE FUNCTION public.update_vip_tier() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    IF NEW.vip_points >= 5000 THEN NEW.vip_tier = 'platinum';
    ELSIF NEW.vip_points >= 2000 THEN NEW.vip_tier = 'gold';
    ELSIF NEW.vip_points >= 500 THEN NEW.vip_tier = 'silver';
    ELSE NEW.vip_tier = 'bronze'; END IF;
    RETURN NEW;
  END $$;
  CREATE TRIGGER vip_tier_update BEFORE UPDATE OF vip_points ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_vip_tier();

  CREATE FUNCTION public.protect_wallet_columns() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    IF (OLD.wallet_balance IS DISTINCT FROM NEW.wallet_balance OR OLD.bonus_wallet IS DISTINCT FROM NEW.bonus_wallet
        OR OLD.cashout_wallet IS DISTINCT FROM NEW.cashout_wallet OR OLD.bonus_redeem_wallet IS DISTINCT FROM NEW.bonus_redeem_wallet) THEN
      IF current_setting('app.wallet_update', true) = 'true' THEN RETURN NEW; END IF;
      IF coalesce(auth.jwt() ->> 'role', '') = 'service_role' THEN RETURN NEW; END IF;
      IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        NEW.wallet_balance := OLD.wallet_balance; NEW.bonus_wallet := OLD.bonus_wallet;
        NEW.cashout_wallet := OLD.cashout_wallet; NEW.bonus_redeem_wallet := OLD.bonus_redeem_wallet;
      END IF;
    END IF;
    RETURN NEW;
  END $$;
  CREATE TRIGGER protect_wallet_columns_trigger BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_wallet_columns();

  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "read" ON public.profiles FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
  GRANT SELECT, UPDATE ON public.profiles TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
`);

// --- The migration under test, exactly as it will be applied. Run twice: it must be re-runnable.
const migration = fs.readFileSync("supabase/fresh-migrations/040-deposit-reward-awards.sql", "utf8");
await db.exec(migration);
await db.exec(migration);

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const profile = async (id) => one("SELECT vip_points, vip_tier, wallet_balance::float8 AS wallet, referred_by FROM profiles WHERE id = $1", [id]);

async function newUser({ points = 0, referredBy = null, role = "user" } = {}) {
  const id = uuid();
  await db.query("INSERT INTO profiles (id, vip_points, referred_by, role) VALUES ($1, 0, $2, $3)", [id, referredBy, role]);
  if (points) await db.query("UPDATE profiles SET vip_points = $2 WHERE id = $1", [id, points]); // through the tier trigger
  return id;
}
async function newDeposit(userId, amount, { status = "completed", credited = true, card = true } = {}) {
  const id = uuid();
  const proof = card ? `paydora/dep_${id}` : `proofs/${id}.png`;
  await db.query(
    "INSERT INTO deposit_requests (id, user_id, amount, proof_url, status, wallet_credited) VALUES ($1,$2,$3,$4,$5,$6)",
    [id, userId, amount, proof, status, credited]
  );
  return id;
}
const award = async (depositId, rates = RATES_JSON) =>
  (await one("SELECT public.award_deposit_rewards($1, $2::jsonb) AS r", [depositId, rates])).r;
const ledgerCount = async () => Number((await one("SELECT count(*) AS n FROM deposit_reward_awards")).n);

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push([true, name]);
  } catch (err) {
    results.push([false, `${name}\n      ${String(err.message).split("\n")[0]}`]);
  }
}
/** Run statements as a player session; anything it changes is rolled back. */
async function asPlayer(userId, fn) {
  await db.exec("BEGIN");
  try {
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true)", [
      userId,
      JSON.stringify({ sub: userId, role: "authenticated" }),
    ]);
    await db.exec("SET LOCAL ROLE authenticated");
    return await fn();
  } finally {
    await db.exec("ROLLBACK");
  }
}

// ---------------------------------------------------------------- VIP points
await test("card deposit: points = round(amount), ledger row written", async () => {
  const u = await newUser();
  const r = await award(await newDeposit(u, 10.99));
  assert.equal(r.status, "awarded");
  assert.equal(r.vip_points, 11);
  assert.equal((await profile(u)).vip_points, 11);
  const row = await one("SELECT vip_points, deposit_amount::float8 AS a, referral_bonus::float8 AS b, source FROM deposit_reward_awards WHERE user_id = $1", [u]);
  assert.deepEqual(row, { vip_points: 11, a: 10.99, b: 0, source: "live" });
});

await test("manual deposit (no card id) is awarded the same way", async () => {
  const u = await newUser();
  const r = await award(await newDeposit(u, 14, { card: false }));
  assert.equal(r.status, "awarded");
  assert.equal((await profile(u)).vip_points, 14);
});

await test("VIP point rule: minimum 1, half rounds up, cents ignored", async () => {
  for (const [amount, expected] of [[0.4, 1], [1.49, 1], [14.5, 15], [19.99, 20], [199.99, 200], [500, 500]]) {
    const u = await newUser();
    const r = await award(await newDeposit(u, amount));
    assert.equal(r.vip_points, expected, `amount ${amount}`);
    assert.equal(expected, Math.max(1, Math.round(Math.round(amount * 100) / 100)), "matches the application rule");
  }
});

await test("tier is recalculated when points cross a threshold", async () => {
  const u = await newUser({ points: 490 });
  assert.equal((await profile(u)).vip_tier, "bronze");
  await award(await newDeposit(u, 10.99));
  assert.deepEqual([(await profile(u)).vip_points, (await profile(u)).vip_tier], [501, "silver"]);
});

// ------------------------------------------------------- ineligible deposits
for (const [label, opts] of [
  ["pending", { status: "pending", credited: false }],
  ["processing", { status: "processing", credited: false }],
  ["rejected / failed", { status: "rejected", credited: false }],
  ["refunded (credited, then set to rejected)", { status: "rejected", credited: true }],
  ["completed but wallet not credited", { status: "completed", credited: false }],
]) {
  await test(`${label} deposit earns nothing`, async () => {
    const referrer = await newUser();
    const u = await newUser({ referredBy: referrer });
    const before = await ledgerCount();
    const r = await award(await newDeposit(u, 50, opts));
    assert.equal(r.status, "not_eligible");
    assert.equal((await profile(u)).vip_points, 0);
    assert.equal((await profile(referrer)).wallet, 0);
    assert.equal(await ledgerCount(), before);
  });
}

await test("zero, negative and missing amounts earn nothing", async () => {
  const u = await newUser();
  for (const amount of [0, -5, null]) assert.equal((await award(await newDeposit(u, amount))).status, "not_eligible");
  assert.equal((await profile(u)).vip_points, 0);
});

await test("unknown deposit id is reported, not an error", async () => {
  assert.equal((await award(uuid())).status, "not_found");
  assert.equal((await one("SELECT public.award_deposit_rewards(NULL, $1::jsonb) AS r", [RATES_JSON])).r.status, "not_found");
});

// ------------------------------------------------------------- idempotency
await test("duplicate webhook: second and third award change nothing", async () => {
  const referrer = await newUser();
  const u = await newUser({ referredBy: referrer });
  const d = await newDeposit(u, 49.99);
  assert.equal((await award(d)).status, "awarded");
  const snapshot = [await profile(u), await profile(referrer), await ledgerCount()];
  assert.equal((await award(d)).status, "already_awarded");
  assert.equal((await award(d)).status, "already_awarded");
  assert.deepEqual([await profile(u), await profile(referrer), await ledgerCount()], snapshot);
  const txs = await one("SELECT count(*)::int AS n FROM wallet_transactions WHERE user_id = $1 AND source = 'referral_bonus'", [referrer]);
  assert.equal(txs.n, 1);
});

await test("requests fired together for one deposit award once", async () => {
  const u = await newUser();
  const d = await newDeposit(u, 24.99);
  const statuses = (await Promise.all([award(d), award(d), award(d), award(d)])).map((r) => r.status).sort();
  assert.deepEqual(statuses, ["already_awarded", "already_awarded", "already_awarded", "awarded"]);
  assert.equal((await profile(u)).vip_points, 25);
});

await test("the same card payment cannot be recorded as two deposits", async () => {
  const u = await newUser();
  await db.query("INSERT INTO deposit_requests (user_id, amount, proof_url, status, wallet_credited) VALUES ($1, 20, 'paydora/dep_same', 'completed', true)", [u]);
  await assert.rejects(
    db.query("INSERT INTO deposit_requests (user_id, amount, proof_url, status, wallet_credited) VALUES ($1, 20, 'paydora/dep_same', 'completed', true)", [u]),
    /uq_deposit_requests_paydora_proof|duplicate key/
  );
  // Manual proofs are not constrained by this index.
  await db.query("INSERT INTO deposit_requests (user_id, amount, proof_url) VALUES ($1, 20, 'proofs/a.png'), ($1, 20, 'proofs/a.png')", [u]);
});

await test("a failed award leaves no partial state (all or nothing)", async () => {
  const referrer = await newUser();
  const u = await newUser({ referredBy: referrer });
  const d = await newDeposit(u, 100);
  // Force the referral credit to fail after points were added inside the function.
  await db.exec(`CREATE FUNCTION public.fail_referral_tx() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated failure'; END $$;
                 CREATE TRIGGER fail_referral_tx BEFORE INSERT ON public.wallet_transactions FOR EACH ROW EXECUTE FUNCTION public.fail_referral_tx();`);
  const before = await ledgerCount();
  await assert.rejects(award(d), /simulated failure/);
  await db.exec("DROP TRIGGER fail_referral_tx ON public.wallet_transactions; DROP FUNCTION public.fail_referral_tx();");
  assert.equal((await profile(u)).vip_points, 0);
  assert.equal((await profile(referrer)).wallet, 0);
  assert.equal(await ledgerCount(), before);
  // The retry then succeeds in full.
  const r = await award(d);
  assert.deepEqual([r.status, r.vip_points, r.referral_bonus], ["awarded", 100, 5]);
});

// ------------------------------------------------------------ referral share
await test("no referral attribution: points only", async () => {
  const u = await newUser();
  const r = await award(await newDeposit(u, 30));
  assert.equal(r.referral_bonus, 0);
  assert.equal(r.referrer_id, null);
  assert.equal(Number((await one("SELECT count(*) AS n FROM wallet_transactions WHERE source = 'referral_bonus' AND description LIKE $1", [`%${u}%`])).n), 0);
});

for (const tier of VIP_TIERS) {
  await test(`referral share at ${tier.name}: ${tier.referralRate * 100}% of the first deposit`, async () => {
    const referrer = await newUser({ points: tier.minPoints });
    assert.equal((await profile(referrer)).vip_tier, tier.id);
    const u = await newUser({ referredBy: referrer });
    const d = await newDeposit(u, 49.99);
    const r = await award(d);
    const expected = Math.round(49.99 * tier.referralRate * 100) / 100;
    assert.equal(r.referral_bonus, expected);
    assert.equal(r.referrer_id, referrer);
    assert.equal((await profile(referrer)).wallet, expected);
    assert.equal((await profile(referrer)).vip_points, tier.minPoints, "the referrer earns money, not points, from the deposit");
    const tx = await one("SELECT amount::float8 AS amount, wallet_type, transaction_type, description FROM wallet_transactions WHERE user_id = $1 AND source = 'referral_bonus'", [referrer]);
    assert.deepEqual([tx.amount, tx.wallet_type, tx.transaction_type], [expected, "current", "credit"]);
    assert.match(tx.description, new RegExp(`from first deposit ${d} \\(referred user ${u}\\)`));
    const note = await one("SELECT title, type FROM notifications WHERE user_id = $1", [referrer]);
    assert.deepEqual(note, { title: "Referral bonus", type: "success" });
    const row = await one("SELECT referrer_id, referral_rate::float8 AS rate, referral_bonus::float8 AS bonus FROM deposit_reward_awards WHERE deposit_request_id = $1", [d]);
    assert.deepEqual(row, { referrer_id: referrer, rate: tier.referralRate, bonus: expected });
  });
}

await test("only the first completed deposit pays a referral share", async () => {
  const referrer = await newUser();
  const u = await newUser({ referredBy: referrer });
  await award(await newDeposit(u, 20));
  const second = await award(await newDeposit(u, 200));
  assert.deepEqual([second.status, second.vip_points, second.referral_bonus], ["awarded", 200, 0]);
  assert.equal((await profile(referrer)).wallet, 1);
});

await test("a player with earlier completed deposits does not trigger a share later", async () => {
  const referrer = await newUser();
  const u = await newUser({ referredBy: referrer });
  await newDeposit(u, 15); // completed before this fix, never awarded
  const r = await award(await newDeposit(u, 60));
  assert.equal(r.referral_bonus, 0);
  assert.equal((await profile(referrer)).wallet, 0);
});

await test("a share already paid by the old flow is not paid again", async () => {
  const referrer = await newUser();
  const u = await newUser({ referredBy: referrer });
  await db.query(
    "INSERT INTO wallet_transactions (user_id, amount, wallet_type, transaction_type, source, description) VALUES ($1, 0.7, 'current', 'credit', 'referral_bonus', $2)",
    [referrer, `Referral bonus $0.70 from first deposit old (referred user ${u})`]
  );
  const r = await award(await newDeposit(u, 14));
  assert.deepEqual([r.status, r.vip_points, r.referral_bonus], ["awarded", 14, 0]);
  assert.equal((await profile(referrer)).wallet, 0);
});

await test("self-referral and a deleted referrer pay nothing", async () => {
  const self = await newUser();
  await db.query("UPDATE profiles SET referred_by = id WHERE id = $1", [self]);
  assert.equal((await award(await newDeposit(self, 40))).referral_bonus, 0);
  assert.equal((await profile(self)).wallet, 0);

  const ghost = await newUser({ referredBy: uuid() });
  const r = await award(await newDeposit(ghost, 40));
  assert.deepEqual([r.status, r.referral_bonus], ["awarded", 0]);
});

await test("missing or invalid rates never pay a share; unknown tier uses the bronze rate", async () => {
  for (const rates of ["{}", '{"bronze":0}', '{"bronze":-0.5}', '{"bronze":1.5}', '{"bronze":""}']) {
    const referrer = await newUser();
    const u = await newUser({ referredBy: referrer });
    const r = await award(await newDeposit(u, 100), rates);
    assert.deepEqual([r.status, r.referral_bonus], ["awarded", 0], rates);
    assert.equal((await profile(referrer)).wallet, 0, rates);
  }
  const referrer = await newUser({ points: 600 }); // silver
  const u = await newUser({ referredBy: referrer });
  assert.equal((await award(await newDeposit(u, 100), '{"bronze":0.05}')).referral_bonus, 5);
});

await test("a refund after the award does not create a second award or remove history", async () => {
  const u = await newUser();
  const d = await newDeposit(u, 30);
  await award(d);
  await db.query("UPDATE deposit_requests SET status = 'rejected', admin_notes = 'Paydora refunded this deposit' WHERE id = $1", [d]);
  assert.equal((await award(d)).status, "not_eligible");
  assert.equal(Number((await one("SELECT count(*) AS n FROM deposit_reward_awards WHERE deposit_request_id = $1", [d])).n), 1);
});

// ------------------------------------------------------- access and tamper
await test("players cannot call the award function", async () => {
  const u = await newUser();
  const d = await newDeposit(u, 50);
  await assert.rejects(asPlayer(u, () => award(d)), /permission denied/);
  await db.exec("BEGIN; SET LOCAL ROLE anon;");
  await assert.rejects(award(d), /permission denied/);
  await db.exec("ROLLBACK");
  assert.equal((await profile(u)).vip_points, 0);
});

await test("players cannot read or write the awards ledger", async () => {
  const u = await newUser();
  const d = await newDeposit(u, 50);
  await assert.rejects(asPlayer(u, () => db.query("SELECT * FROM deposit_reward_awards")), /permission denied/);
  await assert.rejects(
    asPlayer(u, () => db.query("INSERT INTO deposit_reward_awards (deposit_request_id, user_id, deposit_amount, vip_points) VALUES ($1,$2,50,50)", [d, u])),
    /permission denied/
  );
});

await test("a player's attempt to edit their own points, tier or referrer is ignored", async () => {
  const other = await newUser();
  const u = await newUser({ points: 20 });
  const seen = await asPlayer(u, async () => {
    await db.query("UPDATE profiles SET vip_points = 999999, vip_tier = 'platinum', referred_by = $2, full_name = 'New Name' WHERE id = $1", [u, other]);
    return one("SELECT vip_points, vip_tier, referred_by, full_name FROM profiles WHERE id = $1", [u]);
  });
  assert.deepEqual(seen, { vip_points: 20, vip_tier: "bronze", referred_by: null, full_name: "New Name" });
});

await test("admins and server code can still adjust points", async () => {
  const admin = await newUser({ role: "admin" });
  const u = await newUser();
  const viaAdmin = await asPlayer(admin, async () => {
    await db.query("UPDATE profiles SET vip_points = vip_points + 50 WHERE id = $1", [u]);
    return (await one("SELECT vip_points FROM profiles WHERE id = $1", [u])).vip_points;
  });
  assert.equal(viaAdmin, 50);
  await db.exec("BEGIN; SET LOCAL ROLE service_role;");
  await db.query("UPDATE profiles SET vip_points = vip_points + 10 WHERE id = $1", [u]);
  const viaService = (await one("SELECT vip_points FROM profiles WHERE id = $1", [u])).vip_points;
  await db.exec("ROLLBACK");
  assert.equal(viaService, 10);
});

await test("server code (service_role) can call the award function", async () => {
  const u = await newUser();
  const d = await newDeposit(u, 12.99);
  await db.exec("BEGIN; SET LOCAL ROLE service_role;");
  const r = await award(d);
  await db.exec("COMMIT");
  assert.deepEqual([r.status, r.vip_points], ["awarded", 13]);
});

await test("guards against overlapping delivery exist in the schema", async () => {
  const pk = await one("SELECT count(*)::int AS n FROM pg_constraint WHERE conrelid = 'public.deposit_reward_awards'::regclass AND contype = 'p'");
  const idx = await one("SELECT count(*)::int AS n FROM pg_indexes WHERE indexname IN ('uq_deposit_requests_paydora_proof','uq_deposit_reward_awards_one_referral_per_user')");
  const src = (await one("SELECT prosrc FROM pg_proc WHERE proname = 'award_deposit_rewards'")).prosrc;
  assert.equal(pk.n, 1);
  assert.equal(idx.n, 2);
  assert.match(src, /FOR UPDATE/);
  assert.match(src, /pg_advisory_xact_lock/);
});

const failed = results.filter(([ok]) => !ok);
for (const [ok, name] of results) console.log(`${ok ? "  ok  " : " FAIL "} ${name}`);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
