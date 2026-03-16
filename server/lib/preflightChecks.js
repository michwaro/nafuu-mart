export const buildPreflightReport = (env = process.env) => {
  const envMode = String(env.VITE_AUTH_MODE || "auto").toLowerCase();
  const mpesaSimulationExplicit = String(env.MPESA_SIMULATION || "").toLowerCase() === "true";
  const has = (key) => Boolean(String(env[key] || "").trim());
  const isPlaceholder = (value) => {
    const str = String(value || "").toLowerCase().trim();
    return /^(replace_|placeholder|xxxxx|pending|todo|example|sample|changeme|fixme|temp_|n\/a|none|null|undefined)/.test(str)
      || str.length === 0;
  };
  const mpesaSimulationAuto =
    String(env.MPESA_BASE_URL || "").toLowerCase().includes("sandbox.safaricom.co.ke") &&
    (isPlaceholder(env.MPESA_SHORTCODE) || isPlaceholder(env.MPESA_PASSKEY));
  const mpesaSimulation = mpesaSimulationExplicit || mpesaSimulationAuto;

  const rows = [
    { key: "VITE_API_BASE_URL", required: true, scope: "frontend", note: "Base URL for API calls" },
    { key: "NEON_DATABASE_URL", required: true, scope: "backend", note: "Neon database connection" },
    { key: "CLERK_SECRET_KEY", required: true, scope: "backend", note: "Server-side Clerk token verification" },
    { key: "PESAPAL_CONSUMER_KEY", required: true, scope: "backend", note: "Pesapal auth" },
    { key: "PESAPAL_CONSUMER_SECRET", required: true, scope: "backend", note: "Pesapal auth" },
    {
      key: "PESAPAL_IPN_ID",
      required: true,
      scope: "backend",
      note: "Pesapal notifications",
      validate: (val) => !isPlaceholder(val),
      validateFailMessage: "must be a real Pesapal IPN ID (not a placeholder like REPLACE_WITH_...)",
    },
    {
      key: "MPESA_CONSUMER_KEY",
      required: !mpesaSimulation,
      scope: "backend",
      note: "Daraja auth consumer key",
      validate: (val) => !isPlaceholder(val),
      validateFailMessage: "must be a real Daraja consumer key",
    },
    {
      key: "MPESA_CONSUMER_SECRET",
      required: !mpesaSimulation,
      scope: "backend",
      note: "Daraja auth consumer secret",
      validate: (val) => !isPlaceholder(val),
      validateFailMessage: "must be a real Daraja consumer secret",
    },
    {
      key: "MPESA_SIMULATION",
      required: false,
      scope: "backend",
      note: "Set true to force mock M-Pesa simulation (safe for pre-live testing)",
      validate: (val) => {
        if (!String(val || "").trim()) return true;
        const normalized = String(val || "").toLowerCase();
        return normalized === "true" || normalized === "false";
      },
      validateFailMessage: "must be true or false when set",
    },
    {
      key: "MPESA_SHORTCODE",
      required: !mpesaSimulation,
      scope: "backend",
      note: mpesaSimulation
        ? "M-Pesa shortcode/paybill (optional in simulation mode)"
        : "M-Pesa shortcode/paybill for live STK",
      validate: (val) => mpesaSimulation || !isPlaceholder(val),
      validateFailMessage: "must be a real shortcode/paybill in live mode",
    },
    {
      key: "MPESA_PASSKEY",
      required: !mpesaSimulation,
      scope: "backend",
      note: mpesaSimulation
        ? "Daraja STK passkey (optional in simulation mode)"
        : "Daraja STK passkey for live STK",
      validate: (val) => mpesaSimulation || !isPlaceholder(val),
      validateFailMessage: "must be a real Daraja passkey in live mode",
    },
    {
      key: "MPESA_CALLBACK_URL",
      required: !mpesaSimulation,
      scope: "backend",
      note: "Public callback URL for Daraja STK confirmations",
      validate: (val) => {
        const str = String(val || "").trim().toLowerCase();
        if (!str || isPlaceholder(str)) return false;
        return str.startsWith("https://") || str.startsWith("http://localhost");
      },
      validateFailMessage: "must be a valid URL (https://... in production)",
    },
    {
      key: "VITE_CLERK_PUBLISHABLE_KEY",
      required: envMode === "clerk" || envMode === "auto",
      scope: "frontend",
      note: "Required for Clerk hosted auth",
    },
    {
      key: "VITE_SUPABASE_URL",
      required: envMode === "supabase",
      scope: "frontend",
      note: "Required when forcing Supabase mode",
    },
    {
      key: "VITE_SUPABASE_ANON_KEY",
      required: envMode === "supabase",
      scope: "frontend",
      note: "Required when forcing Supabase mode",
    },
  ].map((item) => {
    const present = has(item.key);
    const valid = !present || !item.validate || item.validate(env[item.key]);
    return {
      ...item,
      present,
      valid,
    };
  });

  const missingRequired = rows.filter((row) => row.required && !row.present).map((row) => row.key);
  const invalidRequired = rows.filter((row) => row.required && row.present && !row.valid);
  const allIssues = [...missingRequired];
  if (invalidRequired.length > 0) {
    allIssues.push(
      ...invalidRequired.map((row) => `${row.key} (${row.validateFailMessage || "invalid"})`)
    );
  }

  const checks = Object.fromEntries(rows.map((row) => [row.key, row.present && row.valid]));

  return {
    ok: missingRequired.length === 0 && invalidRequired.length === 0,
    envMode,
    checks,
    rows,
    missingRequired,
    invalidRequired,
    allIssues,
  };
};
