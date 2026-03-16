# Server Scaffold (PR1)

This folder contains the backend foundation for the Neon + Clerk migration.

## Current status
- `index.js`: runnable Express API server.
- `lib/neonClient.js`: server-only Neon client helper using `NEON_DATABASE_URL`.
- `lib/clerkAuth.js`: bearer token verification with Clerk server SDK.
- `routes/products.js`: Neon-backed product listing endpoint.
- `routes/orders.js`: Neon-backed create-order persistence and authenticated my-orders endpoint.
- `routes/tracking.js`: order tracking lookup by reference (Neon-backed).
- `routes/payments.js`: Pesapal initiation/status/callback with order synchronization.
- `db/migrations/001_init.sql`: base schema for users, products, orders, and related tables.

## Run
1. Set backend env values in `.env` or system environment:
	- `PORT` (optional, defaults to `4000`)
	- `CORS_ORIGIN` (optional, defaults to `http://localhost:5173`)
	- `CLERK_SECRET_KEY`
	- `NEON_DATABASE_URL`
	- `PESAPAL_CONSUMER_KEY`
	- `PESAPAL_CONSUMER_SECRET`
	- `PESAPAL_IPN_ID`
	- `PESAPAL_BASE_URL` (optional)
2. Optional preflight check (recommended):
	- `npm run preflight`
3. Start the API:
	- `npm run server`
4. Optional watch mode:
	- `npm run dev:server`

## Routes
- `GET /api/health`
- `GET /api/health/ready`
- `GET /api/preflight`
- `GET /api/products`
- `POST /api/admin/products`
- `PATCH /api/admin/products/:productId/stock`
- `POST /api/orders`
- `GET /api/orders/me`
- `GET /api/tracking/:reference`
- `POST /api/payments/pesapal/initiate`
- `GET /api/payments/pesapal/status?orderTrackingId=...`
- `POST /api/payments/pesapal/callback`

Admin endpoints require a valid Clerk bearer token with admin metadata/role. Frontend admin requests now attach Clerk session bearer tokens and keep local fallback behavior when backend/auth is unavailable.

Use `GET /api/health/ready` to verify backend env readiness. It returns `503` until required backend values are configured.

## Migrations
Run `server/db/migrations/001_init.sql` in your Neon database before testing order and payment endpoints.

You can also run migrations from this repo:
- Dry run: `npm run db:migrate:dry`
- Apply migrations: `npm run db:migrate`

## Product Seeding
- Dry-run parse of the current catalog source:
	- `npm run seed:products:dry`
- Seed products into Neon after setting `NEON_DATABASE_URL`:
	- `npm run seed:products`
