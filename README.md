# Nafuu Mart

Nafuu Mart is a React + Vite storefront with product browsing, order flow, legal pages, and a Back Market-inspired auth experience.

## Auth Setup (Offline-First)

Auth is now configured to support both local offline development and Supabase.

1. Copy `.env.example` to `.env.local`.
2. Choose auth mode with `VITE_AUTH_MODE`:
	- `auto`: Use Supabase when keys exist, otherwise fallback to local offline auth.
	- `local`: Force offline local auth only.
	- `supabase`: Force Supabase only.
3. For Supabase mode, set:
	- `VITE_SUPABASE_URL`
	- `VITE_SUPABASE_ANON_KEY`

If no Supabase keys are present, the app keeps working fully offline using browser local storage for sign in/sign up during development.

### Password Reset And Email Verification

When Supabase is active:

1. Sign-up can require email verification before sign-in.
2. "Forgot password" sends a reset email.
3. Reset links return to your app and open the reset-password screen.

For Supabase Auth email templates, use your app URL as redirect target (for example your local dev URL or deployed domain).

When running in `local` mode, reset and verification flows are simulated so you can continue offline development.

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
