const router = require('express').Router()
const auth   = require('../middleware/auth')
const c      = require('../controllers/transactionsController')

router.use(auth)

// Delete a specific transaction by ID (buy-in/rebuy correction)
router.delete('/:id', c.remove)

module.exports = router
