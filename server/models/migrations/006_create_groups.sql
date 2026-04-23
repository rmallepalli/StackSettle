-- Migration 006: Multi-group support
-- Players are global; groups scope games and settlements.

-- 1. Groups table
CREATE TABLE IF NOT EXISTS game_groups (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER game_groups_updated_at
  BEFORE UPDATE ON game_groups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Group-player membership (many-to-many; players remain global)
CREATE TABLE IF NOT EXISTS group_players (
  group_id    INT NOT NULL REFERENCES game_groups(id) ON DELETE CASCADE,
  player_id   INT NOT NULL REFERENCES players(id)     ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, player_id)
);

CREATE INDEX idx_group_players_group  ON group_players(group_id);
CREATE INDEX idx_group_players_player ON group_players(player_id);

-- 3. Add group_id to games and settlements (nullable first so existing rows don't fail)
ALTER TABLE games       ADD COLUMN group_id INT REFERENCES game_groups(id) ON DELETE RESTRICT;
ALTER TABLE settlements ADD COLUMN group_id INT REFERENCES game_groups(id) ON DELETE RESTRICT;

-- 4. Migrate any existing rows into a "Default Group"
DO $$
DECLARE
  v_group_id INT;
BEGIN
  IF EXISTS (SELECT 1 FROM games) OR EXISTS (SELECT 1 FROM settlements) THEN
    INSERT INTO game_groups (name, description)
    VALUES ('Default Group', 'Auto-created during migration')
    RETURNING id INTO v_group_id;

    UPDATE games       SET group_id = v_group_id WHERE group_id IS NULL;
    UPDATE settlements SET group_id = v_group_id WHERE group_id IS NULL;

    -- Enroll all existing players in the default group
    INSERT INTO group_players (group_id, player_id)
    SELECT v_group_id, id FROM players
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 5. Now enforce NOT NULL
ALTER TABLE games       ALTER COLUMN group_id SET NOT NULL;
ALTER TABLE settlements ALTER COLUMN group_id SET NOT NULL;

CREATE INDEX idx_games_group       ON games(group_id);
CREATE INDEX idx_settlements_group ON settlements(group_id);
