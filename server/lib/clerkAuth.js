import { verifyToken } from "@clerk/backend";
import { hasAdminAccess, normalizeEmail } from "../../shared/adminAccess.js";

export const getBearerToken = (headers = {}) => {
  const authHeader = headers.authorization || headers.Authorization || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
};

export const verifyClerkRequest = async (headers = {}) => {
  const token = getBearerToken(headers);
  if (!token) {
    return { ok: false, status: 401, error: "Missing bearer token" };
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return { ok: false, status: 500, error: "CLERK_SECRET_KEY is not configured" };
  }

  try {
    const payload = await verifyToken(token, { secretKey });
    return { ok: true, payload };
  } catch (error) {
    return { ok: false, status: 401, error: error?.message || "Invalid auth token" };
  }
};

export const isAdminPayload = (payload = {}) => {
  const publicMetadata = payload.publicMetadata || payload.public_metadata || {};
  const unsafeMetadata = payload.unsafeMetadata || payload.unsafe_metadata || {};
  const privateMetadata = payload.privateMetadata || payload.private_metadata || {};
  const role = payload.orgRole || payload.org_role || payload.role || "";
  const emailFromPayload = normalizeEmail(
    payload.email ||
      payload.emailAddress ||
      payload.email_address ||
      payload.primaryEmailAddress ||
      payload.primary_email_address ||
      ""
  );

  return hasAdminAccess({
    email: emailFromPayload,
    publicMetadata,
    unsafeMetadata,
    privateMetadata,
    role,
  });
};

export const requireAdminRequest = async (headers = {}) => {
  const auth = await verifyClerkRequest(headers);
  if (!auth.ok) return auth;

  if (!isAdminPayload(auth.payload)) {
    return { ok: false, status: 403, error: "Admin access is required" };
  }

  return auth;
};
