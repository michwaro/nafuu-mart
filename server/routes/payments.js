import { getNeonSql } from "../lib/neonClient.js";
import { getPesapalTransactionStatus, submitPesapalOrder } from "../lib/pesapalClient.js";
import { initiateStkPush, queryStkPushStatus } from "../lib/darajaClient.js";

const PESAPAL_IPN_ID = process.env.PESAPAL_IPN_ID || "";
const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL || "";

const toBillingAddress = (body = {}) => {
  const [firstName = "Customer", ...rest] = String(body.customer || "Customer").trim().split(" ");
  return {
    email_address: body.customerEmail || "customer@nafuumart.co.ke",
    phone_number: body.phone || "",
    country_code: "KE",
    first_name: firstName,
    middle_name: "",
    last_name: rest.join(" ") || "User",
    line_1: body.location || "",
    line_2: "",
    city: "Mombasa",
    state: "Mombasa County",
    postal_code: "",
    zip_code: "",
  };
};

const isMpesaSuccessCode = (code) => String(code ?? "") === "0";

const isMpesaPendingCode = (code) => {
  const normalized = String(code ?? "");
  return normalized === "" || normalized === "1037" || normalized === "1025";
};

const reduceStockForOrder = async (sql, orderId) => {
  const orderItems = await sql`
    SELECT product_id, quantity
    FROM order_items
    WHERE order_id = ${orderId}
  `;

  for (const item of orderItems) {
    await sql`
      UPDATE products
      SET
        stock_quantity = GREATEST(stock_quantity - ${item.quantity}, 0),
        stock_status = CASE
          WHEN GREATEST(stock_quantity - ${item.quantity}, 0) = 0 THEN 'out_of_stock'
          WHEN GREATEST(stock_quantity - ${item.quantity}, 0) <= 3 THEN 'low_stock'
          ELSE 'in_stock'
        END,
        in_stock = GREATEST(stock_quantity - ${item.quantity}, 0) > 0,
        updated_at = NOW()
      WHERE id = ${item.product_id}
    `;
  }
};

const finalizePaidOrder = async (sql, orderRow, pesapalStatus) => {
  const [updatedOrder] = await sql`
    UPDATE orders
    SET
      status = 'confirmed',
      payment_status = 'paid',
      pesapal_payment_status_code = ${String(pesapalStatus.status_code ?? "")},
      pesapal_payment_method = ${String(pesapalStatus.payment_method || "")},
      updated_at = NOW()
    WHERE id = ${orderRow.id} AND payment_status <> 'paid'
    RETURNING id
  `;

  if (!updatedOrder) return;

  await reduceStockForOrder(sql, orderRow.id);
};

const finalizePaidOrderMpesa = async (sql, orderRow, mpesaStatus = {}) => {
  const [updatedOrder] = await sql`
    UPDATE orders
    SET
      status = 'confirmed',
      payment_status = 'paid',
      payment_method = 'M-Pesa',
      mpesa_result_code = ${String(mpesaStatus.resultCode ?? "0")},
      mpesa_result_desc = ${String(mpesaStatus.resultDesc || "Completed")},
      mpesa_receipt_number = COALESCE(${String(mpesaStatus.mpesaReceiptNumber || "")}, mpesa_receipt_number),
      mpesa_phone_number = COALESCE(${String(mpesaStatus.phoneNumber || "")}, mpesa_phone_number),
      mpesa_paid_at = NOW(),
      updated_at = NOW()
    WHERE id = ${orderRow.id} AND payment_status <> 'paid'
    RETURNING id
  `;

  if (!updatedOrder) return;
  await reduceStockForOrder(sql, orderRow.id);
};

const markOrderFailedMpesa = async (sql, orderRow, resultCode, resultDesc) => {
  await sql`
    UPDATE orders
    SET
      status = 'payment_failed',
      payment_status = 'failed',
      payment_method = 'M-Pesa',
      mpesa_result_code = ${String(resultCode ?? "")},
      mpesa_result_desc = ${String(resultDesc || "Payment failed")},
      updated_at = NOW()
    WHERE id = ${orderRow.id}
  `;
};

