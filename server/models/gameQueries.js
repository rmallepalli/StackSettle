const db = require('./db')

const list = ({ groupId, status, hostSearch, dateFrom, dateTo } = {}) => {
  const conditions = []
  const vals = []

  if (groupId)    { vals.push(groupId);              conditions.push('g.group_id = ?') }
  if (status)     { vals.push(status);               conditions.push('g.status = ?') }
  if (hostSearch) { vals.push(`%${hostSearch}%`);    conditions.push('g.host_name LIKE ?') }
  if (dateFrom)   { vals.push(dateFrom);             conditions.push('g.game_date >= ?') }
  if (dateTo)     { vals.push(dateTo);               conditions.push('g.game_date <= ?') }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  return db.query(
    `SELECT
       g.*,
       COUNT(DISTINCT gp.player_id) AS player_count,
       COALESCE(SUM(gp.buy_in_total), 0) AS total_pot
     FROM games g
     LEFT JOIN game_players gp ON gp.game_id = g.id
     ${where}
     GROUP BY g.id
     ORDER BY g.game_date DESC, g.created_at DESC`,
    vals
  )
}

const findById = async (id) => {
  const [gameRes, playersRes, txRes] = await Promise.all([
    db.query('SELECT * FROM games WHERE id = ?', [id]),
    db.query(
      `SELECT gp.*, p.name, p.phone, p.email,
              p.venmo_handle, p.zelle_contact, p.paypal_handle,
              p.cashapp_tag, p.other_payment
       FROM game_players gp
       JOIN players p ON p.id = gp.player_id
       WHERE gp.game_id = ?
       ORDER BY gp.seat_order, p.name`,
      [id]
    ),
    db.query(
      `SELECT t.*, p.name AS player_name
       FROM transactions t
       JOIN players p ON p.id = t.player_id
       WHERE t.game_id = ?
       ORDER BY t.created_at`,
      [id]
    ),
  ])
  if (!gameRes.rows[0]) return null
  return {
    ...gameRes.rows[0],
    players: playersRes.rows,
    transactions: txRes.rows,
  }
}

const create = async ({ group_id, host_name, game_date, settlement_period, notes }) => {
  const result = await db.query(
    `INSERT INTO games (group_id, host_name, game_date, settlement_period, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [group_id, host_name, game_date || new Date(), settlement_period || 'custom', notes]
  )
  return db.query('SELECT * FROM games WHERE id = ?', [result.insertId])
}

const update = async (id, { host_name, game_date, settlement_period, notes }) => {
  const result = await db.query(
    `UPDATE games SET
       host_name         = COALESCE(?, host_name),
       game_date         = COALESCE(?, game_date),
       settlement_period = COALESCE(?, settlement_period),
       notes             = COALESCE(?, notes)
     WHERE id = ? AND status = 'open'`,
    [host_name, game_date, settlement_period, notes, id]
  )
  if (result.affectedRows === 0) return { rows: [] }
  return db.query('SELECT * FROM games WHERE id = ?', [id])
}

const finalize = async (id) => {
  const result = await db.query(
    `UPDATE games SET status = 'finalized' WHERE id = ? AND status = 'open'`,
    [id]
  )
  if (result.affectedRows === 0) return { rows: [] }
  return db.query('SELECT * FROM games WHERE id = ?', [id])
}

const markSettled = async (id) => {
  const result = await db.query(
    `UPDATE games SET status = 'settled', settled_date = CURRENT_DATE WHERE id = ? AND status = 'finalized'`,
    [id]
  )
  if (result.affectedRows === 0) return { rows: [] }
  return db.query('SELECT * FROM games WHERE id = ?', [id])
}

const remove = async (id) => {
  const result = await db.query(
    `DELETE FROM games WHERE id = ? AND status IN ('open', 'finalized')`,
    [id]
  )
  if (result.affectedRows === 0) return { rows: [] }
  return { rows: [{ id }] }
}

module.exports = { list, findById, create, update, finalize, markSettled, remove }
