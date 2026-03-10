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

## Payment Integration

### Pesapal Setup (Card & Mobile Money Payments)

Nafuu Mart integrates with Pesapal to accept payments via:
- Visa & Mastercard credit/debit cards
- M-Pesa mobile money
- Airtel Money

**Setup Steps:**

1. **Create Pesapal Account**
   - Sign up at [https://www.pesapal.com](https://www.pesapal.com)
   - Complete business verification

2. **Get API Credentials**
   - Log in to Pesapal dashboard
   - Navigate to Settings → API Keys
   - Copy your Consumer Key and Consumer Secret

3. **Configure IPN (Instant Payment Notification)**
   - In Pesapal dashboard, go to Settings → IPN
   - Set IPN URL to: `https://yourdomain.com/payment-callback`
   - Save and copy your IPN ID

4. **Add to Environment Variables**
   - Copy `.env.example` to `.env.local`
   - Add your Pesapal credentials:
     ```
     VITE_PESAPAL_CONSUMER_KEY=your_consumer_key
     VITE_PESAPAL_CONSUMER_SECRET=your_consumer_secret
     VITE_PESAPAL_IPN_ID=your_ipn_id
     VITE_PESAPAL_BASE_URL=https://cybqa.pesapal.com/pesapalv3
     ```

5. **Testing**
   - Use sandbox URL: `https://cybqa.pesapal.com/pesapalv3`
   - Use test cards provided in Pesapal documentation
   - Test M-Pesa: Use test phone numbers from Pesapal sandbox

6. **Go to Production**
   - Change `VITE_PESAPAL_BASE_URL` to: `https://pay.pesapal.com/v3`
   - Use production API credentials
   - Update IPN URL to production domain

**Payment Flow:**
1. Customer selects "Pesapal (Cards + Airtel)" payment option
2. Order is created with "pending_payment" status
3. Customer is redirected to Pesapal payment page
4. After payment, customer returns to your site
5. App automatically checks payment status via Pesapal API
6. Order status updates to "confirmed" if payment successful
7. Email confirmation sent & inventory reduced
