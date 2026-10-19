const PRICE_KOBO = 500000;
const PLAN_CODE_PATTERN = /^[A-Za-z0-9_-]{4,80}$/;

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function getExpectedDomain() {
  const configured = String(process.env.PAYSTACK_EXPECTED_DOMAIN || "").toLowerCase();
  if (configured === "live" || configured === "test") return configured;
  return process.env.VERCEL_ENV === "production" ? "live" : "test";
}

async function getUser(req, supabaseUrl, anonKey) {
  const match = /^Bearer\s+(.+)$/i.exec(String(req.headers.authorization || ""));
  if (!match) return null;
  const response = await fetch(supabaseUrl + "/auth/v1/user", {
    headers: { apikey: anonKey, Authorization: "Bearer " + match[1] }
  });
  if (!response.ok) return null;
  const user = await response.json();
  return user && user.id && user.email ? { ...user, accessToken: match[1] } : null;
}

async function getEntitlement(supabaseUrl, anonKey, user) {
  const url = supabaseUrl + "/rest/v1/voice_sales_entitlements?select=enabled,expires_at,paystack_subscription_code&user_id=eq." + encodeURIComponent(user.id) + "&limit=1";
  const response = await fetch(url, {
    headers: { apikey: anonKey, Authorization: "Bearer " + user.accessToken }
  });
  if (!response.ok) throw new Error("entitlement_lookup_failed");
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function paystackRequest(path, secret, options = {}) {
  const response = await fetch("https://api.paystack.co" + path, {
    method: options.method || "GET",
    headers: {
      Authorization: "Bearer " + secret,
      ...(options.body ? { "Content-Type": "application/json" } : {})
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  });
  const result = await response.json().catch(() => ({}));
  return { response, result };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Use POST to manage the voice subscription." });

  const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const planCode = String(process.env.PAYSTACK_VOICE_PLAN_CODE || "");
  const siteUrl = String(process.env.ITX_SITE_URL || "");
  if (!supabaseUrl || !anonKey || !secret || !PLAN_CODE_PATTERN.test(planCode) || !siteUrl) {
    return json(res, 503, { error: "Monthly voice payments are not fully configured yet. Please contact IT Xperts." });
  }
  let site;
  try {
    site = new URL(siteUrl);
    if (site.protocol !== "https:") throw new Error("https_required");
  } catch {
    return json(res, 503, { error: "The payment return address is not configured securely." });
  }

  let user;
  try {
    user = await getUser(req, supabaseUrl, anonKey);
  } catch {
    return json(res, 503, { error: "The account service could not be reached. Please try again." });
  }
  if (!user) return json(res, 401, { error: "Please sign in again before continuing." });

  let entitlement;
  try {
    entitlement = await getEntitlement(supabaseUrl, anonKey, user);
  } catch {
    return json(res, 503, { error: "Your subscription status could not be checked. Please try again later." });
  }
  const body = req.body && typeof req.body === "object" ? req.body : {};
  if (body.action === "manage") {
    const subscriptionCode = String(entitlement?.paystack_subscription_code || "");
    if (!/^SUB_[A-Za-z0-9]+$/.test(subscriptionCode)) {
      return json(res, 404, { error: "No Paystack subscription was found for this account." });
    }
    try {
      const { response, result } = await paystackRequest(
        "/subscription/" + encodeURIComponent(subscriptionCode) + "/manage/link",
        secret
      );
      const link = result?.data?.link;
      if (!response.ok || result?.status !== true || typeof link !== "string") {
        return json(res, 502, { error: "The subscription management page could not be opened. Please try again." });
      }
      const manageUrl = new URL(link);
      if (manageUrl.protocol !== "https:" || !["paystack.com", "www.paystack.com"].includes(manageUrl.hostname)) {
        return json(res, 502, { error: "Paystack returned an invalid subscription management link." });
      }
      return json(res, 200, { managementUrl: manageUrl.toString() });
    } catch {
      return json(res, 502, { error: "Paystack could not be reached. Please try again." });
    }
  }

  const expiresAt = entitlement?.expires_at ? Date.parse(entitlement.expires_at) : Infinity;
  if (entitlement?.enabled === true && expiresAt > Date.now()) {
    return json(res, 409, { error: "Voice sales is already active for this account." });
  }

  try {
    const expectedDomain = getExpectedDomain();
    const planResult = await paystackRequest("/plan/" + encodeURIComponent(planCode), secret);
    const plan = planResult.result?.data;
    if (!planResult.response.ok || planResult.result?.status !== true ||
        plan?.plan_code !== planCode || Number(plan?.amount) !== PRICE_KOBO ||
        plan?.currency !== "NGN" || String(plan?.interval).toLowerCase() !== "monthly" ||
        plan?.domain !== expectedDomain) {
      return json(res, 503, { error: "The Paystack plan must be a ₦5,000 monthly plan in the configured payment mode." });
    }

    const reference = "ITXVOICE-" + require("crypto").randomBytes(18).toString("hex");
    const initialized = await paystackRequest("/transaction/initialize", secret, {
      method: "POST",
      body: {
        email: user.email,
        amount: String(PRICE_KOBO),
        currency: "NGN",
        plan: planCode,
        reference,
        callback_url: new URL("/api/voice-payment", site).toString(),
        metadata: {
          itx_feature: "voice_sales",
          itx_user_id: user.id,
          itx_user_email: user.email,
          itx_plan_code: planCode
        }
      }
    });
    const checkout = initialized.result?.data?.authorization_url;
    if (!initialized.response.ok || initialized.result?.status !== true || typeof checkout !== "string") {
      return json(res, 502, { error: "Paystack could not start checkout. Please try again." });
    }
    const checkoutUrl = new URL(checkout);
    if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "checkout.paystack.com") {
      return json(res, 502, { error: "Paystack returned an invalid checkout link." });
    }
    return json(res, 200, { authorizationUrl: checkoutUrl.toString() });
  } catch {
    return json(res, 502, { error: "Paystack could not be reached. Please try again." });
  }
};
