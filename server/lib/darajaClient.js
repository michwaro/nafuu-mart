const MPESA_BASE_URL = process.env.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke";
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || "";
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || "";
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE || "";
const MPESA_PASSKEY = process.env.MPESA_PASSKEY || "";
const MPESA_SIMULATION = String(process.env.MPESA_SIMULATION || "").toLowerCase() === "true";

let cachedToken = null;
let tokenExpiry = 0;
const mockStkState = new Map();

const isPlaceholder = (val) => {
  const str = String(val || "").toLowerCase().trim();
  return /^(replace_|placeholder|xxxxx|pending|todo|example|sample|changeme|fixme|temp_|n\/a|none|null|undefined)/.test(str);
};

const isSandboxMode = () => {
  // Explicit simulation flag wins. Otherwise auto-enable only for sandbox + placeholders.
  if (MPESA_SIMULATION) return true;
  const sandboxBase = String(MPESA_BASE_URL || "").toLowerCase().includes("sandbox.safaricom.co.ke");
  const placeholderCreds = isPlaceholder(MPESA_SHORTCODE) || isPlaceholder(MPESA_PASSKEY);
  return sandboxBase && placeholderCreds;
};

const ensureConfigured = () => {
  if (isSandboxMode()) return;

  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || !MPESA_SHORTCODE || !MPESA_PASSKEY) {
    throw new Error(
      "MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, and MPESA_PASSKEY are required"
    );
  }

  if (isPlaceholder(MPESA_SHORTCODE) || isPlaceholder(MPESA_PASSKEY)) {
    throw new Error("MPESA_SHORTCODE and MPESA_PASSKEY must be real values in live mode");
  }
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const toMockDecision = (reference = "") => {
  const text = String(reference);
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  // About 20% simulated failures to exercise UI error paths.
  return hash % 5 === 0 ? "1032" : "0";
};

const toTimestamp = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}${hh}${min}${ss}`;
};

const toPassword = (timestamp) => {
  const raw = `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`;
  return Buffer.from(raw).toString("base64");
};

export const normalizeKenyanPhone = (rawPhone = "") => {
  const digits = String(rawPhone).replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 9) return `254${digits}`;
  throw new Error("Enter a valid Kenyan phone number (07XXXXXXXX)");
};

export const getMpesaToken = async () => {
  ensureConfigured();

  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");
  const url = `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`;
  
  let response, data;
  try {
    response = await fetchWithTimeout(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${auth}`,
      },
    });

    data = await response.json().catch(() => ({}));
  } catch (err) {
    const msg = err?.name === "AbortError" 
      ? "Daraja API timeout (10s) - check network and credentials" 
      : `Daraja API error: ${err?.message || "unknown"}`;
    throw new Error(msg);
  }

  if (!response.ok || !data?.access_token) {
    const errorMsg = data?.error_description 
      || data?.errorMessage 
      || `HTTP ${response.status}: ${JSON.stringify(data)}`;
    throw new Error(`Daraja authentication failed: ${errorMsg}`);
  }

  cachedToken = data.access_token;
  tokenExpiry = Date.now() + 55 * 60 * 1000;
  return cachedToken;
};

export const initiateStkPush = async ({
  amount,
  phone,
  reference,
  description,
  callbackUrl,
} = {}) => {
  ensureConfigured();

  // Simulation mode: deterministic mock responses for safe testing.
  if (isSandboxMode()) {
    const checkoutRequestId = `MOCK-CHECKOUT-${Date.now()}`;
    const merchantRequestId = `MOCK-MERCHANT-${Date.now()}`;
    mockStkState.set(checkoutRequestId, {
      polls: 0,
      finalCode: toMockDecision(reference),
      reference: String(reference || ""),
    });

    return {
      MerchantRequestID: merchantRequestId,
      CheckoutRequestID: checkoutRequestId,
      ResponseCode: "0",
      ResponseDescription: "Success. Request accepted for processing",
      CustomerMessage: "SIMULATION MODE: STK request accepted.",
    };
  }

  // Real mode: call actual Daraja API
  const token = await getMpesaToken();
  const timestamp = toTimestamp();
  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: toPassword(timestamp),
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.max(1, Math.round(Number(amount || 0))),
    PartyA: normalizeKenyanPhone(phone),
    PartyB: MPESA_SHORTCODE,
    PhoneNumber: normalizeKenyanPhone(phone),
    CallBackURL: callbackUrl,
    AccountReference: String(reference || "NafuuOrder").slice(0, 24),
    TransactionDesc: String(description || "Nafuu Mart Order").slice(0, 60),
  };

  let response, data;
  try {
    response = await fetchWithTimeout(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    data = await response.json().catch(() => ({}));
  } catch (err) {
    const msg = err?.name === "AbortError"
      ? "STK push request timeout (10s) - possible network issue or Daraja service down"
      : `STK push error: ${err?.message || "unknown"}`;
    throw new Error(msg);
  }

  if (!response.ok) {
    const errorMsg = data?.errorMessage 
      || data?.ResponseDescription 
      || `HTTP ${response.status}: ${JSON.stringify(data).slice(0, 200)}`;
    throw new Error(`STK push failed: ${errorMsg}`);
  }

  return data;
};

export const queryStkPushStatus = async ({ checkoutRequestId } = {}) => {
  ensureConfigured();
  if (!checkoutRequestId) {
    throw new Error("checkoutRequestId is required");
  }

  // Simulation mode: pending for first poll, then deterministic success/failure.
  if (isSandboxMode()) {
    const state = mockStkState.get(checkoutRequestId) || {
      polls: 0,
      finalCode: "0",
      reference: "",
    };
    state.polls += 1;
    mockStkState.set(checkoutRequestId, state);

    if (state.polls < 2) {
      return {
        MerchantRequestID: `MOCK-MERCHANT-${Date.now()}`,
        CheckoutRequestID: checkoutRequestId,
        ResultCode: "1037",
        ResultDesc: "Timeout waiting for user input. Prompt was sent.",
        ResponseDescription: "Timeout waiting for user input.",
        ResponseCode: "0",
      };
    }

    if (state.finalCode === "0") {
      return {
        MerchantRequestID: `MOCK-MERCHANT-${Date.now()}`,
        CheckoutRequestID: checkoutRequestId,
        ResultCode: "0",
        ResultDesc: "The service request has been processed successfully.",
        ResponseDescription: "The service request has been processed successfully.",
        ResponseCode: "0",
      };
    }

    return {
      MerchantRequestID: `MOCK-MERCHANT-${Date.now()}`,
      CheckoutRequestID: checkoutRequestId,
      ResultCode: "1032",
      ResultDesc: "Request cancelled by user (simulated).",
      ResponseDescription: "Request cancelled by user.",
      ResponseCode: "0",
    };
  }

  // Real mode: call actual Daraja API
  const token = await getMpesaToken();
  const timestamp = toTimestamp();
  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: toPassword(timestamp),
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  let response, data;
  try {
    response = await fetchWithTimeout(`${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    data = await response.json().catch(() => ({}));
  } catch (err) {
    const msg = err?.name === "AbortError"
      ? "STK status query timeout (10s)"
      : `STK query error: ${err?.message || "unknown"}`;
    throw new Error(msg);
  }

  if (!response.ok) {
    throw new Error(data?.errorMessage || data?.ResponseDescription || "STK status query failed");
  }

  return data;
};
