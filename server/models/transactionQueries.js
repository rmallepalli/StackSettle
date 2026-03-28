const db = require('./db')

const listForGame = (game_id) =>
  db.query(
    `SELECT t.*, p.name AS player_name
     FROM transactions t
     JOIN players p ON p.id = t.player_id
     WHERE t.game_id = $1
     ORDER BY t.created_at`,
    [game_id]
  )

const create = (game_id, player_id, amount, type, note) =>
  db.query(
    `INSERT INTO transactions (game_id, player_id, amount, type, note)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [game_id, player_id, amount, type || 'buy', note || null]
  )

const remove = (id) =>
  db.query('DELETE FROM transactions WHERE id = $1 RETURNING id', [id])

// Get one transaction (to verify game ownership before delete)
const findById = (id) =>
  db.query('SELECT * FROM transactions WHERE id = $1', [id])

module.exports = { listForGame, create, remove, findById }
