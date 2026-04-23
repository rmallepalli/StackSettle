require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/players', require('./routes/players'))
app.use('/api/groups', require('./routes/groups'))
app.use('/api/games', require('./routes/games'))
app.use('/api/transactions', require('./routes/transactions'))
app.use('/api/settlements', require('./routes/settlements'))

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

// Global error handler (must be last)
app.use(require('./middleware/errorHandler'))

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '../client/dist')
  app.use(express.static(clientBuild))
  app.get('*', (_req, res) =>
    res.sendFile(path.join(clientBuild, 'index.html'))
  )
}

app.listen(PORT, () => {
  console.log(`StackSettle server running on port ${PORT}`)
})
