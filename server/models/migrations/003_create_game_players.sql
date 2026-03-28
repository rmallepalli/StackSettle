-- Migration 003: GamePlayers join table
-- One row per player per game; tracks stacks and results

CREATE TABLE IF NOT EXISTS game_players (
  id               SERIAL PRIMARY KEY,
  game_id          INT NOT NULL REFERENCES games(id)   ON DELETE CASCADE,
  player_id        INT NOT NULL REFERENCES players(id) ON DELETE RESTRICT,

  -- Financials — computed/updated as buy-ins and rebuys are recorded
  buy_in_total     NUMERIC(10, 2) NOT NULL DEFAULT 0,  -- sum of all transactions
  ending_stack     NUMERIC(10, 2),                      -- entered at end of game (null until finalized)
  adjusted_amount  NUMERIC(10, 2),                      -- optional override after finalization
  net_result       NUMERIC(10, 2),                      -- ending_stack (or adjusted) - buy_in_total

  -- Seat / display order (optional)
  seat_order       SMALLINT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (game_id, player_id)
);

CREATE TRIGGER game_players_updated_at
  BEFORE UPDATE ON game_players
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_game_players_game   ON game_players(game_id);
CREATE INDEX idx_game_players_player ON game_players(player_id);