const syncPesapalTrackingStatus = async (orderTrackingId) => {
  const sql = getNeonSql();
  const [orderRow] = await sql`
    SELECT id, reference, payment_status, status
    FROM orders
    WHERE pesapal_tracking_id = ${orderTrackingId}
    LIMIT 1
  `;

  if (!orderRow) {
    return {
      status: 404,
      body: {
        ok: false,
        message: "No order found for this tracking ID",
        orderTrackingId,
      },
    };
  }

  const pesapalStatus = await getPesapalTransactionStatus(orderTrackingId);
  const statusDescription = String(pesapalStatus.payment_status_description || "");
  const statusCode = String(pesapalStatus.status_code ?? "");
  const isPaid = statusCode === "1" || statusDescription.toLowerCase() === "completed";

  if (isPaid) {
    await finalizePaidOrder(sql, orderRow, pesapalStatus);
  } else {
    await sql`
      UPDATE orders
      SET
        status = 'payment_failed',
        payment_status = 'failed',
        pesapal_payment_status_code = ${statusCode},
        pesapal_payment_method = ${String(pesapalStatus.payment_method || "")},
        updated_at = NOW()
      WHERE id = ${orderRow.id}
    `;
  }

  const [freshOrder] = await sql`
    SELECT
      reference,
      status,
      payment_status AS "paymentStatus",
      payment_method AS "paymentMethod",
      pesapal_tracking_id AS "pesapalOrderTrackingId",
      pesapal_merchant_reference AS "pesapalMerchantReference"
    FROM orders
    WHERE id = ${orderRow.id}
    LIMIT 1
  `;

  return {
    status: 200,
    body: {
      ok: true,
      order: freshOrder,
      status: pesapalStatus,
    },
  };
};

const findMpesaOrder = async (sql, { checkoutRequestId, reference } = {}) => {
  if (checkoutRequestId) {
    const byCheckout = await sql`
      SELECT id, reference, payment_status AS "paymentStatus", status, mpesa_checkout_request_id AS "checkoutRequestId"
      FROM orders
      WHERE mpesa_checkout_request_id = ${checkoutRequestId}
      LIMIT 1
    `;
    if (byCheckout[0]) return byCheckout[0];
  }

  if (reference) {
    const byReference = await sql`
      SELECT id, reference, payment_status AS "paymentStatus", status, mpesa_checkout_request_id AS "checkoutRequestId"
      FROM orders
      WHERE reference = ${reference}
      LIMIT 1
    `;
    if (byReference[0]) return byReference[0];
  }

  return null;
};

const getMpesaOrderSnapshot = async (sql, orderId) => {
  const rows = await sql`
    SELECT
      reference,
      status,
      payment_status AS "paymentStatus",
      payment_method AS "paymentMethod",
      mpesa_checkout_request_id AS "mpesaCheckoutRequestId",
      mpesa_merchant_request_id AS "mpesaMerchantRequestId",
      mpesa_receipt_number AS "mpesaReceiptNumber",
      mpesa_result_code AS "mpesaResultCode",
      mpesa_result_desc AS "mpesaResultDesc"
    FROM orders
    WHERE id = ${orderId}
    LIMIT 1
  `;

  return rows[0] || null;
};

