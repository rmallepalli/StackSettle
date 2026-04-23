const router = require('express').Router()
const auth   = require('../middleware/auth')
const c      = require('../controllers/groupsController')

router.use(auth)

router.get('/',    c.list)
router.post('/',   c.create)
router.get('/:id', c.getOne)
router.put('/:id', c.update)
router.delete('/:id', c.remove)

router.get('/:id/members',               c.listMembers)
router.post('/:id/members',              c.addMember)
router.delete('/:id/members/:playerId',  c.removeMember)

module.exports = router
