-- Migration 004: Transactions table (buy-ins and rebuys)

CREATE TABLE IF NOT EXISTS transactions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  game_id     INT NOT NULL,
  player_id   INT NOT NULL,
  amount      DECIMAL(10, 2) NOT NULL,
  type        ENUM('buy', 'rebuy') NOT NULL DEFAULT 'buy',
  note        VARCHAR(200),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_tx_amount CHECK (amount > 0),
  FOREIGN KEY (game_id)   REFERENCES games(id)   ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE RESTRICT
);

CREATE TRIGGER transactions_sync_after_insert
AFTER INSERT ON transactions
FOR EACH ROW
UPDATE game_players
SET buy_in_total = (
  SELECT COALESCE(SUM(amount), 0)
  FROM transactions
  WHERE game_id = NEW.game_id AND player_id = NEW.player_id
)
WHERE game_id = NEW.game_id AND player_id = NEW.player_id;

CREATE TRIGGER transactions_sync_after_delete
AFTER DELETE ON transactions
FOR EACH ROW
UPDATE game_players
SET buy_in_total = (
  SELECT COALESCE(SUM(amount), 0)
  FROM transactions
  WHERE game_id = OLD.game_id AND player_id = OLD.player_id
)
WHERE game_id = OLD.game_id AND player_id = OLD.player_id;

CREATE INDEX idx_transactions_game   ON transactions(game_id);
CREATE INDEX idx_transactions_player ON transactions(player_id)
