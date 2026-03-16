CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  brand TEXT,
  name TEXT NOT NULL,
  spec TEXT,
  category TEXT,
  grade TEXT,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  market_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  image_url TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT,
  long_description TEXT,
  in_stock BOOLEAN NOT NULL DEFAULT TRUE,
  stock_status TEXT NOT NULL DEFAULT 'in_stock',
  stock_quantity INTEGER NOT NULL DEFAULT 10,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  user_id TEXT,
  customer TEXT NOT NULL,
  customer_email TEXT,
  phone TEXT,
  location TEXT,
  notes TEXT,
  product_summary TEXT,
  grade_summary TEXT,
  subtotal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KES',
  item_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  pesapal_tracking_id TEXT,
  pesapal_merchant_reference TEXT,
  pesapal_payment_status_code TEXT,
  pesapal_payment_method TEXT,
  courier_name TEXT,
  courier_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT,
  brand TEXT,
  name TEXT,
  spec TEXT,
  grade TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  market_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_events (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT NOT NULL,
  order_reference TEXT,
  event_type TEXT NOT NULL,
  quantity_delta INTEGER NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  discount_rate NUMERIC(5, 4) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT NOT NULL,
  user_id TEXT,
  rating INTEGER NOT NULL,
  review_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_alerts (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletters (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_created_at ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_category_stock_status ON products(category, stock_status);
CREATE INDEX IF NOT EXISTS idx_orders_reference ON orders(reference);
CREATE INDEX IF NOT EXISTS idx_orders_pesapal_tracking_id ON orders(pesapal_tracking_id);
