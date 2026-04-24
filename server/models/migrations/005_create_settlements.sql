-- Migration 005: Settlements table

CREATE TABLE IF NOT EXISTS settlements (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  from_player_id   INT NOT NULL,
  to_player_id     INT NOT NULL,
  amount           DECIMAL(10, 2) NOT NULL,
  game_ids         JSON NOT NULL,
  period_start     DATE,
  period_end       DATE,
  status           ENUM('pending', 'settled') NOT NULL DEFAULT 'pending',
  settled_at       DATETIME,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_settlement_amount CHECK (amount > 0),
  CONSTRAINT chk_settlement_players CHECK (from_player_id <> to_player_id),
  FOREIGN KEY (from_player_id) REFERENCES players(id) ON DELETE RESTRICT,
  FOREIGN KEY (to_player_id)   REFERENCES players(id) ON DELETE RESTRICT
);

CREATE INDEX idx_settlements_from   ON settlements(from_player_id);
CREATE INDEX idx_settlements_to     ON settlements(to_player_id);
CREATE INDEX idx_settlements_status ON settlements(status)
