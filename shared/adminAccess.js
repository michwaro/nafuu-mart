export const ADMIN_EMAILS = ["nyamongokevin@gmail.com"];

export const normalizeEmail = (value = "") => String(value || "").trim().toLowerCase();

export const isAllowedAdminEmail = (email, adminEmails = ADMIN_EMAILS) => {
  const normalizedEmail = normalizeEmail(email);
  return normalizedEmail ? adminEmails.includes(normalizedEmail) : false;
};

export const hasAdminAccess = ({
  email = "",
  publicMetadata = {},
  unsafeMetadata = {},
  privateMetadata = {},
  role = "",
} = {}) => {
  return Boolean(
    isAllowedAdminEmail(email) ||
      publicMetadata?.isAdmin ||
      unsafeMetadata?.isAdmin ||
      privateMetadata?.isAdmin ||
      role === "org:admin" ||
      role === "admin"
  );
};