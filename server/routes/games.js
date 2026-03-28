const router = require('express').Router()
const auth   = require('../middleware/auth')
const c      = require('../controllers/gamesController')

router.use(auth)

// Game CRUD
router.get('/',    c.list)
router.post('/',   c.create)
router.get('/:id', c.getOne)
router.put('/:id', c.update)
router.delete('/:id', c.remove)

// Status transitions
router.patch('/:id/finalize', c.finalize)

// Players within a game
router.post('/:id/players',                       c.addPlayer)
router.delete('/:id/players/:playerId',            c.removePlayer)
router.patch('/:id/players/:playerId',             c.updatePlayerResult)
router.patch('/:id/stacks',                        c.bulkUpdateStacks)

// Transactions within a game
router.get('/:id/transactions',  c.listTransactions)
router.post('/:id/transactions', c.addTransaction)

module.exports = router
