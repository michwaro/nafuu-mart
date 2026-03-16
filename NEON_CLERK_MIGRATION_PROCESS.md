# Neon + Clerk Migration Process for Nafuu Mart

## Objective
Move Nafuu Mart from client-heavy local auth/storage flows to a production-ready stack using Clerk for authentication and Neon Postgres for persistent business data.

## Current Baseline
- Frontend-driven auth and session behavior in `src/authProvider.js`.
- Core order/checkout/track/admin state handling in `src/App.jsx`.
- Payment integration wrapper in `src/pesapalProvider.js`.
- Significant localStorage usage for orders, cart, wishlist, and catalog data.

## Target Architecture
- Frontend: Existing React + Vite app.
- Auth: Clerk (frontend + backend verification).
- Database: Neon Postgres.
- API Layer: Lightweight backend routes for trusted writes.
- Payments: Pesapal callback and final status updates handled server-side.

## Migration Phases

### Phase 1: Foundation
1. Create Neon project and database.
2. Create Clerk app and collect keys.
3. Add environment variables:
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEON_DATABASE_URL`
4. Keep current app behavior intact while scaffolding backend and database clients.

### Phase 2: Clerk Auth Integration
1. Wrap app with Clerk provider in `src/main.jsx`.
2. Replace auth/session hydration usage in `src/App.jsx` with Clerk session hooks.
3. Preserve current auth UX pages and transitions.
4. Keep temporary adapter methods in `src/authProvider.js` only if needed for incremental migration.

### Phase 3: Neon Data Schema
1. Introduce initial tables:
   - `users`
   - `products`
   - `orders`
   - `order_items`
   - `inventory_events`
   - `coupons`
   - `reviews`
   - `stock_alerts`
   - `newsletters`
2. Add key indexes:
   - `orders(user_id, created_at)`
   - `order_items(order_id)`
   - `products(category, stock_status)`
3. Seed products from existing static catalog in `src/App.jsx`.

### Phase 4: Backend API for Trusted Operations
1. Create routes for:
   - Product listing
   - Checkout/order creation
   - Pesapal initiation
   - Order tracking
   - Pesapal callback verification + order update
   - My orders by authenticated user
   - Admin product create/update
2. Move secret-bearing payment operations out of browser code.

### Phase 5: Frontend Flow Wiring
1. Replace direct local storage writes for critical entities with API calls from `src/App.jsx`.
2. Keep cart/wishlist local initially for lower migration risk.
3. Maintain existing pages/UI while changing underlying data source.

### Phase 6: Authorization Hardening
1. Implement admin role checks via Clerk metadata or a Neon role table.
2. Enforce admin checks server-side for all admin endpoints.
3. Keep frontend gate, but treat it as UX-only.

### Phase 7: Cutover and Cleanup
1. Remove legacy local auth paths from `src/authProvider.js`.
2. Remove client-side order/catalog authority from localStorage paths.
3. Keep optional read-only offline fallback only if explicitly required.

## Suggested PR Breakdown
1. PR 1: Clerk + Neon foundational scaffolding (no behavior changes).
2. PR 2: Auth flow migration to Clerk in frontend.
3. PR 3: Checkout/order API integration.
4. PR 4: Pesapal callback server verification.
5. PR 5: Admin CRUD + server authorization.
6. PR 6: Legacy auth/storage cleanup.

## Acceptance Criteria
1. Clerk sign-in/sign-up/sign-out works and persists correctly.
2. Orders and inventory updates are server-authoritative in Neon.
3. Tracking reads from Neon-backed order records.
4. Admin mutations are blocked server-side for non-admin users.
5. No payment or auth secrets are exposed in frontend runtime.

## Risks and Mitigation
1. **Risk:** Large single-file flow complexity in `src/App.jsx`.
   - **Mitigation:** Incremental adapters and phase-based migration.
2. **Risk:** Payment callback inconsistencies.
   - **Mitigation:** Idempotent callback handling keyed by tracking/reference.
3. **Risk:** Admin privilege drift.
   - **Mitigation:** Centralized server-side authorization checks.

## Estimated Timeline
- MVP secure migration: 4 to 7 working days.
- Full hardening and cleanup: additional 1 to 2 weeks.

## Next Execution Step
Start PR 1: add Clerk provider wiring, Neon DB client, migration tooling, and environment structure without breaking current runtime behavior.

## PR1 Progress
- Completed: Added optional Clerk provider wiring in `src/main.jsx`.
- Completed: Added Clerk/Neon environment placeholders in `.env.example`.
- Completed: Added server-only Neon client scaffold in `server/lib/neonClient.js`.
- Completed: Added backend scaffold notes in `server/README.md`.
- Completed: Added Node lint override for `server/**/*.js` in `eslint.config.js`.
- Completed: Added Clerk server auth utility in `server/lib/clerkAuth.js`.
- Completed: Added backend route skeletons in `server/routes/*`.
- Completed: Replaced route registry scaffold with runnable Express API in `server/index.js`.
- Completed: Added Neon-backed read endpoints for products, my orders, and tracking.
- Completed: Added initial Neon schema SQL in `server/db/migrations/001_init.sql`.
- Completed: Implemented Neon-backed order persistence in `server/routes/orders.js`.
- Completed: Moved Pesapal initiate/status/callback flow to backend handlers in `server/routes/payments.js`.
- Completed: Wired frontend checkout to backend order and payment APIs with local fallback for direct M-Pesa flow.
- Completed: Expanded product schema and products API to carry full catalog fields.
- Completed: Added Neon product seed script in `server/scripts/seedProducts.js`.
- Completed: Switched catalog hydration in `src/App.jsx` to API-first loading with local/static fallback.
- Completed: Added Clerk-guarded admin product write endpoints in `server/routes/products.js`.
- Completed: Switched order tracking in `src/App.jsx` to backend-first lookup with local fallback.
- Completed: Wired Clerk session bearer tokens from `src/App.jsx` API helpers for authenticated/admin backend routes.
- Completed: Switched My Orders in `src/App.jsx` to `/api/orders/me` with local fallback and cache reset on account changes.
- Completed: Added Clerk-first session restoration/sign-out bridge in `src/App.jsx` while keeping authProvider fallback paths for incremental cutover.
- Completed: Added migration runner script `server/scripts/runMigrations.js` with npm commands for dry-run and apply.
- Completed: Updated `openAuth` in `src/App.jsx` to launch Clerk hosted sign-in/sign-up when Clerk is configured.
- Completed: Added explicit `clerk` auth mode handling in `src/authProvider.js` and documented it in `.env.example` + `README.md`.
- Completed: Added UI warning banner for forced clerk mode without publishable key and prevented silent auth-page fallback in that state.
- Completed: Gated legacy in-app auth page behind non-Clerk modes; clerk environments now use hosted auth entrypoints.
- Completed: Added backend readiness endpoint `GET /api/health/ready` with explicit config checks for Clerk, Neon, and Pesapal env state.
- Completed: Removed legacy frontend Pesapal env placeholders from `.env.example` to keep payment secrets backend-only.
- Completed: Added `npm run preflight` / `npm run preflight:strict` env validation script (`server/scripts/preflight.js`) to surface missing config before runtime testing.
- Completed: Added shared preflight checker (`server/lib/preflightChecks.js`) and exposed `GET /api/preflight` for structured env diagnostics.
- Completed: Upgraded `System Status` page in `src/App.jsx` to consume preflight details (required vs optional keys, scope, notes, and exact missing env names).
