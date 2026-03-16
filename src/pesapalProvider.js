const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const buildUrl = (path) => `${API_BASE_URL}${path}`;

const readJson = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.message || `Request failed with status ${response.status}`);
  }
  return data;
};

export const initiatePesapalPayment = async (orderData) => {
  try {
    const response = await fetch(buildUrl("/api/payments/pesapal/initiate"), {
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
      order_tracking_id: data.order_tracking_id,
      merchant_reference: data.merchant_reference,
      redirect_url: data.redirect_url,
      error: null,
    };
  } catch (error) {
    console.error("Pesapal payment initiation error:", error);
    return {
      success: false,
      error: error.message || "Payment initialization failed",
    };
  }
};

export const checkPesapalPaymentStatus = async (orderTrackingId) => {
  try {
    const response = await fetch(
      buildUrl(`/api/payments/pesapal/status?orderTrackingId=${encodeURIComponent(orderTrackingId)}`),
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    const data = await readJson(response);
    const status = data.status || {};

    return {
      success: true,
      status: status.payment_status_description,
      statusCode: status.status_code,
      amount: status.amount,
      currency: status.currency,
      paymentMethod: status.payment_method,
      merchantReference: status.merchant_reference,
      order: data.order || null,
    };
  } catch (error) {
    console.error("Failed to check Pesapal payment status:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const isPesapalConfigured = () => {
  return Boolean(API_BASE_URL);
};

export const getPesapalRuntime = () => {
  return {
    configured: isPesapalConfigured(),
    environment: "server-controlled",
    detail: isPesapalConfigured()
      ? "Pesapal gateway is configured via backend API"
      : "Set VITE_API_BASE_URL to point to your backend API",
  };
};
