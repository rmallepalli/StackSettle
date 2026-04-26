const db = require('./db')

const playerStats = ({ groupId, dateFrom, dateTo }) => {
  const conditions = ["g.group_id = ?", "g.status IN ('finalized', 'settled')"]
  const vals = [groupId]
  if (dateFrom) { vals.push(dateFrom); conditions.push('g.game_date >= ?') }
  if (dateTo)   { vals.push(dateTo);   conditions.push('g.game_date <= ?') }

  return db.query(
    `SELECT
       p.id   AS player_id,
       p.name AS player_name,
       COUNT(gp.game_id)                                      AS games_played,
       CAST(SUM(gp.net_result)  AS DECIMAL(10,2))            AS net_total,
       CAST(MAX(gp.net_result)  AS DECIMAL(10,2))            AS best_game,
       CAST(MIN(gp.net_result)  AS DECIMAL(10,2))            AS worst_game,
       SUM(CASE WHEN gp.net_result > 0 THEN 1 ELSE 0 END)    AS wins,
       SUM(CASE WHEN gp.net_result < 0 THEN 1 ELSE 0 END)    AS losses,
       CAST(SUM(gp.buy_in_total) AS DECIMAL(10,2))           AS total_buy_in
     FROM game_players gp
     JOIN players p ON p.id = gp.player_id
     JOIN games   g ON g.id = gp.game_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY p.id, p.name
     ORDER BY net_total DESC`,
    vals
  )
}

const gameSummary = ({ groupId, dateFrom, dateTo }) => {
  const conditions = ["g.group_id = ?", "g.status IN ('finalized', 'settled')"]
  const vals = [groupId]
  if (dateFrom) { vals.push(dateFrom); conditions.push('g.game_date >= ?') }
  if (dateTo)   { vals.push(dateTo);   conditions.push('g.game_date <= ?') }

  // Subquery produces one row per game with that game's total pot,
  // then outer query aggregates — avoids COUNT/AVG being multiplied by player count.
  return db.query(
    `SELECT
       COUNT(*)                          AS total_games,
       CAST(SUM(pot) AS DECIMAL(10,2))  AS total_money,
       CAST(MAX(pot) AS DECIMAL(10,2))  AS biggest_pot,
       CAST(AVG(pot) AS DECIMAL(10,2))  AS avg_pot
     FROM (
       SELECT g.id, COALESCE(SUM(gp.buy_in_total), 0) AS pot
       FROM games g
       LEFT JOIN game_players gp ON gp.game_id = g.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY g.id
     ) game_pots`,
    vals
  )
}

module.exports = { playerStats, gameSummary }
