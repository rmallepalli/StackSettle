const router = require('express').Router()
const auth   = require('../middleware/auth')
const c      = require('../controllers/playersController')

router.use(auth)

router.get('/',     c.list)
router.get('/:id',  c.getOne)
router.post('/',    c.create)
router.put('/:id',  c.update)
router.delete('/:id', c.remove)

module.exports = router