const syncMpesaStatus = async ({ checkoutRequestId, reference } = {}) => {
  const sql = getNeonSql();
  const orderRow = await findMpesaOrder(sql, { checkoutRequestId, reference });

  if (!orderRow) {
    return {
      status: 404,
      body: {
        ok: false,
        message: "No order found for this M-Pesa request",
      },
    };
  }

  const effectiveCheckoutId = checkoutRequestId || orderRow.checkoutRequestId;
  if (!effectiveCheckoutId) {
    return {
      status: 200,
      body: {
        ok: true,
        order: await getMpesaOrderSnapshot(sql, orderRow.id),
        status: { resultCode: "", resultDesc: "Awaiting STK push initialization" },
      },
    };
  }

  const statusResponse = await queryStkPushStatus({ checkoutRequestId: effectiveCheckoutId });
  const resultCode = String(statusResponse?.ResultCode ?? "");
  const resultDesc = String(statusResponse?.ResultDesc || statusResponse?.ResponseDescription || "");

  if (isMpesaSuccessCode(resultCode)) {
    await finalizePaidOrderMpesa(sql, orderRow, {
      resultCode,
      resultDesc,
    });
  } else if (!isMpesaPendingCode(resultCode)) {
    await markOrderFailedMpesa(sql, orderRow, resultCode, resultDesc);
  }

  return {
    status: 200,
    body: {
      ok: true,
      order: await getMpesaOrderSnapshot(sql, orderRow.id),
      status: {
        resultCode,
        resultDesc,
        checkoutRequestId: effectiveCheckoutId,
      },
    },
  };
};

export const initiatePesapalCheckout = async ({ body = {} } = {}) => {
  const reference = String(body.reference || body.id || "").trim();
  if (!reference) {
    return {
      status: 400,
      body: { ok: false, message: "Order reference is required" },
    };
  }

  if (!PESAPAL_IPN_ID) {
    return {
      status: 503,
      body: { ok: false, message: "PESAPAL_IPN_ID is not configured" },
    };
  }

  try {
    const callbackUrl = `${body.appBaseUrl || "http://localhost:5173"}/payment-callback`;
    const payload = {
      id: reference,
      currency: "KES",
      amount: Number(body.total || 0),
      description: body.description || `Nafuu Mart Order - ${reference}`,
      callback_url: callbackUrl,
      notification_id: PESAPAL_IPN_ID,
      billing_address: toBillingAddress(body),
    };

    const submitResult = await submitPesapalOrder(payload);
    const sql = getNeonSql();
    await sql`
      UPDATE orders
      SET
        pesapal_tracking_id = ${submitResult.order_tracking_id || null},
        pesapal_merchant_reference = ${submitResult.merchant_reference || null},
        updated_at = NOW()
      WHERE reference = ${reference}
    `;

    return {
      status: 200,
      body: {
        ok: true,
        order_tracking_id: submitResult.order_tracking_id,
        merchant_reference: submitResult.merchant_reference,
        redirect_url: submitResult.redirect_url,
      },
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        ok: false,
        message: error?.message || "Failed to initiate Pesapal checkout",
      },
    };
  }
};

export const getPesapalStatus = async ({ orderTrackingId } = {}) => {
  if (!orderTrackingId) {
    return {
      status: 400,
      body: { ok: false, message: "orderTrackingId is required" },
    };
  }

  try {
    return await syncPesapalTrackingStatus(orderTrackingId);
  } catch (error) {
    return {
      status: 500,
      body: { ok: false, message: error?.message || "Failed to sync Pesapal status" },
    };
  }
};

export const initiateMpesaCheckout = async ({ body = {} } = {}) => {
  const reference = String(body.reference || body.id || "").trim();
  const phone = String(body.phone || "").trim();
  const amount = Number(body.total || 0);

  if (!reference || !phone || !Number.isFinite(amount) || amount <= 0) {
    return {
      status: 400,
      body: { ok: false, message: "reference, phone, and total amount are required" },
    };
  }

  if (!MPESA_CALLBACK_URL) {
    return {
      status: 503,
      body: { ok: false, message: "MPESA_CALLBACK_URL is not configured" },
    };
  }

  try {
    const stkResponse = await initiateStkPush({
      amount,
      phone,
      reference,
      description: body.description || `Nafuu Mart Order ${reference}`,
      callbackUrl: MPESA_CALLBACK_URL,
    });

    const sql = getNeonSql();
    await sql`
      UPDATE orders
      SET
        payment_method = 'M-Pesa',
        payment_status = 'pending',
        status = 'pending_payment',
        mpesa_checkout_request_id = ${stkResponse.CheckoutRequestID || null},
        mpesa_merchant_request_id = ${stkResponse.MerchantRequestID || null},
        mpesa_result_code = ${String(stkResponse.ResponseCode || "")},
        mpesa_result_desc = ${String(stkResponse.ResponseDescription || "")},
        updated_at = NOW()
      WHERE reference = ${reference}
    `;

    return {
      status: 200,
      body: {
        ok: true,
        checkoutRequestId: stkResponse.CheckoutRequestID,
        merchantRequestId: stkResponse.MerchantRequestID,
        responseCode: stkResponse.ResponseCode,
        responseDescription: stkResponse.ResponseDescription,
        customerMessage: stkResponse.CustomerMessage,
      },
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        ok: false,
        message: error?.message || "Failed to initiate M-Pesa STK push",
      },
    };
  }
};

