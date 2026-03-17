# Nafuu Mart

Nafuu Mart is a React + Vite storefront with product browsing, order flow, legal pages, and a Back Market-inspired auth experience.

## Auth Setup (Clerk + Fallback Modes)

Auth supports Clerk as primary, with optional Supabase/local fallback modes for incremental migration.

1. Copy `.env.example` to `.env.local`.
2. Choose auth mode with `VITE_AUTH_MODE`:
   - `auto`: Use Clerk when configured, else Supabase when keys exist, else fallback to local offline auth.
   - `clerk`: Force Clerk-hosted auth UI and session handling.
	- `local`: Force offline local auth only.
	- `supabase`: Force Supabase only.
3. For Clerk mode, set:
   - `VITE_CLERK_PUBLISHABLE_KEY`
4. For Supabase mode, set:
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

## AI Blog Generation

Blog Admin now supports AI draft generation with multiple providers.

### Supported Providers

1. GitHub Models (default)
2. OpenAI
3. Claude (Anthropic)
4. Grok (xAI)

### Environment Setup

Copy `.env.example` to `.env.local` and configure one or more providers.

Core selector:

```bash
LLM_PROVIDER=github
```

Provider-specific keys:

```bash
# GitHub Models
GITHUB_TOKEN=...
LLM_MODEL=openai/gpt-5-mini

# OpenAI
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5-mini

# Claude / Anthropic
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-4-5

# Grok / xAI
XAI_API_KEY=...
XAI_MODEL=grok-3-mini
```

### Admin Usage

1. Open Admin panel → Blog Admin.
2. Check the LLM Provider Health badges.
3. Choose provider and optional model override.
4. Enter title or focus keyword.
5. Click `Generate Draft (AI)`.
6. Review/edit generated content and save/publish.

### Provider Health Endpoint

- `GET /api/admin/seo/llm-providers`
- Returns configured status for `github`, `openai`, `anthropic`, and `grok`.
- Requires admin authentication.

## Premium Features

### Coupon & Discount Code System
Apply discount codes at checkout to reduce order total:
- **Valid Codes**: SAVE10 (10%), SAVE20 (20%), WELCOME5 (5%), STUDENT15 (15%), FIRST20 (20%)
- Shows discount savings in real-time order summary
- Easily remove or apply different codes

### Product Comparison Tool
Compare up to 3 products side-by-side:
- Click the "⚖️ Compare" button on any product
- See detailed specs, prices, stock, and ratings in comparison table
- Compare features like: Price, Savings, Category, Grade, Stock, Rating
- Comparison badge shows selected products at a glance

### Product Reviews & Ratings
See customer feedback and submit your own reviews:
- View average product ratings (⭐ 4.6/5 + review count)
- Submit stars and free-text reviews
- Reviews stored locally with customer email
- Helps build community trust and engagement

### Stock Alerts & Notifications
Get notified when out-of-stock items become available:
- Click "🔔 Alert" to subscribe to quantity notifications
- Stores email preference for when item is back in stock
- Manage alerts from wishlist and product pages
- Never miss your wanted products

### Guest Checkout Option
Shop without creating an account:
- Checkbox option on checkout page: "Continue as guest"
- Receive order confirmation via email
- No password or account required
- Streamlined experience for first-time buyers

### Admin Analytics Dashboard
Real-time business insights:
- Click "📊 View Analytics" in admin panel
- See Total Revenue, Total Orders, Average Order Value
- View Inventory Status (Out of stock / Low stock counts)
- Top 5 Products by order volume
- Helps track sales performance and inventory health

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
    - Add your backend URL and server Pesapal credentials:
     ```
       VITE_API_BASE_URL=http://localhost:4000
       PESAPAL_CONSUMER_KEY=your_consumer_key
       PESAPAL_CONSUMER_SECRET=your_consumer_secret
       PESAPAL_IPN_ID=your_ipn_id
       PESAPAL_BASE_URL=https://cybqa.pesapal.com/pesapalv3
     ```

    - Optional: hit `GET /api/health/ready` to confirm backend env readiness before testing checkout.

5. **Testing**
   - Use sandbox URL: `https://cybqa.pesapal.com/pesapalv3`
   - Use test cards provided in Pesapal documentation
   - Test M-Pesa: Use test phone numbers from Pesapal sandbox

6. **Go to Production**
   - Change `PESAPAL_BASE_URL` to: `https://pay.pesapal.com/v3`
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
