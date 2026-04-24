const gq  = require('../models/gameQueries')
const gpq = require('../models/gamePlayerQueries')
const pq  = require('../models/playerQueries')
const tq  = require('../models/transactionQueries')

const list = async (req, res, next) => {
  try {
    const { group_id, status, host, dateFrom, dateTo } = req.query
    const { rows } = await gq.list({ groupId: group_id, status, hostSearch: host, dateFrom, dateTo })
    res.json(rows)
  } catch (err) { next(err) }
}

const getOne = async (req, res, next) => {
  try {
    const game = await gq.findById(req.params.id)
    if (!game) return res.status(404).json({ error: 'Game not found' })
    res.json(game)
  } catch (err) { next(err) }
}

const create = async (req, res, next) => {
  try {
    const { group_id, host_name, game_date, settlement_period, notes, player_ids } = req.body
    if (!host_name?.trim()) return res.status(400).json({ error: 'host_name is required' })
    if (!group_id) return res.status(400).json({ error: 'group_id is required' })

    const { rows } = await gq.create({ group_id, host_name, game_date, settlement_period, notes })
    const game = rows[0]

    // Optionally add players during creation
    if (Array.isArray(player_ids) && player_ids.length) {
      await Promise.all(player_ids.map((pid) => gpq.addPlayer(game.id, pid)))
    }

    const full = await gq.findById(game.id)
    res.status(201).json(full)
  } catch (err) { next(err) }
}

const update = async (req, res, next) => {
  try {
    const { rows } = await gq.update(req.params.id, req.body)
    if (!rows[0]) return res.status(404).json({ error: 'Game not found or not editable' })
    res.json(rows[0])
  } catch (err) { next(err) }
}

const finalize = async (req, res, next) => {
  try {
    const { rows } = await gq.finalize(req.params.id)
    if (!rows[0]) return res.status(404).json({ error: 'Game not found or already finalized' })
    res.json(rows[0])
  } catch (err) { next(err) }
}

const remove = async (req, res, next) => {
  try {
    const { rows } = await gq.remove(req.params.id)
    if (!rows[0]) return res.status(404).json({ error: 'Game not found or not deletable' })
    res.json({ success: true })
  } catch (err) { next(err) }
}

// --- Game-player sub-resources ---

const addPlayer = async (req, res, next) => {
  try {
    const game_id = req.params.id
    let { player_id, name, phone, email, venmo_handle, zelle_contact,
          paypal_handle, cashapp_tag, other_payment } = req.body

    // If no player_id, create a new player on the fly
    if (!player_id) {
      if (!name?.trim()) return res.status(400).json({ error: 'player_id or name required' })
      const { rows } = await pq.create({ name, phone, email, venmo_handle,
        zelle_contact, paypal_handle, cashapp_tag, other_payment })
      player_id = rows[0].id
    }

    await gpq.addPlayer(game_id, player_id)

    // Auto-enroll player into the game's group for membership consistency
    const db = require('../models/db')
    await db.query(
      `INSERT IGNORE INTO group_players (group_id, player_id)
       SELECT group_id, ? FROM games WHERE id = ?`,
      [player_id, game_id]
    )

    const game = await gq.findById(game_id)
    res.status(201).json(game)
  } catch (err) { next(err) }
}

const removePlayer = async (req, res, next) => {
  try {
    const { id: game_id, playerId: player_id } = req.params
    await gpq.removePlayer(game_id, player_id)
    res.json({ success: true })
  } catch (err) { next(err) }
}

const updatePlayerResult = async (req, res, next) => {
  try {
    const { id: game_id, playerId: player_id } = req.params
    const { ending_stack, adjusted_amount } = req.body
    const { rows } = await gpq.updateResult(game_id, player_id, { ending_stack, adjusted_amount })
    if (!rows[0]) return res.status(404).json({ error: 'Game player not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
}

const bulkUpdateStacks = async (req, res, next) => {
  try {
    const game_id = req.params.id
    const { stacks } = req.body  // [{ player_id, ending_stack }]
    if (!Array.isArray(stacks)) return res.status(400).json({ error: 'stacks array required' })
    const results = await gpq.bulkUpdateStacks(game_id, stacks)
    res.json(results)
  } catch (err) { next(err) }
}

// --- Transaction sub-resources ---

const listTransactions = async (req, res, next) => {
  try {
    const { rows } = await tq.listForGame(req.params.id)
    res.json(rows)
  } catch (err) { next(err) }
}

const addTransaction = async (req, res, next) => {
  try {
    const game_id = req.params.id
    const { player_id, amount, type, note } = req.body
    if (!player_id) return res.status(400).json({ error: 'player_id required' })
    if (!amount || amount <= 0) return res.status(400).json({ error: 'amount must be > 0' })

    const { rows } = await tq.create(game_id, player_id, amount, type, note)
    res.status(201).json(rows[0])
  } catch (err) { next(err) }
}

module.exports = {
  list, getOne, create, update, finalize, remove,
  addPlayer, removePlayer, updatePlayerResult, bulkUpdateStacks,
  listTransactions, addTransaction,
}
