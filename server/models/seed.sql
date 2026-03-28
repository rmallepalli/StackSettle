-- StackSettle — development seed data
-- Usage:  psql -U <user> -d stacksettle -f server/models/seed.sql

-- Players
INSERT INTO players (name, phone, venmo_handle, cashapp_tag) VALUES
  ('Alice',   '555-0101', '@alice-poker',  '$AliceP'),
  ('Bob',     '555-0102', '@bob-bets',     '$BobBets'),
  ('Charlie', '555-0103', NULL,            '$CharlieC'),
  ('Diana',   '555-0104', '@diana-deals',  NULL),
  ('Eddie',   '555-0105', '@eddie-all-in', '$EddieAI');

-- Game 1 — open
INSERT INTO games (host_name, game_date, status, notes)
  VALUES ('Alice', CURRENT_DATE - 1, 'open', 'Friday night home game');

-- Add players to game 1
INSERT INTO game_players (game_id, player_id, seat_order)
  SELECT g.id, p.id, p.id
  FROM games g, players p
  WHERE g.host_name = 'Alice';

-- Buy-ins for game 1 (trigger will update buy_in_total)
INSERT INTO transactions (game_id, player_id, amount, type)
  SELECT g.id, p.id, 50, 'buy'
  FROM games g, players p
  WHERE g.host_name = 'Alice';

-- A rebuy for Bob
INSERT INTO transactions (game_id, player_id, amount, type)
  SELECT g.id, p.id, 50, 'rebuy'
  FROM games g, players p
  WHERE g.host_name = 'Alice' AND p.name = 'Bob';

-- Game 2 — finalized (ready for settlement)
INSERT INTO games (host_name, game_date, status, notes)
  VALUES ('Bob', CURRENT_DATE - 8, 'finalized', 'Last week''s game');

INSERT INTO game_players (game_id, player_id, buy_in_total, ending_stack, net_result, seat_order)
  VALUES
    ((SELECT id FROM games WHERE host_name='Bob'), (SELECT id FROM players WHERE name='Alice'),  50,  120,  70, 1),
    ((SELECT id FROM games WHERE host_name='Bob'), (SELECT id FROM players WHERE name='Bob'),   100,   30, -70, 2),
    ((SELECT id FROM games WHERE host_name='Bob'), (SELECT id FROM players WHERE name='Charlie'), 50,  60,  10, 3),
    ((SELECT id FROM games WHERE host_name='Bob'), (SELECT id FROM players WHERE name='Diana'),   50,  30, -20, 4),
    ((SELECT id FROM games WHERE host_name='Bob'), (SELECT id FROM players WHERE name='Eddie'),   50,  10, -40, 5);
