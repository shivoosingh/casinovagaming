import crypto from "crypto";

export interface DollarPayConfig {
  baseUrl: string;
  merchantId: string;
  merchantKey: string;
  tenantDomain?: string;
}

export type DollarPayChannel = "1" | "2" | "3" | "4"; // 1: Cash App, 2: Apple Pay, 3: Google Pay, 4: Credit Card
export type DollarPayoutType = "cashapp" | "paypal" | "chime";

export const DOLLARPAY_CHANNEL_NAMES: Record<DollarPayChannel, string> = {
  "1": "Cash App",
  "2": "Apple Pay",
  "3": "Google Pay",
  "4": "Credit Card",
};

export const DOLLARPAY_SUPPORTED_AMOUNTS_WALLET: string[] = [
  "4.99", "5.99", "6.99", "7.99", "8.99", "9.99", "10.99", "11.99",
  "12.99", "13.99", "14.99", "17.99", "19.99", "22.99", "24.99", "29.99",
  "30.99", "32.99", "39.99", "49.99", "54.99", "59.99", "99.99", "109.99",
  "124.99", "129.99", "149.99", "199.99", "249.99", "299.99", "399.99", "499.99"
];

export const DOLLARPAY_SUPPORTED_AMOUNTS_CARD: string[] = [
  "9.99", "10.99", "11.99", "12.99", "13.99", "14.99", "17.99",
  "19.99", "22.99", "24.99", "29.99", "30.99", "32.99",
  "39.99", "49.99", "54.99", "59.99", "99.99", "109.99",
  "124.99", "129.99", "149.99", "199.99"
];

export function getDollarPayConfig(): DollarPayConfig {
  const baseUrl = process.env.DOLLARPAY_API_BASE_URL || "https://mh.dollarpaywallet.com";
  const merchantId = process.env.DOLLARPAY_MERCHANT_ID || "1097176799";
  const merchantKey = process.env.DOLLARPAY_MERCHANT_KEY || "bd4bd89b1a726ac54ff4107b42aca8a3";
  const tenantDomain = process.env.DOLLARPAY_TENANT_DOMAIN || "www.casinovasgaming.com";


  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    merchantId,
    merchantKey,
    tenantDomain,
  };
}

/**
 * Calculates MD5 signature for DollarPay API requests and webhooks.
 * Sort parameters ASCII ascending, join with &, append &key=MERCHANT_KEY, and return uppercase MD5.
 */
export function generateDollarPaySignature(
  params: Record<string, string | number | undefined | null>,
  merchantKey: string
): string {
  const keys = Object.keys(params)
    .filter((k) => k !== "sign" && k !== "X-Tenant-Domain" && params[k] !== undefined && params[k] !== null && params[k] !== "")
    .sort();

  const str = keys.map((k) => `${k}=${String(params[k])}`).join("&");
  const signStr = `${str}&key=${merchantKey}`;

  return crypto.createHash("md5").update(signStr, "utf8").digest("hex").toUpperCase();
}

/**
 * Validates whether an incoming webhook payload matches the DollarPay MD5 signature.
 */
export function verifyDollarPaySignature(
  params: Record<string, string | number | undefined | null>,
  signature: string,
  merchantKey: string
): boolean {
  if (!signature) return false;
  const expectedSign = generateDollarPaySignature(params, merchantKey);
  return expectedSign === signature.toUpperCase();
}

export interface CreatePayInOrderParams {
  orderSn: string;
  userName: string;
  amount: string;
  isPay?: DollarPayChannel; // Default "1"
  notifyUrl: string;
  returnUrl?: string;
  ip: string;
  deviceId: string;
}

export interface CreatePayInOrderResult {
  status: string; // "00000" indicates success
  msg: string;
  pay_url?: string;
  amount?: string;
  fee?: string;
  outer_order_sn?: string;
  merchant_id?: string;
  sign?: string;
}

/**
 * Create a DollarPay Pay-in Collection Order (/api/payment/pay)
 */