export const getMpesaStatus = async ({ checkoutRequestId, reference } = {}) => {
  if (!checkoutRequestId && !reference) {
    return {
      status: 400,
      body: { ok: false, message: "checkoutRequestId or reference is required" },
    };
  }

  try {
    return await syncMpesaStatus({ checkoutRequestId, reference });
  } catch (error) {
    return {
      status: 500,
      body: { ok: false, message: error?.message || "Failed to sync M-Pesa payment status" },
    };
  }
};

export const handleMpesaCallback = async ({ body = {} } = {}) => {
  const callback = body?.Body?.stkCallback || body?.stkCallback || {};
  const checkoutRequestId = callback.CheckoutRequestID || body.CheckoutRequestID || body.checkoutRequestId;
  const resultCode = String(callback.ResultCode ?? body.ResultCode ?? "");
  const resultDesc = String(callback.ResultDesc || body.ResultDesc || "");

  if (!checkoutRequestId) {
    return {
      status: 400,
      body: { ok: false, message: "CheckoutRequestID is required in callback payload" },
    };
  }

  const metadataItems = Array.isArray(callback?.CallbackMetadata?.Item)
    ? callback.CallbackMetadata.Item
    : [];

  const getMetadataValue = (name) => {
    const found = metadataItems.find((item) => item?.Name === name);
    return found?.Value ?? null;
  };

  const mpesaReceiptNumber = getMetadataValue("MpesaReceiptNumber");
  const phoneNumber = getMetadataValue("PhoneNumber");

  try {
    const sql = getNeonSql();
    const orderRow = await findMpesaOrder(sql, { checkoutRequestId });

    if (!orderRow) {
      return {
        status: 404,
        body: { ok: false, message: "Order not found for callback checkout request" },
      };
    }

    if (isMpesaSuccessCode(resultCode)) {
      await finalizePaidOrderMpesa(sql, orderRow, {
        resultCode,
        resultDesc,
        mpesaReceiptNumber,
        phoneNumber,
      });
    } else {
      await markOrderFailedMpesa(sql, orderRow, resultCode, resultDesc || "M-Pesa callback failure");
    }

    return {
      status: 200,
      body: {
        ok: true,
        checkoutRequestId,
      },
    };
  } catch (error) {
    return {
      status: 500,
      body: { ok: false, message: error?.message || "M-Pesa callback handling failed" },
    };
  }
};

export const handlePesapalCallback = async ({ body = {} } = {}) => {
  const orderTrackingId =
    body.OrderTrackingId ||
    body.orderTrackingId ||
    body.order_tracking_id ||
    body.order_trackingId ||
    null;

  if (!orderTrackingId) {
    return {
      status: 400,
      body: { ok: false, message: "OrderTrackingId is required in callback payload" },
    };
  }

  try {
    return await syncPesapalTrackingStatus(orderTrackingId);
  } catch (error) {
    return {
      status: 500,
      body: {
        ok: false,
        message: error?.message || "Pesapal callback handling failed",
      },
    };
  }
};
