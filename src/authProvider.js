import { createClient } from "@supabase/supabase-js";

const LOCAL_USERS_KEY = "nafuu-users";
const LOCAL_SESSION_KEY = "nafuu-session";
const LOCAL_RESET_EMAIL_KEY = "nafuu-reset-email";

const envMode = (import.meta.env.VITE_AUTH_MODE || "auto").toLowerCase();
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
const canUseSupabase = envMode === "supabase" || (envMode === "auto" && hasSupabaseConfig);

const supabase = canUseSupabase
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

const normalizeUser = (user) => {
  if (!user) return null;
  return {
    name: user.user_metadata?.name || user.email?.split("@")[0] || "Nafuu User",
    email: user.email || "",
    isAdmin: Boolean(user.user_metadata?.isAdmin),
  };
};

const getLocalUsers = () => {
  try {
    const raw = window.localStorage.getItem(LOCAL_USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const setLocalUsers = (users) => {
  window.localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
};

const getLocalSession = () => {
  try {
    const raw = window.localStorage.getItem(LOCAL_SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.email ? parsed : null;
  } catch {
    return null;
  }
};

const setLocalSession = (session) => {
  window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
};

const clearLocalSession = () => {
  window.localStorage.removeItem(LOCAL_SESSION_KEY);
};

const setLocalResetEmail = (email) => {
  window.localStorage.setItem(LOCAL_RESET_EMAIL_KEY, email);
};

const getLocalResetEmail = () => {
  return window.localStorage.getItem(LOCAL_RESET_EMAIL_KEY) || "";
};

const clearLocalResetEmail = () => {
  window.localStorage.removeItem(LOCAL_RESET_EMAIL_KEY);
};

const signInLocal = ({ email, password }) => {
  const users = getLocalUsers();
  const match = users.find((u) => u.email === email && u.password === password);
  if (!match) throw new Error("Incorrect email or password. Please try again.");

  const user = { name: match.name, email: match.email, isAdmin: Boolean(match.isAdmin) };
  setLocalSession(user);
  return { user, provider: "local" };
};

const signUpLocal = ({ name, email, password }) => {
  const users = getLocalUsers();
  const exists = users.some((u) => u.email === email);
  if (exists) throw new Error("An account with this email already exists. Sign in instead.");

  // First user or specific emails become admin
  const adminEmails = ["admin@nafuumart.com", "admin@nafuumart.co.ke"];
  const isAdmin = users.length === 0 || adminEmails.includes(email.toLowerCase());
  const profile = { name, email, password, isAdmin, createdAt: Date.now() };
  setLocalUsers([profile, ...users]);
  const user = { name: profile.name, email: profile.email, isAdmin };
  setLocalSession(user);
  return { user, provider: "local", pendingConfirmation: false };
};

export const getAuthRuntime = () => {
  if (canUseSupabase) {
    return {
      mode: "supabase",
      detail: "Supabase auth is active.",
    };
  }

  return {
    mode: "local",
    detail: hasSupabaseConfig
      ? "Offline mode active by configuration."
      : "Offline-first local auth active (no Supabase keys found).",
  };
};

export const isSupabaseMode = () => Boolean(supabase);

export const restoreSession = async () => {
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const user = normalizeUser(data?.session?.user);
      if (user) return { user, provider: "supabase" };
    } catch {
      if (envMode === "supabase") throw new Error("Could not restore Supabase session.");
    }
  }

  const user = getLocalSession();
  return { user, provider: "local" };
};

export const authSignIn = async ({ email, password }) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const user = normalizeUser(data?.user);
      if (!user) throw new Error("Sign-in failed. Please try again.");
      return { user, provider: "supabase" };
    } catch (err) {
      if (envMode === "supabase") throw new Error(err.message || "Supabase sign-in failed.");
    }
  }

  return signInLocal({ email, password });
};

export const authSignUp = async ({ name, email, password }) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      if (error) throw error;

      const user = normalizeUser(data?.user);
      const pendingConfirmation = Boolean(data?.user && !data?.session);

      if (!user) throw new Error("Sign-up failed. Please try again.");
      return { user, provider: "supabase", pendingConfirmation };
    } catch (err) {
      if (envMode === "supabase") throw new Error(err.message || "Supabase sign-up failed.");
    }
  }

  return signUpLocal({ name, email, password });
};

export const authSignOut = async () => {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      if (envMode === "supabase") throw new Error("Unable to sign out from Supabase.");
    }
  }

  clearLocalSession();
  return true;
};

export const authRequestPasswordReset = async ({ email, redirectTo }) => {
  if (supabase) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
      return { provider: "supabase", sent: true };
    } catch (err) {
      if (envMode === "supabase") throw new Error(err.message || "Could not send password reset email.");
    }
  }

  const users = getLocalUsers();
  const exists = users.some((u) => u.email === email);
  if (exists) setLocalResetEmail(email);
  return { provider: "local", sent: true, simulated: true };
};

export const authUpdatePassword = async ({ password }) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      const user = normalizeUser(data?.user);
      return { provider: "supabase", user };
    } catch (err) {
      if (envMode === "supabase") throw new Error(err.message || "Could not update password.");
    }
  }

  const targetEmail = getLocalResetEmail() || getLocalSession()?.email;
  if (!targetEmail) throw new Error("In local mode, request a password reset first.");

  const users = getLocalUsers();
  const idx = users.findIndex((u) => u.email === targetEmail);
  if (idx === -1) throw new Error("Account not found for password reset.");

  users[idx] = { ...users[idx], password };
  setLocalUsers(users);
  clearLocalResetEmail();
  return { provider: "local", user: { name: users[idx].name, email: users[idx].email } };
};

export const authResendVerification = async ({ email, redirectTo }) => {
  if (supabase) {
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      return { provider: "supabase", sent: true };
    } catch (err) {
      if (envMode === "supabase") throw new Error(err.message || "Could not resend verification email.");
    }
  }

  return { provider: "local", sent: true, simulated: true };
};

export const authSignInWithOAuth = async ({ provider, redirectTo }) => {
  if (!supabase) {
    throw new Error("Social sign-in is available only when Supabase mode is active.");
  }

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });
    if (error) throw error;
    return { provider: "supabase", started: true };
  } catch (err) {
    throw new Error(err.message || "Could not start social sign-in.");
  }
};
