import { verifyClerkRequest } from "../lib/clerkAuth.js";
import { getNeonSql } from "../lib/neonClient.js";

/**
 * GET /api/wishlist/me
 * Returns the authenticated user's wishlist as an array of product snapshots.
 */
export const getMyWishlist = async ({ headers }) => {
  const auth = await verifyClerkRequest(headers);
  if (!auth.ok) return { status: auth.status || 401, body: { ok: false, message: auth.error } };

  const clerkUserId = auth.payload?.sub;
  if (!clerkUserId) return { status: 401, body: { ok: false, message: "Invalid token payload" } };

  try {
    const sql = getNeonSql();
    const rows = await sql`
      SELECT product_id, product_snapshot
      FROM user_wishlists
      WHERE clerk_user_id = ${clerkUserId}
      ORDER BY created_at ASC
    `;
    const items = rows.map((r) => ({
      id: r.product_id,
      ...(r.product_snapshot || {}),
    }));
    return { status: 200, body: { ok: true, items } };
  } catch (error) {
    console.error("getMyWishlist error:", error);
    return { status: 500, body: { ok: false, message: "Failed to fetch wishlist" } };
  }
};

/**
 * PUT /api/wishlist/me
 * Replaces the authenticated user's wishlist with the supplied array.
 * Body: { items: [{ id, ...productSnapshot }] }
 */
export const upsertMyWishlist = async ({ headers, body }) => {
  const auth = await verifyClerkRequest(headers);
  if (!auth.ok) return { status: auth.status || 401, body: { ok: false, message: auth.error } };

  const clerkUserId = auth.payload?.sub;
  if (!clerkUserId) return { status: 401, body: { ok: false, message: "Invalid token payload" } };

  const items = Array.isArray(body?.items) ? body.items : [];

  try {
    const sql = getNeonSql();

    // Delete all existing rows for this user and re-insert (simple replace approach)
    await sql`DELETE FROM user_wishlists WHERE clerk_user_id = ${clerkUserId}`;

    if (items.length > 0) {
      for (const item of items) {
        const productId = String(item?.id || "").trim();
        if (!productId) continue;
        const { id: _id, ...snapshot } = item; // strip id from snapshot since it's stored separately
        await sql`
          INSERT INTO user_wishlists (clerk_user_id, product_id, product_snapshot)
          VALUES (${clerkUserId}, ${productId}, ${JSON.stringify(snapshot)})
          ON CONFLICT (clerk_user_id, product_id) DO UPDATE
            SET product_snapshot = EXCLUDED.product_snapshot
        `;
      }
    }

    return { status: 200, body: { ok: true, count: items.length } };
  } catch (error) {
    console.error("upsertMyWishlist error:", error);
    return { status: 500, body: { ok: false, message: "Failed to save wishlist" } };
  }
};
