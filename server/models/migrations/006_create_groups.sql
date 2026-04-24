-- Migration 006: Multi-group support

CREATE TABLE IF NOT EXISTS game_groups (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_players (
  group_id    INT NOT NULL,
  player_id   INT NOT NULL,
  joined_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, player_id),
  FOREIGN KEY (group_id)  REFERENCES game_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id)     ON DELETE CASCADE
);

CREATE INDEX idx_group_players_group  ON group_players(group_id);
CREATE INDEX idx_group_players_player ON group_players(player_id);

ALTER TABLE games       ADD COLUMN group_id INT,
                        ADD CONSTRAINT fk_games_group       FOREIGN KEY (group_id) REFERENCES game_groups(id) ON DELETE RESTRICT;
ALTER TABLE settlements ADD COLUMN group_id INT,
                        ADD CONSTRAINT fk_settlements_group FOREIGN KEY (group_id) REFERENCES game_groups(id) ON DELETE RESTRICT;

ALTER TABLE games       MODIFY COLUMN group_id INT NOT NULL;
ALTER TABLE settlements MODIFY COLUMN group_id INT NOT NULL;

CREATE INDEX idx_games_group       ON games(group_id);
CREATE INDEX idx_settlements_group ON settlements(group_id)
