import { verifyClerkRequest } from "../lib/clerkAuth.js";
import { getNeonSql } from "../lib/neonClient.js";

/**
 * GET /api/stock-alerts/me
 * Returns the authenticated user's active stock alert product IDs.
 */
export const getMyStockAlerts = async ({ headers }) => {
  const auth = await verifyClerkRequest(headers);
  if (!auth.ok) return { status: auth.status || 401, body: { ok: false, message: auth.error } };

  const clerkUserId = auth.payload?.sub;
  if (!clerkUserId) return { status: 401, body: { ok: false, message: "Invalid token payload" } };

  try {
    const sql = getNeonSql();
    const rows = await sql`
      SELECT product_id, product_name, email
      FROM user_stock_alerts
      WHERE clerk_user_id = ${clerkUserId}
      ORDER BY created_at ASC
    `;
    const alerts = rows.map((r) => ({
      id: r.product_id,
      name: r.product_name,
      email: r.email,
    }));
    return { status: 200, body: { ok: true, alerts } };
  } catch (error) {
    console.error("getMyStockAlerts error:", error);
    return { status: 500, body: { ok: false, message: "Failed to fetch stock alerts" } };
  }
};

/**
 * PUT /api/stock-alerts/me
 * Replaces the authenticated user's alert list.
 * Body: { alerts: [{ id, name, email }] }
 */
export const upsertMyStockAlerts = async ({ headers, body }) => {
  const auth = await verifyClerkRequest(headers);
  if (!auth.ok) return { status: auth.status || 401, body: { ok: false, message: auth.error } };

  const clerkUserId = auth.payload?.sub;
  if (!clerkUserId) return { status: 401, body: { ok: false, message: "Invalid token payload" } };

  const alerts = Array.isArray(body?.alerts) ? body.alerts : [];

  try {
    const sql = getNeonSql();

    await sql`DELETE FROM user_stock_alerts WHERE clerk_user_id = ${clerkUserId}`;

    for (const alert of alerts) {
      const productId = String(alert?.id || "").trim();
      if (!productId) continue;
      await sql`
        INSERT INTO user_stock_alerts (clerk_user_id, product_id, product_name, email)
        VALUES (
          ${clerkUserId},
          ${productId},
          ${String(alert.name || "").trim()},
          ${String(alert.email || "").trim()}
        )
        ON CONFLICT (clerk_user_id, product_id) DO UPDATE
          SET product_name = EXCLUDED.product_name, email = EXCLUDED.email
      `;
    }

    return { status: 200, body: { ok: true, count: alerts.length } };
  } catch (error) {
    console.error("upsertMyStockAlerts error:", error);
    return { status: 500, body: { ok: false, message: "Failed to save stock alerts" } };
  }
};
