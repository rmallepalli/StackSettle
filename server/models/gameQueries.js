const db = require('./db')

// List games with optional filters and total pot per game
const list = ({ status, hostSearch, dateFrom, dateTo } = {}) => {
  const conditions = []
  const vals = []

  if (status) {
    vals.push(status)
    conditions.push(`g.status = $${vals.length}`)
  }
  if (hostSearch) {
    vals.push(`%${hostSearch}%`)
    conditions.push(`g.host_name ILIKE $${vals.length}`)
  }
  if (dateFrom) {
    vals.push(dateFrom)
    conditions.push(`g.game_date >= $${vals.length}`)
  }
  if (dateTo) {
    vals.push(dateTo)
    conditions.push(`g.game_date <= $${vals.length}`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  return db.query(
    `SELECT
       g.*,
       COUNT(DISTINCT gp.player_id)::int  AS player_count,
       COALESCE(SUM(gp.buy_in_total), 0)  AS total_pot
     FROM games g
     LEFT JOIN game_players gp ON gp.game_id = g.id
     ${where}
     GROUP BY g.id
     ORDER BY g.game_date DESC, g.created_at DESC`,
    vals
  )
}

// Full game detail: game row + players (with net_result) + transactions
const findById = async (id) => {
  const [gameRes, playersRes, txRes] = await Promise.all([
    db.query('SELECT * FROM games WHERE id = $1', [id]),
    db.query(
      `SELECT gp.*, p.name, p.phone, p.email,
              p.venmo_handle, p.zelle_contact, p.paypal_handle,
              p.cashapp_tag, p.other_payment
       FROM game_players gp
       JOIN players p ON p.id = gp.player_id
       WHERE gp.game_id = $1
       ORDER BY gp.seat_order, p.name`,
      [id]
    ),
    db.query(
      `SELECT t.*, p.name AS player_name
       FROM transactions t
       JOIN players p ON p.id = t.player_id
       WHERE t.game_id = $1
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

const create = ({ host_name, game_date, settlement_period, notes }) =>
  db.query(
    `INSERT INTO games (host_name, game_date, settlement_period, notes)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [host_name, game_date || new Date(), settlement_period || 'custom', notes]
  )

const update = (id, { host_name, game_date, settlement_period, notes }) =>
  db.query(
    `UPDATE games SET
       host_name = COALESCE($1, host_name),
       game_date = COALESCE($2, game_date),
       settlement_period = COALESCE($3, settlement_period),
       notes = COALESCE($4, notes)
     WHERE id = $5 AND status = 'open'
     RETURNING *`,
    [host_name, game_date, settlement_period, notes, id]
  )

const finalize = (id) =>
  db.query(
    `UPDATE games SET status = 'finalized'
     WHERE id = $1 AND status = 'open'
     RETURNING *`,
    [id]
  )

const markSettled = (id) =>
  db.query(
    `UPDATE games SET status = 'settled', settled_date = CURRENT_DATE
     WHERE id = $1 AND status = 'finalized'
     RETURNING *`,
    [id]
  )

const remove = (id) =>
  db.query(
    `DELETE FROM games WHERE id = $1 AND status = 'open' RETURNING id`,
    [id]
  )

module.exports = { list, findById, create, update, finalize, markSettled, remove }
