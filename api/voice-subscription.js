const PRICE_NGN = 5000;
const PAYMENT_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{3,119}$/;

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function getUser(req, supabaseUrl, anonKey) {
  const match = /^Bearer\s+(.+)$/i.exec(String(req.headers.authorization || ""));
  if (!match) return null;
  const response = await fetch(supabaseUrl + "/auth/v1/user", {
    headers: { apikey: anonKey, Authorization: "Bearer " + match[1] }
  });
  if (!response.ok) return null;
  const user = await response.json();
  return user && user.id ? { ...user, accessToken: match[1] } : null;
}

function userHeaders(anonKey, accessToken, extra = {}) {
  return {
    apikey: anonKey,
    Authorization: "Bearer " + accessToken,
    "Content-Type": "application/json",
    ...extra
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Use POST to submit a voice sales payment reference." });
  }

  const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return json(res, 503, { error: "Payment requests are not configured yet. Please try again later." });
  }

  let user;
  try {
    user = await getUser(req, supabaseUrl, anonKey);
  } catch {
    return json(res, 503, { error: "The account service could not be reached. Please try again." });
  }
  if (!user) return json(res, 401, { error: "Please sign in again before submitting a payment reference." });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const reference = String(body.reference || "").trim();
  if (!PAYMENT_REFERENCE_PATTERN.test(reference)) {
    return json(res, 400, { error: "Enter a valid bank transfer reference, at least 4 characters long." });
  }

  const headers = userHeaders(anonKey, user.accessToken);
  try {
    const pendingUrl = supabaseUrl + "/rest/v1/voice_sales_payment_requests?select=id&user_id=eq." +
      encodeURIComponent(user.id) + "&status=eq.pending&limit=1";
    const pendingResponse = await fetch(pendingUrl, { headers });
    if (!pendingResponse.ok) return json(res, 503, { error: "Your payment request could not be checked. Please try again." });
    const pendingRows = await pendingResponse.json();
    if (Array.isArray(pendingRows) && pendingRows.length) {
      return json(res, 409, { error: "You already have a payment reference waiting for review." });
    }

    const insertResponse = await fetch(supabaseUrl + "/rest/v1/voice_sales_payment_requests", {
      method: "POST",
      headers: userHeaders(anonKey, user.accessToken, { Prefer: "return=representation" }),
      body: JSON.stringify({
        user_id: user.id,
        amount_ngn: PRICE_NGN,
        payment_reference: reference
      })
    });
    if (insertResponse.status === 409) {
      return json(res, 409, { error: "You already have a payment reference waiting for review." });
    }
    if (!insertResponse.ok) {
      return json(res, 503, { error: "Your payment reference could not be saved. Please try again later." });
    }
    const rows = await insertResponse.json().catch(() => []);
    return json(res, 201, { status: "pending", requestId: rows?.[0]?.id || null });
  } catch {
    return json(res, 503, { error: "The payment service could not be reached. Please try again." });
  }
};
