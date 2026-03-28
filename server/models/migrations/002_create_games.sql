-- Migration 002: Games table

CREATE TYPE game_status AS ENUM ('open', 'finalized', 'settled');

CREATE TABLE IF NOT EXISTS games (
  id                  SERIAL PRIMARY KEY,
  host_name           VARCHAR(100) NOT NULL,
  game_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  status              game_status NOT NULL DEFAULT 'open',
  settlement_period   VARCHAR(20) DEFAULT 'custom', -- monthly | quarterly | custom
  settled_date        DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Index for common filters
CREATE INDEX idx_games_status    ON games(status);
CREATE INDEX idx_games_game_date ON games(game_date DESC);
