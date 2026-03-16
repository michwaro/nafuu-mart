-- 005_stock_alerts.sql
-- Stores per-user stock alert subscriptions

CREATE TABLE IF NOT EXISTS user_stock_alerts (
  id SERIAL PRIMARY KEY,
  clerk_user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clerk_user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_user_stock_alerts_clerk_user_id ON user_stock_alerts (clerk_user_id);
