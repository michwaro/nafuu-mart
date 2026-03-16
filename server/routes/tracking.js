import { getNeonSql } from "../lib/neonClient.js";

export const getOrderTracking = async ({ reference } = {}) => {
  if (!reference) {
    return {
      status: 400,
      body: { ok: false, message: "Order reference is required" },
    };
  }

  try {
    const sql = getNeonSql();
    const rows = await sql`
      SELECT
        reference AS id,
        reference,
        status,
        tracking_id AS "trackingId",
        courier_name AS "courierName",
        courier_ref AS "courierRef",
        item_count AS "itemCount",
        total_amount AS total,
        payment_status AS "paymentStatus",
        payment_method AS "paymentMethod",
        created_at AS timestamp,
        updated_at AS "updatedAt"
      FROM orders
      WHERE reference = ${reference}
      LIMIT 1
    `;

    const order = rows[0];
    if (!order) {
      return {
        status: 404,
        body: {
          ok: false,
          message: "Order reference not found",
          reference,
        },
      };
    }

    return {
      status: 200,
      body: {
        ok: true,
        order,
      },
    };
  } catch (error) {
    const message = error?.message || "Failed to load tracking details";
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
        reference,
      },
    };
  }
};
