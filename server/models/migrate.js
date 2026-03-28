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
const { Pool } = require('pg')

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

const MIGRATIONS_DIR = path.join(__dirname, 'migrations')

async function run() {
  const client = await pool.connect()
  try {
    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        filename   VARCHAR(200) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    // Find which migrations have already run
    const { rows } = await client.query('SELECT filename FROM _migrations')
    const applied = new Set(rows.map(r => r.filename))

    // Get sorted list of .sql files
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
      console.log(`  apply ${file}`)
      await client.query('BEGIN')
      await client.query(sql)
      await client.query(
        'INSERT INTO _migrations (filename) VALUES ($1)', [file]
      )
      await client.query('COMMIT')
      count++
    }

    if (count === 0) {
      console.log('Nothing to migrate — database is up to date.')
    } else {
      console.log(`\nApplied ${count} migration(s).`)
    }

    // Optional seed
    if (process.argv.includes('--seed')) {
      const seedPath = path.join(__dirname, 'seed.sql')
      if (fs.existsSync(seedPath)) {
        console.log('\nSeeding dev data…')
        const seed = fs.readFileSync(seedPath, 'utf8')
        await client.query(seed)
        console.log('Seed complete.')
      }
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Migration failed:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
