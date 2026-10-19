const crypto = require("crypto");

const PRICE_KOBO = 500000;
const USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REFERENCE_PATTERN = /^ITXVOICE-[A-Za-z0-9]+$/;

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function redirect(res, state) {
  const siteUrl = String(process.env.ITX_SITE_URL || "");
  let target = "/";
  try {
    const site = new URL(siteUrl);
    if (site.protocol !== "https:") throw new Error("https_required");
    const url = new URL("/", site);
    url.searchParams.set("voice_payment", state);
    target = url.toString();
  } catch {}
  res.statusCode = 303;
  res.setHeader("Location", target);
  res.end();
}

function expectedDomain() {
  const value = String(process.env.PAYSTACK_EXPECTED_DOMAIN || "").toLowerCase();
  if (value === "live" || value === "test") return value;
  return process.env.VERCEL_ENV === "production" ? "live" : "test";
}

function metadataObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {}
  }
  return {};
}

function addGracePeriod(dateValue) {
  const timestamp = Date.parse(dateValue || "");
  const base = Number.isFinite(timestamp) ? new Date(timestamp) : new Date();
  base.setUTCDate(base.getUTCDate() + 3);
  return base.toISOString();
}

function addOneCalendarMonthAndGrace(dateValue) {
  const timestamp = Date.parse(dateValue || "");
  const base = Number.isFinite(timestamp) ? new Date(timestamp) : new Date();
  const originalDay = base.getUTCDate();
  base.setUTCDate(1);
  base.setUTCMonth(base.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  base.setUTCDate(Math.min(originalDay, lastDay));
  base.setUTCDate(base.getUTCDate() + 3);
  return base.toISOString();
}

function entitlementExpiry(data) {
  const nextPayment = data?.subscription?.next_payment_date || data?.next_payment_date;
  if (nextPayment && Number.isFinite(Date.parse(nextPayment))) return addGracePeriod(nextPayment);
  const paidAt = data?.paid_at || data?.paidAt || data?.created_at || data?.createdAt;
  return addOneCalendarMonthAndGrace(paidAt);
}

function subscriptionCode(data) {
  const value = data?.subscription?.subscription_code || data?.subscription_code;
  return typeof value === "string" && /^SUB_[A-Za-z0-9]+$/.test(value) ? value : null;
}

function customerCode(data) {
  const value = data?.customer?.customer_code;
  return typeof value === "string" && /^CUS_[A-Za-z0-9]+$/.test(value) ? value : null;
}

function dataPlanCode(data) {
  return data?.plan?.plan_code || data?.subscription?.plan?.plan_code || null;
}

function serviceHeaders(serviceKey, prefer) {
  return {
    apikey: serviceKey,
    Authorization: "Bearer " + serviceKey,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {})
  };
}

async function upsertEntitlement(env, row) {
  const response = await fetch(env.supabaseUrl + "/rest/v1/voice_sales_entitlements?on_conflict=user_id", {
    method: "POST",
    headers: serviceHeaders(env.serviceKey, "resolution=merge-duplicates,return=minimal"),
    body: JSON.stringify(row)
  });
  if (!response.ok) throw new Error("entitlement_upsert_failed");
}

async function lookupEntitlementBySubscription(env, code, field = "paystack_subscription_code") {
  const url = env.supabaseUrl + "/rest/v1/voice_sales_entitlements?select=user_id&" +
    encodeURIComponent(field) + "=eq." + encodeURIComponent(code) + "&limit=1";
  const response = await fetch(url, { headers: serviceHeaders(env.serviceKey) });
  if (!response.ok) throw new Error("entitlement_lookup_failed");
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0]?.user_id || null : null;
}

