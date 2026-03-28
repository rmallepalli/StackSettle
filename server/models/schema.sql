-- StackSettle — full schema (runs all migrations in order)
-- Usage:  psql -U <user> -d stacksettle -f server/models/schema.sql

\i migrations/001_create_players.sql
\i migrations/002_create_games.sql
\i migrations/003_create_game_players.sql
\i migrations/004_create_transactions.sql
\i migrations/005_create_settlements.sql
