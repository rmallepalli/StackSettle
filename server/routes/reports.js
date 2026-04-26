const router = require('express').Router()
const auth   = require('../middleware/auth')
const c      = require('../controllers/reportsController')

router.use(auth)

router.get('/player-stats', c.playerStats)

module.exports = router
