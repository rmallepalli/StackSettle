-- Migration 005: Settlements table
-- Records the debt-minimized payment instructions between players,
-- optionally spanning multiple games

CREATE TYPE settlement_status AS ENUM ('pending', 'settled');

CREATE TABLE IF NOT EXISTS settlements (
  id               SERIAL PRIMARY KEY,
  from_player_id   INT NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  to_player_id     INT NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  amount           NUMERIC(10, 2) NOT NULL CHECK (amount > 0),

  -- Which games are rolled up into this settlement
  game_ids         INT[] NOT NULL DEFAULT '{}',

  period_start     DATE,
  period_end       DATE,
  status           settlement_status NOT NULL DEFAULT 'pending',
  settled_at       TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (from_player_id <> to_player_id)
);

CREATE TRIGGER settlements_updated_at
  BEFORE UPDATE ON settlements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_settlements_from   ON settlements(from_player_id);
CREATE INDEX idx_settlements_to     ON settlements(to_player_id);
CREATE INDEX idx_settlements_status ON settlements(status);
