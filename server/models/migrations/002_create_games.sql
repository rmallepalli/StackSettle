-- Migration 002: Games table

CREATE TABLE IF NOT EXISTS games (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  host_name           VARCHAR(100) NOT NULL,
  game_date           DATE NOT NULL,
  status              ENUM('open', 'finalized', 'settled') NOT NULL DEFAULT 'open',
  settlement_period   VARCHAR(20) DEFAULT 'custom',
  settled_date        DATE,
  notes               TEXT,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_games_status    ON games(status);
CREATE INDEX idx_games_game_date ON games(game_date DESC)
