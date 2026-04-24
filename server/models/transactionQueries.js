const db = require('./db')

const listForGame = (game_id) =>
  db.query(
    `SELECT t.*, p.name AS player_name
     FROM transactions t
     JOIN players p ON p.id = t.player_id
     WHERE t.game_id = ?
     ORDER BY t.created_at`,
    [game_id]
  )

const create = async (game_id, player_id, amount, type, note) => {
  const result = await db.query(
    `INSERT INTO transactions (game_id, player_id, amount, type, note) VALUES (?, ?, ?, ?, ?)`,
    [game_id, player_id, amount, type || 'buy', note || null]
  )
  return db.query(
    `SELECT t.*, p.name AS player_name
     FROM transactions t
     JOIN players p ON p.id = t.player_id
     WHERE t.id = ?`,
    [result.insertId]
  )
}

const remove = async (id) => {
  const result = await db.query('DELETE FROM transactions WHERE id = ?', [id])
  if (result.affectedRows === 0) return { rows: [] }
  return { rows: [{ id }] }
}

const findById = (id) =>
  db.query('SELECT * FROM transactions WHERE id = ?', [id])

module.exports = { listForGame, create, remove, findById }
