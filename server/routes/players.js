const router = require('express').Router()
const auth = require('../middleware/auth')

// Placeholder — full implementation in Step 3
router.use(auth)

router.get('/', (_req, res) => res.json([]))

module.exports = router
