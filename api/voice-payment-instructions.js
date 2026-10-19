function cleanText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

module.exports = function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Use GET to load payment instructions." });
  }

  const bankName = cleanText(process.env.VOICE_SALES_BANK_NAME, 80);
  const accountName = cleanText(process.env.VOICE_SALES_ACCOUNT_NAME, 100);
  const accountNumber = String(process.env.VOICE_SALES_ACCOUNT_NUMBER || "").replace(/\D/g, "").slice(0, 20);
  const supportContact = cleanText(process.env.VOICE_SALES_SUPPORT_CONTACT, 160);
  const configured = Boolean(bankName && accountName && /^\d{10}$/.test(accountNumber));

  return json(res, 200, {
    configured,
    bankName: configured ? bankName : "",
    accountName: configured ? accountName : "",
    accountNumber: configured ? accountNumber : "",
    supportContact
  });
};
