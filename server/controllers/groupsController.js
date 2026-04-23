const gq = require('../models/groupQueries')
const pq = require('../models/playerQueries')

const list = async (req, res, next) => {
  try {
    const { rows } = await gq.list()
    res.json(rows)
  } catch (err) { next(err) }
}

const getOne = async (req, res, next) => {
  try {
    const { rows } = await gq.findById(req.params.id)
    if (!rows[0]) return res.status(404).json({ error: 'Group not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
}

const create = async (req, res, next) => {
  try {
    const { name, description } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
    const { rows } = await gq.create({ name: name.trim(), description })
    res.status(201).json(rows[0])
  } catch (err) { next(err) }
}

const update = async (req, res, next) => {
  try {
    const { rows } = await gq.update(req.params.id, req.body)
    if (!rows[0]) return res.status(404).json({ error: 'Group not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
}

const remove = async (req, res, next) => {
  try {
    await gq.remove(req.params.id)
    res.json({ success: true })
  } catch (err) {
    if (err.message.includes('Cannot delete')) {
      return res.status(409).json({ error: err.message })
    }
    next(err)
  }
}

const listMembers = async (req, res, next) => {
  try {
    const { rows } = await gq.listMembers(req.params.id)
    res.json(rows)
  } catch (err) { next(err) }
}

const addMember = async (req, res, next) => {
  try {
    const groupId = req.params.id
    let { player_id, name, phone, email,
          venmo_handle, zelle_contact, paypal_handle, cashapp_tag, other_payment } = req.body

    if (!player_id) {
      if (!name?.trim()) return res.status(400).json({ error: 'player_id or name required' })
      const { rows } = await pq.create({
        name: name.trim(), phone, email,
        venmo_handle, zelle_contact, paypal_handle, cashapp_tag, other_payment,
      })
      player_id = rows[0].id
    }

    await gq.addMember(groupId, player_id)
    const { rows } = await gq.listMembers(groupId)
    res.status(201).json(rows)
  } catch (err) { next(err) }
}

const removeMember = async (req, res, next) => {
  try {
    await gq.removeMember(req.params.id, req.params.playerId)
    res.json({ success: true })
  } catch (err) { next(err) }
}

module.exports = { list, getOne, create, update, remove, listMembers, addMember, removeMember }
