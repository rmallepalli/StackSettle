const db = require('./db')

const addPlayer = (game_id, player_id) =>
  db.query(
    `INSERT INTO game_players (game_id, player_id)
     VALUES ($1, $2)
     ON CONFLICT (game_id, player_id) DO NOTHING
     RETURNING *`,
    [game_id, player_id]
  )

const removePlayer = (game_id, player_id) =>
  db.query(
    `DELETE FROM game_players WHERE game_id = $1 AND player_id = $2 RETURNING id`,
    [game_id, player_id]
  )

// Update ending stack, adjusted amount, and recalculate net_result
const updateResult = (game_id, player_id, { ending_stack, adjusted_amount }) => {
  // net_result uses adjusted_amount if present, else ending_stack
  return db.query(
    `UPDATE game_players
     SET
       ending_stack    = COALESCE($1, ending_stack),
       adjusted_amount = $2,
       net_result      = COALESCE($2, $1, ending_stack) - buy_in_total
     WHERE game_id = $3 AND player_id = $4
     RETURNING *`,
    [ending_stack, adjusted_amount ?? null, game_id, player_id]
  )
}

// Bulk update all ending stacks at once (array of {player_id, ending_stack})
const bulkUpdateStacks = async (game_id, stacks) => {
  const client = await require('./db').pool.connect()
  try {
    await client.query('BEGIN')
    const results = []
    for (const { player_id, ending_stack } of stacks) {
      const { rows } = await client.query(
        `UPDATE game_players
         SET ending_stack = $1,
             net_result   = $1 - buy_in_total
         WHERE game_id = $2 AND player_id = $3
         RETURNING *`,
        [ending_stack, game_id, player_id]
      )
      results.push(...rows)
    }
    await client.query('COMMIT')
    return results
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

module.exports = { addPlayer, removePlayer, updateResult, bulkUpdateStacks }
