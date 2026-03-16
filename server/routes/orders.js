import { verifyClerkRequest } from "../lib/clerkAuth.js";
import { getNeonSql } from "../lib/neonClient.js";

const normalizeOrderPayload = (body = {}) => {
  const items = Array.isArray(body.items)
    ? body.items
        .filter((item) => item?.id)
        .map((item) => ({
          id: String(item.id),
          brand: String(item.brand || ""),
          name: String(item.name || ""),
          spec: String(item.spec || ""),
          grade: String(item.grade || ""),
          quantity: Math.max(1, Number(item.quantity || 1)),
          price: Number(item.price || 0),
          market: Number(item.market || 0),
          image: String(item.image || ""),
        }))
    : [];

  const paymentMethod = String(body.paymentMethod || "M-Pesa");
  const paymentMethodNormalized = paymentMethod.toLowerCase();
  const isPendingGateway = paymentMethodNormalized === "pesapal" || paymentMethodNormalized === "m-pesa" || paymentMethodNormalized === "mpesa";

  return {
    reference: String(body.id || body.reference || "").trim(),
    customer: String(body.customer || "").trim(),
    customerEmail: String(body.customerEmail || "").trim() || null,
    phone: String(body.phone || "").trim(),
    location: String(body.location || "").trim(),
    notes: String(body.notes || "").trim(),
    productSummary: String(body.product || "").trim(),
    gradeSummary: String(body.grade || "Mixed").trim(),
    subtotal: Number(body.price ?? body.subtotal ?? body.total ?? 0),
    discount: Number(body.discount || 0),
    total: Number(body.total || 0),
    itemCount: Number(body.itemCount || items.reduce((sum, i) => sum + i.quantity, 0)),
    items,
    couponCode: body.couponCode ? String(body.couponCode) : null,
    paymentMethod,
    paymentStatus: isPendingGateway ? "pending" : "paid",
    status: isPendingGateway ? "pending_payment" : "confirmed",
    pesapalOrderTrackingId: body.pesapalOrderTrackingId || null,
    pesapalMerchantReference: body.pesapalMerchantReference || null,
    mpesaCheckoutRequestId: body.mpesaCheckoutRequestId || null,
    mpesaMerchantRequestId: body.mpesaMerchantRequestId || null,
  };
};

