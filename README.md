# StackSettle

[![CI](https://github.com/YOUR_USERNAME/stacksettle/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/stacksettle/actions/workflows/ci.yml)

A home poker settlement app for tracking buy-ins, rebuys, chip stacks, and
calculating who owes what across multiple games — with debt minimization.

## Features

- **Player Management** — Save players with payment details (Venmo, Zelle, PayPal, Cash App)
- **Game Tracking** — Create games, add players, record buy-ins and rebuys in real time
- **Settlement Reports** — Aggregate results across multiple games with minimum-transaction debt calculation
- **Mobile-First** — Designed for use at the poker table on your phone

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + Tailwind CSS + React Router |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | PIN-based (JWT) |

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm 9+

---

## Local Development Setup

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/stacksettle.git
cd stacksettle
```

### 2. Install all dependencies

```bash
npm run install:all
```

### 3. Configure environment variables

```bash
cp .env.example server/.env
```

Edit `server/.env` with your database credentials and a JWT secret.

### 4. Create the database

```sql
CREATE DATABASE stacksettle;
```

Then run the migrations:

```bash
cd server
npm run migrate          # apply all migrations
npm run migrate:seed     # also load sample dev data (optional)
```

Or with psql directly:

```bash
psql -U postgres -d stacksettle -f server/models/schema.sql
```

### 5. Start development servers

```bash
# From project root — starts both client (5173) and server (3001)
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api

---

## Project Structure

```
stacksettle/
├── client/                  # React Vite frontend
│   ├── src/
│   │   ├── components/      # Shared UI components
│   │   ├── pages/           # Route-level page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Helper functions (debt calc, formatting)
│   │   └── App.jsx
│   ├── index.html
│   └── vite.config.js
├── server/                  # Express backend
│   ├── routes/              # Express route definitions
│   ├── controllers/         # Business logic
│   ├── models/              # DB schema + query helpers
│   ├── middleware/          # Auth, validation, error handling
│   └── index.js
├── .github/
│   └── workflows/
│       └── ci.yml           # GitHub Actions: lint + build on push
├── .env.example
├── .gitignore
└── README.md
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port (default 5432) |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `PORT` | Express server port (default 3001) |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `APP_PIN` | PIN code to access the app |
| `CLIENT_URL` | Frontend URL for CORS |

---

## Deployment

See **[docs/deployment.md](docs/deployment.md)** for the full step-by-step guide covering:

| Option | Guide covers |
|--------|-------------|
| **Shared hosting** (Hostinger, cPanel) | PostgreSQL setup, Node.js App config, `.htaccess` proxy, FTP deploy |
| **VPS** (Ubuntu 22.04) | PostgreSQL, nginx reverse proxy, PM2, SSL via Let's Encrypt |
| **GitHub Actions** | Automated FTP and SSH deploy workflows |
| **Database backup** | `pg_dump` one-liner + daily cron |

**Quick summary for shared hosting:**
```bash
# 1. Build locally
cd client && VITE_API_URL=https://yourdomain.com/api npm run build

# 2. Upload client/dist/ → public_html/  (FTP or cPanel File Manager)
# 3. Upload server/     → ~/stacksettle-server/
# 4. On server: node models/migrate.js
# 5. cPanel → Setup Node.js App → Restart
```

---

## GitHub Actions

### CI (automatic — every push / PR to `main`)

Three parallel jobs after each push:

| Job | What it does |
|-----|-------------|
| **Lint** | ESLint on the React client |
| **Build** | Vite production build; uploads `client/dist/` as an artifact |
| **Server check** | `node --check` syntax validation on every server file |

Runs are cancelled automatically if a new push arrives before the previous one finishes.

### Deploy workflows (manual trigger)

| Workflow | File | Use case |
|----------|------|----------|
| Deploy via FTP | [deploy-ftp.yml](.github/workflows/deploy-ftp.yml) | Shared hosting (Hostinger, cPanel) |
| Deploy via SSH | [deploy-ssh.yml](.github/workflows/deploy-ssh.yml) | VPS with PM2 |

**Secrets required** — configure in GitHub → Settings → Secrets → Actions:

| Secret | Used by |
|--------|---------|
| `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` | FTP deploy |
| `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_PORT` | SSH deploy |
| `VITE_API_URL` | Both deploy workflows |
| `DEPLOY_PATH` | SSH deploy |

After adding secrets, trigger a deploy from **Actions → Deploy → Run workflow**.

See [.github/workflows/ci.yml](.github/workflows/ci.yml).

---

## License

MIT
