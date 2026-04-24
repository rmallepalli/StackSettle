const db = require('./db')

const list = ({ search } = {}) => {
  if (search) {
    const q = `%${search}%`
    return db.query(
      `SELECT * FROM players WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? ORDER BY name ASC`,
      [q, q, q]
    )
  }
  return db.query('SELECT * FROM players ORDER BY name ASC')
}

const findById = (id) =>
  db.query('SELECT * FROM players WHERE id = ?', [id])

const create = async ({ name, phone, email, venmo_handle, zelle_contact, paypal_handle, cashapp_tag, other_payment }) => {
  const result = await db.query(
    `INSERT INTO players (name, phone, email, venmo_handle, zelle_contact, paypal_handle, cashapp_tag, other_payment)
     VALUES (?,?,?,?,?,?,?,?)`,
    [name, phone, email, venmo_handle, zelle_contact, paypal_handle, cashapp_tag, other_payment]
  )
  return db.query('SELECT * FROM players WHERE id = ?', [result.insertId])
}

const update = async (id, fields) => {
  const allowed = ['name','phone','email','venmo_handle','zelle_contact','paypal_handle','cashapp_tag','other_payment']
  const sets = []
  const vals = []
  allowed.forEach((col) => {
    if (fields[col] !== undefined) {
      sets.push(`${col} = ?`)
      vals.push(fields[col])
    }
  })
  if (!sets.length) return { rows: [] }
  vals.push(id)
  const result = await db.query(`UPDATE players SET ${sets.join(', ')} WHERE id = ?`, vals)
  if (result.affectedRows === 0) return { rows: [] }
  return db.query('SELECT * FROM players WHERE id = ?', [id])
}

const remove = async (id) => {
  const result = await db.query('DELETE FROM players WHERE id = ?', [id])
  if (result.affectedRows === 0) return { rows: [] }
  return { rows: [{ id }] }
}

module.exports = { list, findById, create, update, remove }
