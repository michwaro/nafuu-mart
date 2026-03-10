// Pesapal Payment Integration Provider
// Documentation: https://developer.pesapal.com/

const PESAPAL_BASE_URL = import.meta.env.VITE_PESAPAL_BASE_URL || "https://pay.pesapal.com/v3";
const CONSUMER_KEY = import.meta.env.VITE_PESAPAL_CONSUMER_KEY || "";
const CONSUMER_SECRET = import.meta.env.VITE_PESAPAL_CONSUMER_SECRET || "";
const IPN_ID = import.meta.env.VITE_PESAPAL_IPN_ID || "";

let cachedToken = null;
let tokenExpiry = null;

/**
 * Get OAuth access token from Pesapal
 */
export const getPesapalToken = async () => {
  // Return cached token if still valid
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
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
      throw new Error(`Pesapal auth failed: ${response.status}`);
    }

    const data = await response.json();
    cachedToken = data.token;
    // Pesapal tokens expire in 5 minutes, cache for 4 minutes to be safe
    tokenExpiry = Date.now() + 4 * 60 * 1000;

    return cachedToken;
  } catch (error) {
    console.error("Failed to get Pesapal token:", error);
    throw new Error("Payment gateway authentication failed");
  }
};

/**
 * Submit order to Pesapal for payment
 * @param {Object} orderData - Order details
 * @returns {Promise<Object>} - Payment redirect URL and tracking reference
 */
export const initiatePesapalPayment = async (orderData) => {
  try {
    const token = await getPesapalToken();

    const pesapalOrder = {
      id: orderData.id,
      currency: "KES",
      amount: orderData.total,
      description: `Nafuu Mart Order - ${orderData.product}`,
      callback_url: `${window.location.origin}/payment-callback`,
      notification_id: IPN_ID,
      billing_address: {
        email_address: orderData.customerEmail || "customer@nafuumart.co.ke",
        phone_number: orderData.phone,
        country_code: "KE",
        first_name: orderData.customer.split(" ")[0] || "Customer",
        middle_name: "",
        last_name: orderData.customer.split(" ").slice(1).join(" ") || "User",
        line_1: orderData.location,
        line_2: "",
        city: "Mombasa",
        state: "Mombasa County",
        postal_code: "",
        zip_code: "",
      },
    };

    const response = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(pesapalOrder),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Pesapal order submission failed:", errorData);
      throw new Error("Failed to initiate payment");
    }

    const data = await response.json();

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

/**
 * Check payment status from Pesapal
 * @param {string} orderTrackingId - Pesapal order tracking ID
 * @returns {Promise<Object>} - Payment status details
 */
export const checkPesapalPaymentStatus = async (orderTrackingId) => {
  try {
    const token = await getPesapalToken();

    const response = await fetch(
      `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      status: data.payment_status_description, // e.g., "Completed", "Failed", "Pending"
      statusCode: data.status_code,
      amount: data.amount,
      currency: data.currency,
      paymentMethod: data.payment_method,
      merchantReference: data.merchant_reference,
    };
  } catch (error) {
    console.error("Failed to check Pesapal payment status:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Check if Pesapal is properly configured
 */
export const isPesapalConfigured = () => {
  return Boolean(CONSUMER_KEY && CONSUMER_SECRET);
};

/**
 * Get Pesapal environment info
 */
export const getPesapalRuntime = () => {
  return {
    configured: isPesapalConfigured(),
    environment: PESAPAL_BASE_URL.includes("cybqa") ? "sandbox" : "production",
    detail: isPesapalConfigured()
      ? "Pesapal payment gateway is active"
      : "Pesapal not configured. Add VITE_PESAPAL_CONSUMER_KEY and VITE_PESAPAL_CONSUMER_SECRET to .env",
  };
};
