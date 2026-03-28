-- Migration 004: Transactions table (buy-ins and rebuys)
-- Immutable log; buy_in_total on game_players is derived from this table

CREATE TYPE transaction_type AS ENUM ('buy', 'rebuy');

CREATE TABLE IF NOT EXISTS transactions (
  id          SERIAL PRIMARY KEY,
  game_id     INT NOT NULL REFERENCES games(id)   ON DELETE CASCADE,
  player_id   INT NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  amount      NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  type        transaction_type NOT NULL DEFAULT 'buy',
  note        VARCHAR(200),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- After any insert/delete on transactions, keep game_players.buy_in_total in sync
CREATE OR REPLACE FUNCTION sync_buy_in_total()
RETURNS TRIGGER AS $$
DECLARE
  v_game_id   INT;
  v_player_id INT;
BEGIN
  -- Determine which game+player row to update
  IF TG_OP = 'DELETE' THEN
    v_game_id   := OLD.game_id;
    v_player_id := OLD.player_id;
  ELSE
    v_game_id   := NEW.game_id;
    v_player_id := NEW.player_id;
  END IF;

  UPDATE game_players
  SET buy_in_total = (
    SELECT COALESCE(SUM(amount), 0)
    FROM transactions
    WHERE game_id = v_game_id AND player_id = v_player_id
  )
  WHERE game_id = v_game_id AND player_id = v_player_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_sync_buy_in
  AFTER INSERT OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION sync_buy_in_total();

CREATE INDEX idx_transactions_game   ON transactions(game_id);
CREATE INDEX idx_transactions_player ON transactions(player_id);
