const db = require('./db')

const list = () =>
  db.query(
    `SELECT g.*,
       COUNT(DISTINCT gp.player_id) AS member_count,
       COUNT(DISTINCT ga.id)        AS game_count
     FROM game_groups g
     LEFT JOIN group_players gp ON gp.group_id = g.id
     LEFT JOIN games ga          ON ga.group_id = g.id
     GROUP BY g.id
     ORDER BY g.created_at ASC`
  )

const findById = (id) =>
  db.query('SELECT * FROM game_groups WHERE id = ?', [id])

const create = async ({ name, description }) => {
  const result = await db.query(
    `INSERT INTO game_groups (name, description) VALUES (?, ?)`,
    [name, description || null]
  )
  return db.query('SELECT * FROM game_groups WHERE id = ?', [result.insertId])
}

const update = async (id, { name, description }) => {
  const result = await db.query(
    `UPDATE game_groups
     SET name        = COALESCE(?, name),
         description = ?
     WHERE id = ?`,
    [name, description !== undefined ? description : null, id]
  )
  if (result.affectedRows === 0) return { rows: [] }
  return db.query('SELECT * FROM game_groups WHERE id = ?', [id])
}

const remove = async (id) => {
  const { rows } = await db.query(
    `SELECT COUNT(*) AS cnt FROM games WHERE group_id = ?`,
    [id]
  )
  if (rows[0].cnt > 0) throw new Error('Cannot delete a group that has games. Remove all games first.')
  return db.query('DELETE FROM game_groups WHERE id = ?', [id])
}

const listMembers = (groupId) =>
  db.query(
    `SELECT p.*, gp.joined_at
     FROM players p
     JOIN group_players gp ON gp.player_id = p.id
     WHERE gp.group_id = ?
     ORDER BY p.name ASC`,
    [groupId]
  )

const addMember = (groupId, playerId) =>
  db.query(
    `INSERT IGNORE INTO group_players (group_id, player_id) VALUES (?, ?)`,
    [groupId, playerId]
  )

const removeMember = (groupId, playerId) =>
  db.query(
    `DELETE FROM group_players WHERE group_id = ? AND player_id = ?`,
    [groupId, playerId]
  )

module.exports = { list, findById, create, update, remove, listMembers, addMember, removeMember }
