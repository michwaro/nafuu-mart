-- 004_wishlists.sql
-- Stores per-user wishlist product IDs

CREATE TABLE IF NOT EXISTS user_wishlists (
  id SERIAL PRIMARY KEY,
  clerk_user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_snapshot JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clerk_user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_user_wishlists_clerk_user_id ON user_wishlists (clerk_user_id);
