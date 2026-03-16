import { neon } from "@neondatabase/serverless";

/**
 * Server-only Neon SQL client scaffold for PR1 foundation.
 */
export const getNeonSql = () => {
  const connectionString = process.env.NEON_DATABASE_URL || "";
  if (!connectionString) {
    throw new Error("NEON_DATABASE_URL is not configured.");
  }
  return neon(connectionString);
};
