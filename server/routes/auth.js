const router = require('express').Router()
const jwt = require('jsonwebtoken')

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { pin } = req.body
  if (!pin) return res.status(400).json({ error: 'PIN required' })

  if (pin !== process.env.APP_PIN) {
    return res.status(401).json({ error: 'Invalid PIN' })
  }

  const token = jwt.sign({ role: 'owner' }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  })
  res.json({ token })
})

module.exports = router
