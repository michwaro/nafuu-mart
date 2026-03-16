const PESAPAL_BASE_URL = process.env.PESAPAL_BASE_URL || "https://cybqa.pesapal.com/pesapalv3";
const CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || "";
const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || "";

let cachedToken = null;
let tokenExpiry = 0;

const ensureConfigured = () => {
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new Error("PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET are required on the server");
  }
};

export const getPesapalToken = async () => {
  ensureConfigured();

  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const response = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      consumer_key: CONSUMER_KEY,
      consumer_secret: CONSUMER_SECRET,
    }),
  });

  if (!response.ok) {
    throw new Error(`Pesapal auth failed with status ${response.status}`);
  }

  const data = await response.json();
  cachedToken = data.token;
  tokenExpiry = Date.now() + 4 * 60 * 1000;
  return cachedToken;
};

export const submitPesapalOrder = async (payload) => {
  const token = await getPesapalToken();

  const response = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `Pesapal order submission failed with status ${response.status}`);
  }

  return data;
};

export const getPesapalTransactionStatus = async (orderTrackingId) => {
  const token = await getPesapalToken();

  const response = await fetch(
    `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `Pesapal status check failed with status ${response.status}`);
  }

  return data;
};
