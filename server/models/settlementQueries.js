const db = require('./db')

const getUnsettledGames = ({ groupId, dateFrom, dateTo, gameIds }) => {
  if (gameIds?.length) {
    const placeholders = gameIds.map(() => '?').join(',')
    return db.query(
      `SELECT
         g.id AS game_id, g.game_date, g.host_name,
         gp.player_id, p.name AS player_name,
         p.venmo_handle, p.zelle_contact, p.paypal_handle,
         p.cashapp_tag, p.other_payment,
         gp.net_result
       FROM games g
       JOIN game_players gp ON gp.game_id = g.id
       JOIN players p ON p.id = gp.player_id
       WHERE g.id IN (${placeholders}) AND g.status = 'finalized'
       ORDER BY g.game_date, p.name`,
      gameIds
    )
  }
  const conditions = ["g.status = 'finalized'"]
  const vals = []
  if (groupId)  { vals.push(groupId);  conditions.push('g.group_id = ?') }
  if (dateFrom) { vals.push(dateFrom); conditions.push('g.game_date >= ?') }
  if (dateTo)   { vals.push(dateTo);   conditions.push('g.game_date <= ?') }

  return db.query(
    `SELECT
       g.id AS game_id, g.game_date, g.host_name,
       gp.player_id, p.name AS player_name,
       p.venmo_handle, p.zelle_contact, p.paypal_handle,
       p.cashapp_tag, p.other_payment,
       gp.net_result
     FROM games g
     JOIN game_players gp ON gp.game_id = g.id
     JOIN players p ON p.id = gp.player_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY g.game_date, p.name`,
    vals
  )
}

const createBatch = async (settlements) => {
  const conn = await require('./db').pool.getConnection()
  try {
    await conn.beginTransaction()
    const rows = []
    for (const s of settlements) {
      const [result] = await conn.query(
        `INSERT INTO settlements
           (from_player_id, to_player_id, amount, game_ids, period_start, period_end, group_id)
         VALUES (?,?,?,?,?,?,?)`,
        [s.from_player_id, s.to_player_id, s.amount,
         JSON.stringify(s.game_ids), s.period_start, s.period_end, s.group_id]
      )
      const [fetched] = await conn.query('SELECT * FROM settlements WHERE id = ?', [result.insertId])
      rows.push(...fetched)
    }
    await conn.commit()
    return rows
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

const markGamesSettled = async (gameIds) => {
  const placeholders = gameIds.map(() => '?').join(',')
  await db.query(
    `UPDATE games SET status = 'settled', settled_date = CURRENT_DATE
     WHERE id IN (${placeholders}) AND status = 'finalized'`,
    gameIds
  )
  await db.query(
    `UPDATE settlements SET status = 'settled', settled_at = NOW()
     WHERE JSON_OVERLAPS(game_ids, ?) AND status = 'pending'`,
    [JSON.stringify(gameIds)]
  )
}

const listHistory = (groupId) =>
  db.query(
    `SELECT
       s.*,
       fp.name AS from_name, tp.name AS to_name,
       tp.venmo_handle AS to_venmo, tp.cashapp_tag AS to_cashapp,
       tp.zelle_contact AS to_zelle, tp.paypal_handle AS to_paypal,
       tp.other_payment AS to_other
     FROM settlements s
     JOIN players fp ON fp.id = s.from_player_id
     JOIN players tp ON tp.id = s.to_player_id
     WHERE s.group_id = ?
     ORDER BY s.created_at DESC`,
    [groupId]
  )

module.exports = { getUnsettledGames, createBatch, markGamesSettled, listHistory }