async function processCharge(env, data) {
  if (data?.status !== "success" || Number(data?.amount) !== PRICE_KOBO ||
      data?.currency !== "NGN" || data?.domain !== env.expectedDomain) return;
  const planCode = dataPlanCode(data);
  if (planCode && planCode !== env.planCode) return;

  const metadata = metadataObject(data.metadata);
  const metadataUserId = metadata.itx_user_id || metadata.user_id;
  let userId = typeof metadataUserId === "string" && USER_ID_PATTERN.test(metadataUserId) ? metadataUserId : null;
  const code = subscriptionCode(data);
  if (metadata.itx_feature === "voice_sales" && metadata.itx_plan_code && metadata.itx_plan_code !== env.planCode) return;
  if (metadata.itx_feature !== "voice_sales") userId = null;

  if (!userId && code) userId = await lookupEntitlementBySubscription(env, code);
  if (!userId && !code) {
    const customer = customerCode(data);
    if (customer) userId = await lookupEntitlementBySubscription(env, customer, "paystack_customer_code");
  }
  if (!userId) return;

  const row = {
    user_id: userId,
    enabled: true,
    expires_at: entitlementExpiry(data),
    paystack_last_paid_at: data.paid_at || data.paidAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  if (code) row.paystack_subscription_code = code;
  const customer = customerCode(data);
  if (customer) row.paystack_customer_code = customer;
  if (typeof data.reference === "string" && REFERENCE_PATTERN.test(data.reference)) {
    row.paystack_last_reference = data.reference;
  }
  await upsertEntitlement(env, row);
}

async function disableSubscription(env, data) {
  const code = subscriptionCode(data);
  if (!code || data?.domain !== env.expectedDomain) return;
  const url = env.supabaseUrl + "/rest/v1/voice_sales_entitlements?paystack_subscription_code=eq." + encodeURIComponent(code);
  const response = await fetch(url, {
    method: "PATCH",
    headers: serviceHeaders(env.serviceKey, "return=minimal"),
    body: JSON.stringify({ enabled: false, updated_at: new Date().toISOString() })
  });
  if (!response.ok) throw new Error("entitlement_update_failed");
}

async function readRawBody(req, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("body_too_large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size);
}

async function verifyReference(reference, secret) {
  const response = await fetch("https://api.paystack.co/transaction/verify/" + encodeURIComponent(reference), {
    headers: { Authorization: "Bearer " + secret }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.status !== true) return null;
  return result.data || null;
}

async function handleCallback(req, res, env) {
  const reference = String(req.query?.reference || "");
  if (!REFERENCE_PATTERN.test(reference)) return redirect(res, "failed");
  try {
    const data = await verifyReference(reference, env.secret);
    if (!data || data.reference !== reference || data.status !== "success" ||
        Number(data.amount) !== PRICE_KOBO || data.currency !== "NGN" ||
        data.domain !== env.expectedDomain) return redirect(res, "failed");

    const metadata = metadataObject(data.metadata);
    const userId = String(metadata.itx_user_id || "");
    const userEmail = String(metadata.itx_user_email || "").trim().toLowerCase();
    const accountEmail = String(data.customer?.email || data.email || "").trim().toLowerCase();
    const planCode = String(env.planCode);
    if (metadata.itx_feature !== "voice_sales" || !USER_ID_PATTERN.test(userId) ||
        metadata.itx_plan_code !== planCode || !userEmail || userEmail !== accountEmail ||
        (dataPlanCode(data) && dataPlanCode(data) !== planCode)) return redirect(res, "failed");

    const row = {
      user_id: userId,
      enabled: true,
      expires_at: entitlementExpiry(data),
      paystack_last_paid_at: data.paid_at || data.paidAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      paystack_last_reference: reference
    };
    const code = subscriptionCode(data);
    const customer = customerCode(data);
    if (code) row.paystack_subscription_code = code;
    if (customer) row.paystack_customer_code = customer;
    await upsertEntitlement(env, row);
    return redirect(res, "success");
  } catch {
    return redirect(res, "failed");
  }
}

async function handleWebhook(req, res, env) {
  let raw;
  try {
    raw = await readRawBody(req, 1024 * 1024);
  } catch {
    return json(res, 413, { error: "Webhook payload is too large." });
  }
  const signature = String(req.headers["x-paystack-signature"] || "");
  if (!/^[0-9a-f]{128}$/i.test(signature)) return json(res, 401, { error: "Invalid webhook signature." });
  const expected = crypto.createHmac("sha512", env.secret).update(raw).digest();
  const received = Buffer.from(signature, "hex");
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    return json(res, 401, { error: "Invalid webhook signature." });
  }

  let event;
  try {
    event = JSON.parse(raw.toString("utf8"));
  } catch {
    return json(res, 400, { error: "Invalid webhook payload." });
  }
  try {
    if (event?.event === "charge.success") await processCharge(env, event.data);
    if (event?.event === "subscription.disable") await disableSubscription(env, event.data);
    return json(res, 200, { received: true });
  } catch {
    return json(res, 503, { error: "The payment update could not be saved. Paystack may retry this webhook." });
  }
}

module.exports = async function handler(req, res) {
  const env = {
    supabaseUrl: String(process.env.SUPABASE_URL || "").replace(/\/+$/, ""),
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    secret: process.env.PAYSTACK_SECRET_KEY,
    planCode: String(process.env.PAYSTACK_VOICE_PLAN_CODE || ""),
    expectedDomain: expectedDomain()
  };
  if (!env.supabaseUrl || !env.serviceKey || !env.secret ||
      !/^[A-Za-z0-9_-]{4,80}$/.test(env.planCode)) {
    if (req.method === "GET") return redirect(res, "failed");
    return json(res, 503, { error: "Payment processing is not fully configured." });
  }
  if (req.method === "GET") return handleCallback(req, res, env);
  if (req.method === "POST") return handleWebhook(req, res, env);
  res.setHeader("Allow", "GET, POST");
  return json(res, 405, { error: "Use GET for checkout return or POST for Paystack webhooks." });
};

module.exports.config = { api: { bodyParser: false } };