export async function createDollarPayInOrder(
  params: CreatePayInOrderParams
): Promise<CreatePayInOrderResult> {
  const config = getDollarPayConfig();
  const isPay = params.isPay || "1";

  // Validate amount tier
  const allowedAmounts = isPay === "4" ? DOLLARPAY_SUPPORTED_AMOUNTS_CARD : DOLLARPAY_SUPPORTED_AMOUNTS_WALLET;
  const formattedAmount = Number(params.amount).toFixed(2);
  if (!allowedAmounts.includes(formattedAmount)) {
    throw new Error(`Amount $${params.amount} is not a supported DollarPay tier for payment type ${isPay}. Supported amounts: ${allowedAmounts.join(", ")}`);
  }

  const payload: Record<string, string> = {
    merchant_id: config.merchantId,
    order_sn: params.orderSn,
    user_name: params.userName,
    is_cash: "1",
    is_pay: isPay,
    amount: formattedAmount,
    notify_url: params.notifyUrl,
    ip: params.ip,
    device_id: params.deviceId,
  };

  if (params.returnUrl) {
    // max length 128 chars according to docs
    payload.return_url = params.returnUrl.slice(0, 128);
  }

  payload.sign = generateDollarPaySignature(payload, config.merchantKey);

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (config.tenantDomain) {
    // Bare domain only (e.g. www.casinovasgaming.com)
    headers["X-Tenant-Domain"] = config.tenantDomain.replace(/^https?:\/\//i, "").split("/")[0];
  }

  const body = new URLSearchParams(payload).toString();
  const res = await fetch(`${config.baseUrl}/api/payment/pay`, {
    method: "POST",
    headers,
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DollarPay HTTP Error ${res.status}: ${text}`);
  }

  const json: CreatePayInOrderResult = await res.json();
  return json;
}

export interface QueryPayInOrderResult {
  status: string; // "00000" success
  pay_status: string; // "0": Processing, "1": Successful, "5": Failed
  msg: string;
  primary_amount?: string;
  amount?: string;
  user_name?: string;
  outer_order_sn?: string;
  merchant_id?: string;
  sign?: string;
}

/**
 * Query a Pay-in Order Status (/api/payment/query)
 */
export async function queryDollarPayInOrder(
  outerOrderSn: string
): Promise<QueryPayInOrderResult> {
  const config = getDollarPayConfig();
  const payload: Record<string, string> = {
    merchant_id: config.merchantId,
    outer_order_sn: outerOrderSn,
  };

  payload.sign = generateDollarPaySignature(payload, config.merchantKey);

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (config.tenantDomain) {
    headers["X-Tenant-Domain"] = config.tenantDomain.replace(/^https?:\/\//i, "").split("/")[0];
  }

  const body = new URLSearchParams(payload).toString();
  const res = await fetch(`${config.baseUrl}/api/payment/query`, {
    method: "POST",
    headers,
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DollarPay HTTP Error ${res.status}: ${text}`);
  }

  return await res.json();
}

export interface CreatePayoutOrderParams {
  payoutType: DollarPayoutType;
  orderSn: string;
  accountNo: string; // Cash App tag, PayPal email, or Chime tag
  amount: string;
  notifyUrl: string;
}

export interface CreatePayoutOrderResult {
  status: string; // "00000"
  msg: string;
  amount?: string;
  fee?: string;
  outer_order_sn?: string;
  merchant_id?: string;
  sign?: string;
}

/**
 * Create a Payout Order (Cash App: /api/pay/pay, PayPal: /api/pay/palpalpay, Chime: /api/pay/chimepay)
 */
export async function createDollarPayoutOrder(
  params: CreatePayoutOrderParams
): Promise<CreatePayoutOrderResult> {
  const config = getDollarPayConfig();
  let path = "/api/pay/pay";
  if (params.payoutType === "paypal") {
    path = "/api/pay/palpalpay";
  } else if (params.payoutType === "chime") {
    path = "/api/pay/chimepay";
  }

  const formattedAmount = Number(params.amount).toFixed(2);
  const payload: Record<string, string> = {
    merchant_id: config.merchantId,
    order_sn: params.orderSn,
    account_no: params.accountNo,
    amount: formattedAmount,
    notify_url: params.notifyUrl,
  };

  payload.sign = generateDollarPaySignature(payload, config.merchantKey);

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (config.tenantDomain) {
    headers["X-Tenant-Domain"] = config.tenantDomain.replace(/^https?:\/\//i, "").split("/")[0];
  }

  const body = new URLSearchParams(payload).toString();
  const res = await fetch(`${config.baseUrl}${path}`, {
    method: "POST",
    headers,
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DollarPay HTTP Error ${res.status}: ${text}`);
  }

  return await res.json();
}

export interface QueryDollarPayBalanceResult {
  status: string; // "00000"
  msg: string;
  Total_Balance?: string;
  Available_Balance?: string;
  Frozen_Balance?: string;
  merchant_id?: string;
  sign?: string;
}

/**
 * Query Merchant Balance (/api/pay/balance)
 */
export async function queryDollarPayBalance(): Promise<QueryDollarPayBalanceResult> {
  const config = getDollarPayConfig();
  const payload: Record<string, string> = {
    merchant_id: config.merchantId,
  };

  payload.sign = generateDollarPaySignature(payload, config.merchantKey);

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (config.tenantDomain) {
    headers["X-Tenant-Domain"] = config.tenantDomain.replace(/^https?:\/\//i, "").split("/")[0];
  }

  const body = new URLSearchParams(payload).toString();
  const res = await fetch(`${config.baseUrl}/api/pay/balance`, {
    method: "POST",
    headers,
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DollarPay HTTP Error ${res.status}: ${text}`);
  }

  return await res.json();
}
