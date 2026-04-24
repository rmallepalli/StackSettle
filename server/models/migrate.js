#!/usr/bin/env node
/**
 * Simple migration runner.
 * Usage:
 *   node server/models/migrate.js          -- run all pending migrations
 *   node server/models/migrate.js --seed   -- also load seed data (dev only)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../server/.env') })

const fs   = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  host:             process.env.DB_HOST,
  port:             parseInt(process.env.DB_PORT || '3306'),
  database:         process.env.DB_NAME,
  user:             process.env.DB_USER,
  password:         process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit:  5,
})

const MIGRATIONS_DIR = path.join(__dirname, 'migrations')

async function run() {
  const conn = await pool.getConnection()
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        filename   VARCHAR(200) NOT NULL UNIQUE,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    const [appliedRows] = await conn.query('SELECT filename FROM _migrations')
    const applied = new Set(appliedRows.map(r => r.filename))

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort()

    let count = 0
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  skip  ${file}`)
        continue
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
      const statements = sql.split(';').map(s => s.trim()).filter(Boolean)

      console.log(`  apply ${file}`)
      for (const stmt of statements) {
        await conn.query(stmt)
      }
      await conn.query('INSERT INTO _migrations (filename) VALUES (?)', [file])
      count++
    }

    if (count === 0) {
      console.log('Nothing to migrate — database is up to date.')
    } else {
      console.log(`\nApplied ${count} migration(s).`)
    }

    if (process.argv.includes('--seed')) {
      const seedPath = path.join(__dirname, 'seed.sql')
      if (fs.existsSync(seedPath)) {
        console.log('\nSeeding dev data…')
        const seed = fs.readFileSync(seedPath, 'utf8')
        const seedStmts = seed.split(';').map(s => s.trim()).filter(Boolean)
        for (const stmt of seedStmts) await conn.query(stmt)
        console.log('Seed complete.')
      }
    }
  } catch (err) {
    console.error('Migration failed:', err.message)
    process.exit(1)
  } finally {
    conn.release()
    await pool.end()
  }
}

run()
