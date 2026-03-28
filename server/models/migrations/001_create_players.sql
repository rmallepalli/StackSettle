-- Migration 001: Players table
-- Stores persistent player profiles with payment details

CREATE TABLE IF NOT EXISTS players (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  phone         VARCHAR(30),
  email         VARCHAR(150),

  -- Payment method fields (all optional; player fills in what they use)
  venmo_handle  VARCHAR(100),   -- e.g. @john-doe
  zelle_contact VARCHAR(150),   -- phone or email used for Zelle
  paypal_handle VARCHAR(150),   -- PayPal.me link or email
  cashapp_tag   VARCHAR(100),   -- $cashtag
  other_payment TEXT,           -- free-form for anything else

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep updated_at current automatically
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