export const createOrder = async ({ headers = {}, body = {} } = {}) => {
  const auth = await verifyClerkRequest(headers);
  const userId = auth.ok ? auth.payload?.sub || null : null;
  const payload = normalizeOrderPayload(body);

  if (!payload.reference || !payload.customer || payload.items.length === 0 || !Number.isFinite(payload.total)) {
    return {
      status: 400,
      body: { ok: false, message: "Invalid order payload" },
    };
  }

  try {
    const sql = getNeonSql();

    const insertedOrders = await sql`
      INSERT INTO orders (
        reference,
        user_id,
        customer,
        customer_email,
        phone,
        location,
        notes,
        product_summary,
        grade_summary,
        subtotal_amount,
        discount_amount,
        total_amount,
        currency,
        item_count,
        status,
        payment_status,
        payment_method,
        pesapal_tracking_id,
        pesapal_merchant_reference,
        mpesa_checkout_request_id,
        mpesa_merchant_request_id,
        updated_at
      ) VALUES (
        ${payload.reference},
        ${userId},
        ${payload.customer},
        ${payload.customerEmail},
        ${payload.phone},
        ${payload.location},
        ${payload.notes},
        ${payload.productSummary},
        ${payload.gradeSummary},
        ${payload.subtotal},
        ${payload.discount},
        ${payload.total},
        ${"KES"},
        ${payload.itemCount},
        ${payload.status},
        ${payload.paymentStatus},
        ${payload.paymentMethod},
        ${payload.pesapalOrderTrackingId},
        ${payload.pesapalMerchantReference},
        ${payload.mpesaCheckoutRequestId},
        ${payload.mpesaMerchantRequestId},
        NOW()
      )
      ON CONFLICT (reference) DO UPDATE
      SET
        customer = EXCLUDED.customer,
        customer_email = EXCLUDED.customer_email,
        phone = EXCLUDED.phone,
        location = EXCLUDED.location,
        notes = EXCLUDED.notes,
        product_summary = EXCLUDED.product_summary,
        grade_summary = EXCLUDED.grade_summary,
        subtotal_amount = EXCLUDED.subtotal_amount,
        discount_amount = EXCLUDED.discount_amount,
        total_amount = EXCLUDED.total_amount,
        item_count = EXCLUDED.item_count,
        status = EXCLUDED.status,
        payment_status = EXCLUDED.payment_status,
        payment_method = EXCLUDED.payment_method,
        pesapal_tracking_id = EXCLUDED.pesapal_tracking_id,
        pesapal_merchant_reference = EXCLUDED.pesapal_merchant_reference,
        mpesa_checkout_request_id = EXCLUDED.mpesa_checkout_request_id,
        mpesa_merchant_request_id = EXCLUDED.mpesa_merchant_request_id,
        updated_at = NOW()
      RETURNING id, reference, status, payment_status AS "paymentStatus", total_amount AS "total", item_count AS "itemCount", payment_method AS "paymentMethod"
    `;

    const orderRow = insertedOrders[0];

    await sql`DELETE FROM order_items WHERE order_id = ${orderRow.id}`;

    for (const item of payload.items) {
      await sql`
        INSERT INTO order_items (
          order_id,
          product_id,
          brand,
          name,
          spec,
          grade,
          quantity,
          price,
          market_price,
          image_url
        ) VALUES (
          ${orderRow.id},
          ${item.id},
          ${item.brand},
          ${item.name},
          ${item.spec},
          ${item.grade},
          ${item.quantity},
          ${item.price},
          ${item.market},
          ${item.image}
        )
      `;
    }

    if (payload.paymentStatus === "paid") {
      for (const item of payload.items) {
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
          WHERE id = ${item.id}
        `;
      }
    }

    return {
      status: 200,
      body: {
        ok: true,
        order: {
          ...payload,
          id: payload.reference,
          userId,
          status: orderRow.status,
          paymentStatus: orderRow.paymentStatus,
        },
      },
    };
  } catch (error) {
    const message = error?.message || "Failed to create order";
    const missingEnv = message.includes("NEON_DATABASE_URL is not configured");
    const missingTables =
      message.toLowerCase().includes("relation \"orders\" does not exist") ||
      message.toLowerCase().includes("relation \"order_items\" does not exist");

    return {
      status: missingEnv ? 503 : missingTables ? 501 : 500,
      body: {
        ok: false,
        message: missingEnv
          ? "Database not configured. Set NEON_DATABASE_URL in backend environment."
          : missingTables
            ? "Order tables not found yet. Apply database migrations first."
            : message,
      },
    };
  }
};

export const getMyOrders = async ({ headers = {} } = {}) => {
  const auth = await verifyClerkRequest(headers);
  if (!auth.ok) {
    return {
      status: auth.status,
      body: { ok: false, message: auth.error },
    };
  }

  try {
    const sql = getNeonSql();
    const userId = auth.payload?.sub || null;

    const items = await sql`
      SELECT
        reference                        AS "id",
        status,
        payment_status                   AS "paymentStatus",
        payment_method                   AS "paymentMethod",
        total_amount                     AS "total",
        item_count                       AS "itemCount",
        created_at                       AS "timestamp",
        tracking_id                      AS "trackingId"
      FROM orders
      WHERE user_id = ${userId}
      ORDER BY created_at DESC NULLS LAST, id DESC
      LIMIT 100
    `;

    return {
      status: 200,
      body: {
        ok: true,
        userId,
        items,
      },
    };
  } catch (error) {
    const message = error?.message || "Failed to load orders";
    const missingEnv = message.includes("NEON_DATABASE_URL is not configured");
    const missingTable = message.toLowerCase().includes("relation \"orders\" does not exist");

    return {
      status: missingEnv ? 503 : missingTable ? 501 : 500,
      body: {
        ok: false,
        message: missingEnv
          ? "Database not configured. Set NEON_DATABASE_URL in backend environment."
          : missingTable
            ? "Orders table not found yet. Apply database migrations first."
            : message,
        userId: auth.payload?.sub || null,
      },
    };
  }
};
