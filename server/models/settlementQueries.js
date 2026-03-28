const db = require('./db')

// Fetch all finalized+unsettled games in a date range with player net results
const getUnsettledGames = ({ dateFrom, dateTo, gameIds }) => {
  if (gameIds?.length) {
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
       WHERE g.id = ANY($1) AND g.status = 'finalized'
       ORDER BY g.game_date, p.name`,
      [gameIds]
    )
  }
  const conditions = ["g.status = 'finalized'"]
  const vals = []
  if (dateFrom) { vals.push(dateFrom); conditions.push(`g.game_date >= $${vals.length}`) }
  if (dateTo)   { vals.push(dateTo);   conditions.push(`g.game_date <= $${vals.length}`) }

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

// Save a batch of settlement transactions
const createBatch = async (settlements) => {
  const client = await require('./db').pool.connect()
  try {
    await client.query('BEGIN')
    const rows = []
    for (const s of settlements) {
      const { rows: r } = await client.query(
        `INSERT INTO settlements
           (from_player_id, to_player_id, amount, game_ids, period_start, period_end)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [s.from_player_id, s.to_player_id, s.amount, s.game_ids, s.period_start, s.period_end]
      )
      rows.push(...r)
    }
    await client.query('COMMIT')
    return rows
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// Mark a batch of games as settled and their settlement rows as settled
const markGamesSettled = async (gameIds) => {
  await db.query(
    `UPDATE games SET status = 'settled', settled_date = CURRENT_DATE
     WHERE id = ANY($1) AND status = 'finalized'`,
    [gameIds]
  )
  await db.query(
    `UPDATE settlements SET status = 'settled', settled_at = NOW()
     WHERE game_ids && $1 AND status = 'pending'`,
    [gameIds]
  )
}

const listHistory = () =>
  db.query(
    `SELECT
       s.*,
       fp.name AS from_name, tp.name AS to_name,
       fp.venmo_handle AS to_venmo, fp.cashapp_tag AS to_cashapp,
       tp.venmo_handle AS to_venmo2, tp.cashapp_tag AS to_cashapp2
     FROM settlements s
     JOIN players fp ON fp.id = s.from_player_id
     JOIN players tp ON tp.id = s.to_player_id
     ORDER BY s.created_at DESC`
  )

module.exports = { getUnsettledGames, createBatch, markGamesSettled, listHistory }
