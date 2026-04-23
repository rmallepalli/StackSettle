const sq = require('../models/settlementQueries')
const { minimizeDebts } = require('../utils/debtMinimizer')

// GET /api/settlements?group_id=X — history log
const list = async (req, res, next) => {
  try {
    const { group_id } = req.query
    if (!group_id) return res.status(400).json({ error: 'group_id is required' })
    const { rows } = await sq.listHistory(group_id)
    res.json(rows)
  } catch (err) { next(err) }
}

// POST /api/settlements/calculate
// Body: { group_id, dateFrom, dateTo, gameIds[] }
// Returns the calculated transactions WITHOUT saving them
const calculate = async (req, res, next) => {
  try {
    const { group_id, dateFrom, dateTo, gameIds } = req.body
    if (!group_id) return res.status(400).json({ error: 'group_id is required' })

    const { rows } = await sq.getUnsettledGames({ groupId: group_id, dateFrom, dateTo, gameIds })
    if (!rows.length) {
      return res.json({ transactions: [], games: [], playerSummary: [] })
    }

    // Build unique game list for the response
    const gamesMap = {}
    for (const r of rows) {
      if (!gamesMap[r.game_id]) {
        gamesMap[r.game_id] = { game_id: r.game_id, game_date: r.game_date, host_name: r.host_name }
      }
    }

    // Per-player summary (net across all selected games)
    const playerMap = {}
    for (const r of rows) {
      if (!playerMap[r.player_id]) {
        playerMap[r.player_id] = {
          player_id:   r.player_id,
          player_name: r.player_name,
          net_total:   0,
          games:       [],
        }
      }
      playerMap[r.player_id].net_total += parseFloat(r.net_result || 0)
      playerMap[r.player_id].games.push({
        game_id:   r.game_id,
        game_date: r.game_date,
        net_result: parseFloat(r.net_result || 0),
      })
    }

    const transactions = minimizeDebts(rows)

    res.json({
      transactions,
      games:         Object.values(gamesMap),
      playerSummary: Object.values(playerMap),
    })
  } catch (err) { next(err) }
}

// POST /api/settlements
// Saves a settlement batch and marks games as settled
// Body: { group_id, transactions: [...], gameIds: [...], periodStart, periodEnd }
const save = async (req, res, next) => {
  try {
    const { group_id, transactions, gameIds, periodStart, periodEnd } = req.body
    if (!group_id) return res.status(400).json({ error: 'group_id is required' })
    if (!Array.isArray(transactions) || !transactions.length) {
      return res.status(400).json({ error: 'transactions array required' })
    }
    if (!Array.isArray(gameIds) || !gameIds.length) {
      return res.status(400).json({ error: 'gameIds array required' })
    }

    const toSave = transactions.map((t) => ({
      from_player_id: t.from_player_id,
      to_player_id:   t.to_player_id,
      amount:         t.amount,
      game_ids:       gameIds,
      period_start:   periodStart || null,
      period_end:     periodEnd   || null,
      group_id,
    }))

    const saved = await sq.createBatch(toSave)
    await sq.markGamesSettled(gameIds)

    res.status(201).json({ settlements: saved, settledGameIds: gameIds })
  } catch (err) { next(err) }
}

module.exports = { list, calculate, save }
