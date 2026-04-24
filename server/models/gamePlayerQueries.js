const db = require('./db')

const addPlayer = async (game_id, player_id) => {
  await db.query(
    `INSERT IGNORE INTO game_players (game_id, player_id) VALUES (?, ?)`,
    [game_id, player_id]
  )
  return db.query(
    `SELECT * FROM game_players WHERE game_id = ? AND player_id = ?`,
    [game_id, player_id]
  )
}

const removePlayer = async (game_id, player_id) => {
  const { rows: before } = await db.query(
    `SELECT id FROM game_players WHERE game_id = ? AND player_id = ?`,
    [game_id, player_id]
  )
  if (!before[0]) return { rows: [] }
  await db.query(`DELETE FROM game_players WHERE game_id = ? AND player_id = ?`, [game_id, player_id])
  return { rows: [{ id: before[0].id }] }
}

const updateResult = async (game_id, player_id, { ending_stack, adjusted_amount }) => {
  const adj = adjusted_amount ?? null
  const result = await db.query(
    `UPDATE game_players
     SET
       ending_stack    = COALESCE(?, ending_stack),
       adjusted_amount = ?,
       net_result      = COALESCE(?, ?, ending_stack) - buy_in_total
     WHERE game_id = ? AND player_id = ?`,
    [ending_stack, adj, adj, ending_stack, game_id, player_id]
  )
  if (result.affectedRows === 0) return { rows: [] }
  return db.query('SELECT * FROM game_players WHERE game_id = ? AND player_id = ?', [game_id, player_id])
}

const bulkUpdateStacks = async (game_id, stacks) => {
  const conn = await require('./db').pool.getConnection()
  try {
    await conn.beginTransaction()
    const results = []
    for (const { player_id, ending_stack } of stacks) {
      await conn.query(
        `UPDATE game_players
         SET ending_stack = ?,
             net_result   = ? - buy_in_total
         WHERE game_id = ? AND player_id = ?`,
        [ending_stack, ending_stack, game_id, player_id]
      )
      const [rows] = await conn.query(
        'SELECT * FROM game_players WHERE game_id = ? AND player_id = ?',
        [game_id, player_id]
      )
      results.push(...rows)
    }
    await conn.commit()
    return results
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

module.exports = { addPlayer, removePlayer, updateResult, bulkUpdateStacks }
