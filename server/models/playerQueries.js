const db = require('./db')

const list = ({ search } = {}) => {
  if (search) {
    const q = `%${search}%`
    return db.query(
      `SELECT * FROM players
       WHERE name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1
       ORDER BY name ASC`,
      [q]
    )
  }
  return db.query('SELECT * FROM players ORDER BY name ASC')
}

const findById = (id) =>
  db.query('SELECT * FROM players WHERE id = $1', [id])

const create = ({ name, phone, email, venmo_handle, zelle_contact, paypal_handle, cashapp_tag, other_payment }) =>
  db.query(
    `INSERT INTO players (name, phone, email, venmo_handle, zelle_contact, paypal_handle, cashapp_tag, other_payment)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [name, phone, email, venmo_handle, zelle_contact, paypal_handle, cashapp_tag, other_payment]
  )

const update = (id, fields) => {
  const allowed = ['name','phone','email','venmo_handle','zelle_contact','paypal_handle','cashapp_tag','other_payment']
  const sets = []
  const vals = []
  allowed.forEach((col) => {
    if (fields[col] !== undefined) {
      vals.push(fields[col])
      sets.push(`${col} = $${vals.length}`)
    }
  })
  if (!sets.length) return Promise.resolve({ rows: [] })
  vals.push(id)
  return db.query(
    `UPDATE players SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`,
    vals
  )
}

const remove = (id) =>
  db.query('DELETE FROM players WHERE id = $1 RETURNING id', [id])

module.exports = { list, findById, create, update, remove }
