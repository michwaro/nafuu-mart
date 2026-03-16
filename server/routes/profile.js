import { verifyClerkRequest } from "../lib/clerkAuth.js";
import { getNeonSql } from "../lib/neonClient.js";

const normalizeAddress = (address = {}, fallbackName = "") => ({
  id: String(address.id || `addr-${Date.now()}`),
  label: String(address.label || "Home").trim(),
  recipientName: String(address.recipientName || fallbackName || "").trim(),
  phone: String(address.phone || "").trim(),
  county: String(address.county || "Mombasa").trim(),
  town: String(address.town || "").trim(),
  addressLine: String(address.addressLine || "").trim(),
  landmark: String(address.landmark || "").trim(),
});

const normalizeCard = (card = {}) => ({
  id: String(card.id || `card-${Date.now()}`),
  brand: String(card.brand || "Card").trim(),
  holder: String(card.holder || "").trim(),
  last4: String(card.last4 || "").replace(/\D/g, "").slice(-4),
  expMonth: String(card.expMonth || "").trim(),
  expYear: String(card.expYear || "").trim(),
});

const normalizeProfilePayload = (body = {}, fallbackEmail = "", fallbackName = "") => {
  const addresses = Array.isArray(body.addresses) && body.addresses.length > 0
    ? body.addresses.map((address) => normalizeAddress(address, fallbackName))
    : [normalizeAddress(body, fallbackName)];
  const defaultAddressId = addresses.some((address) => address.id === body.defaultAddressId)
    ? String(body.defaultAddressId)
    : addresses[0]?.id || "";
  const defaultAddress = addresses.find((address) => address.id === defaultAddressId) || addresses[0] || normalizeAddress({}, fallbackName);

  return {
    fullName: String(body.fullName || fallbackName || "").trim(),
    email: String(body.email || fallbackEmail || "").trim() || null,
    phone: String(body.phone || "").trim(),
    altPhone: String(body.altPhone || "").trim(),
    profilePicture: String(body.profilePicture || "").trim(),
    bio: String(body.bio || "").trim(),
    preferredContact: String(body.preferredContact || "whatsapp").trim(),
    notifyEmail: Boolean(body.notifyEmail ?? true),
    notifySms: Boolean(body.notifySms ?? true),
    notifyDeals: Boolean(body.notifyDeals ?? false),
    mpesaPhone: String(body.mpesaPhone || "").trim(),
    mpesaName: String(body.mpesaName || fallbackName || "").trim(),
    mpesaDefault: Boolean(body.mpesaDefault ?? true),
    cards: Array.isArray(body.cards) ? body.cards.map(normalizeCard) : [],
    defaultCardId: String(body.defaultCardId || "").trim(),
    addresses,
    defaultAddressId,
    county: defaultAddress.county,
    town: defaultAddress.town,
    addressLine: defaultAddress.addressLine,
    landmark: defaultAddress.landmark,
  };
};

const mapProfileRow = (row = {}) => ({
  fullName: row.fullName || "",
  email: row.email || "",
  phone: row.phone || "",
  altPhone: row.altPhone || "",
  profilePicture: row.profilePicture || "",
  bio: row.bio || "",
  preferredContact: row.preferredContact || "whatsapp",
  notifyEmail: Boolean(row.notifyEmail),
  notifySms: Boolean(row.notifySms),
  notifyDeals: Boolean(row.notifyDeals),
  mpesaPhone: row.mpesaPhone || "",
  mpesaName: row.mpesaName || "",
  mpesaDefault: Boolean(row.mpesaDefault),
  cards: Array.isArray(row.cards) ? row.cards : [],
  defaultCardId: row.defaultCardId || "",
  addresses: Array.isArray(row.addresses) ? row.addresses : [],
  defaultAddressId: row.defaultAddressId || "",
  county: row.county || "Mombasa",
  town: row.town || "",
  addressLine: row.addressLine || "",
  landmark: row.landmark || "",
  updatedAt: row.updatedAt || null,
  createdAt: row.createdAt || null,
});

