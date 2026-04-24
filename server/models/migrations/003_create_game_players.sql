-- Migration 003: GamePlayers join table

CREATE TABLE IF NOT EXISTS game_players (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  game_id          INT NOT NULL,
  player_id        INT NOT NULL,
  buy_in_total     DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ending_stack     DECIMAL(10, 2),
  adjusted_amount  DECIMAL(10, 2),
  net_result       DECIMAL(10, 2),
  seat_order       TINYINT,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_game_player (game_id, player_id),
  FOREIGN KEY (game_id)   REFERENCES games(id)   ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE RESTRICT
);

CREATE INDEX idx_game_players_game   ON game_players(game_id);
CREATE INDEX idx_game_players_player ON game_players(player_id)
