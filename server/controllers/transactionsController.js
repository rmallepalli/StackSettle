const tq = require('../models/transactionQueries')

const remove = async (req, res, next) => {
  try {
    const { rows: found } = await tq.findById(req.params.id)
    if (!found[0]) return res.status(404).json({ error: 'Transaction not found' })

    await tq.remove(req.params.id)
    res.json({ success: true })
  } catch (err) { next(err) }
}

module.exports = { remove }
