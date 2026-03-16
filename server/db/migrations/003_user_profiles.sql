CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  alt_phone TEXT,
  profile_picture TEXT,
  bio TEXT,
  preferred_contact TEXT NOT NULL DEFAULT 'whatsapp',
  notify_email BOOLEAN NOT NULL DEFAULT TRUE,
  notify_sms BOOLEAN NOT NULL DEFAULT TRUE,
  notify_deals BOOLEAN NOT NULL DEFAULT FALSE,
  mpesa_phone TEXT,
  mpesa_name TEXT,
  mpesa_default BOOLEAN NOT NULL DEFAULT TRUE,
  cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_card_id TEXT,
  addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_address_id TEXT,
  county TEXT,
  town TEXT,
  address_line TEXT,
  landmark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);