const router = require('express').Router()
const auth = require('../middleware/auth')

router.use(auth)

router.get('/', (_req, res) => res.json([]))

module.exports = router
