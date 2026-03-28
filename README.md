# StackSettle

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

## Deployment (Shared Hosting / cPanel)

### Option A: Node.js App on Hostinger / cPanel

1. Build the frontend:
   ```bash
   npm run build
   ```
2. Upload `client/dist/` contents to `public_html/`
3. Upload `server/` to a directory outside `public_html` (e.g., `~/stacksettle-server/`)
4. Set up Node.js app in cPanel pointing to `server/index.js`
5. Configure environment variables in cPanel's Node.js app manager
6. Set up PostgreSQL database via cPanel → PostgreSQL Databases

### Option B: VPS (recommended)

Use a reverse proxy (nginx) in front of the Express server and serve the React build as static files.

See `docs/deployment.md` for a full nginx + PM2 setup guide.

---

## GitHub Actions CI

On every push to `main`, the workflow:
1. Installs dependencies
2. Lints the frontend
3. Runs a production build check

See [.github/workflows/ci.yml](.github/workflows/ci.yml).

---

## License

MIT