export const getMyProfile = async ({ headers = {} } = {}) => {
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
    const email = auth.payload?.email || auth.payload?.email_address || null;
    const fallbackName = [auth.payload?.given_name, auth.payload?.family_name].filter(Boolean).join(" ").trim() || auth.payload?.name || "";

    const rows = await sql`
      SELECT
        user_id AS "userId",
        email,
        full_name AS "fullName",
        phone,
        alt_phone AS "altPhone",
        profile_picture AS "profilePicture",
        bio,
        preferred_contact AS "preferredContact",
        notify_email AS "notifyEmail",
        notify_sms AS "notifySms",
        notify_deals AS "notifyDeals",
        mpesa_phone AS "mpesaPhone",
        mpesa_name AS "mpesaName",
        mpesa_default AS "mpesaDefault",
        cards,
        default_card_id AS "defaultCardId",
        addresses,
        default_address_id AS "defaultAddressId",
        county,
        town,
        address_line AS "addressLine",
        landmark,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM user_profiles
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    if (!rows[0]) {
      return {
        status: 404,
        body: {
          ok: false,
          message: "Profile not found",
          profile: normalizeProfilePayload({}, email, fallbackName),
        },
      };
    }

    return {
      status: 200,
      body: {
        ok: true,
        profile: mapProfileRow(rows[0]),
      },
    };
  } catch (error) {
    return {
      status: 500,
      body: { ok: false, message: error?.message || "Failed to load profile" },
    };
  }
};

export const upsertMyProfile = async ({ headers = {}, body = {} } = {}) => {
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
    const email = auth.payload?.email || auth.payload?.email_address || null;
    const fallbackName = [auth.payload?.given_name, auth.payload?.family_name].filter(Boolean).join(" ").trim() || auth.payload?.name || "";
    const payload = normalizeProfilePayload(body, email, fallbackName);

    const rows = await sql`
      INSERT INTO user_profiles (
        user_id,
        email,
        full_name,
        phone,
        alt_phone,
        profile_picture,
        bio,
        preferred_contact,
        notify_email,
        notify_sms,
        notify_deals,
        mpesa_phone,
        mpesa_name,
        mpesa_default,
        cards,
        default_card_id,
        addresses,
        default_address_id,
        county,
        town,
        address_line,
        landmark,
        updated_at
      ) VALUES (
        ${userId},
        ${payload.email},
        ${payload.fullName},
        ${payload.phone},
        ${payload.altPhone},
        ${payload.profilePicture},
        ${payload.bio},
        ${payload.preferredContact},
        ${payload.notifyEmail},
        ${payload.notifySms},
        ${payload.notifyDeals},
        ${payload.mpesaPhone},
        ${payload.mpesaName},
        ${payload.mpesaDefault},
        ${JSON.stringify(payload.cards)},
        ${payload.defaultCardId},
        ${JSON.stringify(payload.addresses)},
        ${payload.defaultAddressId},
        ${payload.county},
        ${payload.town},
        ${payload.addressLine},
        ${payload.landmark},
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE
      SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        alt_phone = EXCLUDED.alt_phone,
        profile_picture = EXCLUDED.profile_picture,
        bio = EXCLUDED.bio,
        preferred_contact = EXCLUDED.preferred_contact,
        notify_email = EXCLUDED.notify_email,
        notify_sms = EXCLUDED.notify_sms,
        notify_deals = EXCLUDED.notify_deals,
        mpesa_phone = EXCLUDED.mpesa_phone,
        mpesa_name = EXCLUDED.mpesa_name,
        mpesa_default = EXCLUDED.mpesa_default,
        cards = EXCLUDED.cards,
        default_card_id = EXCLUDED.default_card_id,
        addresses = EXCLUDED.addresses,
        default_address_id = EXCLUDED.default_address_id,
        county = EXCLUDED.county,
        town = EXCLUDED.town,
        address_line = EXCLUDED.address_line,
        landmark = EXCLUDED.landmark,
        updated_at = NOW()
      RETURNING
        user_id AS "userId",
        email,
        full_name AS "fullName",
        phone,
        alt_phone AS "altPhone",
        profile_picture AS "profilePicture",
        bio,
        preferred_contact AS "preferredContact",
        notify_email AS "notifyEmail",
        notify_sms AS "notifySms",
        notify_deals AS "notifyDeals",
        mpesa_phone AS "mpesaPhone",
        mpesa_name AS "mpesaName",
        mpesa_default AS "mpesaDefault",
        cards,
        default_card_id AS "defaultCardId",
        addresses,
        default_address_id AS "defaultAddressId",
        county,
        town,
        address_line AS "addressLine",
        landmark,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `;

    return {
      status: 200,
      body: {
        ok: true,
        profile: mapProfileRow(rows[0]),
      },
    };
  } catch (error) {
    const message = error?.message || "Failed to save profile";
    const missingTables = message.toLowerCase().includes("relation \"user_profiles\" does not exist");
    return {
      status: missingTables ? 501 : 500,
      body: {
        ok: false,
        message: missingTables ? "Profile tables not found yet. Apply database migrations first." : message,
      },
    };
  }
};