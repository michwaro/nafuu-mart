const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const buildUrl = (path) => `${API_BASE_URL}${path}`;

const readJson = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.message || `Request failed with status ${response.status}`);
  }
  return data;
};

export const initiateMpesaPayment = async (orderData) => {
  try {
    const response = await fetch(buildUrl("/api/payments/mpesa/initiate"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(orderData),
    });

    const data = await readJson(response);
    return {
      success: true,
      checkoutRequestId: data.checkoutRequestId,
      merchantRequestId: data.merchantRequestId,
      responseCode: data.responseCode,
      responseDescription: data.responseDescription,
      customerMessage: data.customerMessage,
      error: null,
    };
  } catch (error) {
    console.error("M-Pesa payment initiation error:", error);
    return {
      success: false,
      error: error.message || "M-Pesa STK initialization failed",
    };
  }
};

export const checkMpesaPaymentStatus = async ({ checkoutRequestId, reference } = {}) => {
  try {
    const query = new URLSearchParams();
    if (checkoutRequestId) query.set("checkoutRequestId", checkoutRequestId);
    if (reference) query.set("reference", reference);

    const response = await fetch(buildUrl(`/api/payments/mpesa/status?${query.toString()}`), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await readJson(response);
    const status = data.status || {};
    return {
      success: true,
      paymentStatus: data?.order?.paymentStatus || "pending",
      resultCode: status.resultCode,
      resultDesc: status.resultDesc,
      order: data.order || null,
      error: null,
    };
  } catch (error) {
    console.error("Failed to check M-Pesa status:", error);
    return {
      success: false,
      error: error.message || "M-Pesa status check failed",
    };
  }
};

export const isMpesaConfigured = () => Boolean(API_BASE_URL);
