const q = require('../models/playerQueries')

const list = async (req, res, next) => {
  try {
    const { search } = req.query
    const { rows } = await q.list({ search })
    res.json(rows)
  } catch (err) { next(err) }
}

const getOne = async (req, res, next) => {
  try {
    const { rows } = await q.findById(req.params.id)
    if (!rows[0]) return res.status(404).json({ error: 'Player not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
}

const create = async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
    const { rows } = await q.create(req.body)
    res.status(201).json(rows[0])
  } catch (err) { next(err) }
}

const update = async (req, res, next) => {
  try {
    const { rows } = await q.update(req.params.id, req.body)
    if (!rows[0]) return res.status(404).json({ error: 'Player not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
}

const remove = async (req, res, next) => {
  try {
    const { rows } = await q.remove(req.params.id)
    if (!rows[0]) return res.status(404).json({ error: 'Player not found' })
    res.json({ success: true })
  } catch (err) { next(err) }
}

module.exports = { list, getOne, create, update, remove }
