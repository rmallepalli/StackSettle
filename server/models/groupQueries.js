const db = require('./db')

const list = () =>
  db.query(
    `SELECT g.*,
       COUNT(DISTINCT gp.player_id)::int AS member_count,
       COUNT(DISTINCT ga.id)::int        AS game_count
     FROM game_groups g
     LEFT JOIN group_players gp ON gp.group_id = g.id
     LEFT JOIN games ga          ON ga.group_id = g.id
     GROUP BY g.id
     ORDER BY g.created_at ASC`
  )

const findById = (id) =>
  db.query('SELECT * FROM game_groups WHERE id = $1', [id])

const create = ({ name, description }) =>
  db.query(
    `INSERT INTO game_groups (name, description) VALUES ($1, $2) RETURNING *`,
    [name, description || null]
  )

const update = (id, { name, description }) =>
  db.query(
    `UPDATE game_groups
     SET name        = COALESCE($1, name),
         description = $2
     WHERE id = $3
     RETURNING *`,
    [name, description !== undefined ? description : null, id]
  )

const remove = async (id) => {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS cnt
     FROM games WHERE group_id = $1 AND status != 'settled'`,
    [id]
  )
  if (rows[0].cnt > 0) throw new Error('Cannot delete group with active or finalized games')
  return db.query('DELETE FROM game_groups WHERE id = $1 RETURNING id', [id])
}

const listMembers = (groupId) =>
  db.query(
    `SELECT p.*, gp.joined_at
     FROM players p
     JOIN group_players gp ON gp.player_id = p.id
     WHERE gp.group_id = $1
     ORDER BY p.name ASC`,
    [groupId]
  )

const addMember = (groupId, playerId) =>
  db.query(
    `INSERT INTO group_players (group_id, player_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [groupId, playerId]
  )

const removeMember = (groupId, playerId) =>
  db.query(
    `DELETE FROM group_players WHERE group_id = $1 AND player_id = $2 RETURNING *`,
    [groupId, playerId]
  )

module.exports = { list, findById, create, update, remove, listMembers, addMember, removeMember }
