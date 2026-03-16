/**
 * Clerk-only authentication provider.
 * Clerk handles all user management, password resets, social sign-in, and session persistence.
 */

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

/**
 * Verify Clerk configuration is available.
 * Throws if VITE_CLERK_PUBLISHABLE_KEY is missing.
 */
const ensureClerkConfig = () => {
  if (!clerkPublishableKey) {
    throw new Error("VITE_CLERK_PUBLISHABLE_KEY is not configured. Add it to .env and restart the app.");
  }
};

/**
 * Convert Clerk user object to normalized Nafuu user.
 */
const normalizeUser = (clerkUser) => {
  if (!clerkUser) return null;

  const email = clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || "";
  const adminEmails = ["admin@nafuumart.com", "admin@nafuumart.co.ke"];
  const isAdmin = adminEmails.includes(email.toLowerCase());

  return {
    name:
      clerkUser.firstName && clerkUser.lastName
        ? `${clerkUser.firstName} ${clerkUser.lastName}`
        : clerkUser.firstName
        ? clerkUser.firstName
        : email.split("@")[0] || "Nafuu User",
    email,
    isAdmin,
  };
};

/**
 * Get Clerk auth runtime status.
 */
export const getAuthRuntime = () => {
  if (!clerkPublishableKey) {
    return {
      mode: "clerk",
      detail: "Clerk is not configured. Set VITE_CLERK_PUBLISHABLE_KEY in .env",
      ready: false,
    };
  }
  return {
    mode: "clerk",
    detail: "Clerk authentication is configured.",
    ready: true,
  };
};

/**
 * Restore the current Clerk session.
 * Clerk persists sessions automatically, so this just normalizes the current user.
 */
export const restoreSession = async () => {
  try {
    ensureClerkConfig();
    const clerkUser = window.Clerk?.user;
    if (!clerkUser) {
      return { user: null, provider: "clerk" };
    }
    return { user: normalizeUser(clerkUser), provider: "clerk" };
  } catch {
    return { user: null, provider: "clerk" };
  }
};

/**
 * Sign in via Clerk using email/password.
 * This is handled by Clerk's <SignIn /> UI component.
 * Kept for API compatibility but delegates to Clerk UI.
 */
export const authSignIn = async () => {
  ensureClerkConfig();
  throw new Error("Use the Clerk <SignIn /> UI component for sign-in. Email/password auth is handled by Clerk.");
};

/**
 * Sign up via Clerk using email/password.
 * This is handled by Clerk's <SignUp /> UI component.
 * Kept for API compatibility but delegates to Clerk UI.
 */
export const authSignUp = async () => {
  ensureClerkConfig();
  throw new Error("Use the Clerk <SignUp /> UI component for sign-up. Email/password auth is handled by Clerk.");
};

/**
 * Sign out the current user from Clerk.
 */
export const authSignOut = async () => {
  try {
    ensureClerkConfig();
    if (window.Clerk) {
      await window.Clerk.signOut();
      return true;
    }
  } catch (err) {
    console.error("Clerk sign-out error:", err);
  }
  return true;
};

/**
 * Request a password reset via Clerk.
 * This is handled by Clerk's <ForgotPassword /> UI component.
 * Kept for API compatibility but delegates to Clerk UI.
 */
export const authRequestPasswordReset = async () => {
  ensureClerkConfig();
  throw new Error("Use the Clerk <ForgotPassword /> UI component for password reset.");
};

/**
 * Update user password via Clerk.
 * This is handled by Clerk's <UserProfile /> component (Account tab).
 * Kept for API compatibility but delegates to Clerk UI.
 */
export const authUpdatePassword = async () => {
  ensureClerkConfig();
  throw new Error("Use the Clerk <UserProfile /> component to update password.");
};

/**
 * Resend verification email via Clerk.
 * This is handled by Clerk automatically after sign-up.
 * Kept for API compatibility but delegates to Clerk UI.
 */
export const authResendVerification = async () => {
  ensureClerkConfig();
  throw new Error("Clerk handles email verification automatically.");
};

/**
 * Subscribe to Clerk user state changes.
 * Returns an unsubscribe function.
 */
export const authSubscribeToAuthChanges = (callback) => {
  if (!window.Clerk) {
    return () => {};
  }

  try {
    const { user } = window.Clerk;
    if (user) {
      callback(normalizeUser(user));
    }

    // Clerk updates are pushed via session changes.
    // Listen for Clerk load and navigate events if available.
    const handleClerkLoad = () => {
      const updated = window.Clerk?.user;
      if (updated) {
        callback(normalizeUser(updated));
      }
    };

    // If Clerk emits custom events, listen to them
    if (typeof window.addEventListener === "function") {
      window.addEventListener("clerk:loaded", handleClerkLoad);
      window.addEventListener("clerk:updated", handleClerkLoad);

      return () => {
        window.removeEventListener("clerk:loaded", handleClerkLoad);
        window.removeEventListener("clerk:updated", handleClerkLoad);
      };
    }

    return () => {};
  } catch {
    return () => {};
  }
};

