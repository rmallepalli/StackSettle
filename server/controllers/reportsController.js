const rq = require('../models/reportQueries')

// GET /api/reports/player-stats?group_id=X&dateFrom=&dateTo=
const playerStats = async (req, res, next) => {
  try {
    const { group_id, dateFrom, dateTo } = req.query
    if (!group_id) return res.status(400).json({ error: 'group_id is required' })

    const [statsRes, summaryRes] = await Promise.all([
      rq.playerStats({ groupId: group_id, dateFrom, dateTo }),
      rq.gameSummary({ groupId: group_id, dateFrom, dateTo }),
    ])

    const players = statsRes.rows.map((r) => ({
      ...r,
      games_played: parseInt(r.games_played),
      wins:         parseInt(r.wins),
      losses:       parseInt(r.losses),
      net_total:    parseFloat(r.net_total),
      best_game:    parseFloat(r.best_game),
      worst_game:   parseFloat(r.worst_game),
      total_buy_in: parseFloat(r.total_buy_in),
    }))

    const summary = summaryRes.rows[0] || {}

    res.json({
      players,
      summary: {
        total_games:  parseInt(summary.total_games  || 0),
        total_money:  parseFloat(summary.total_money  || 0),
        biggest_pot:  parseFloat(summary.biggest_pot  || 0),
        avg_pot:      parseFloat(summary.avg_pot      || 0),
      },
    })
  } catch (err) { next(err) }
}

module.exports = { playerStats }
