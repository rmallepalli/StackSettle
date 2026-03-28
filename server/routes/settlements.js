const router = require('express').Router()
const auth   = require('../middleware/auth')
const c      = require('../controllers/settlementsController')

router.use(auth)

router.get('/',          c.list)
router.post('/calculate', c.calculate)
router.post('/',         c.save)

module.exports = router
