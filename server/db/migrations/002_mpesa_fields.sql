ALTER TABLE IF EXISTS orders
  ADD COLUMN IF NOT EXISTS mpesa_checkout_request_id TEXT,
  ADD COLUMN IF NOT EXISTS mpesa_merchant_request_id TEXT,
  ADD COLUMN IF NOT EXISTS mpesa_receipt_number TEXT,
  ADD COLUMN IF NOT EXISTS mpesa_result_code TEXT,
  ADD COLUMN IF NOT EXISTS mpesa_result_desc TEXT,
  ADD COLUMN IF NOT EXISTS mpesa_phone_number TEXT,
  ADD COLUMN IF NOT EXISTS mpesa_paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_mpesa_checkout_request_id
  ON orders(mpesa_checkout_request_id);
