# StackSettle — Deployment Guide

Two paths covered:

- **Option A — Shared Hosting** (Hostinger, cPanel, etc.) — cheapest, no root access needed
- **Option B — VPS** (DigitalOcean, Linode, Vultr, Hetzner) — more control, recommended for long-term

---

## Prerequisites (both options)

| Requirement | Version |
|-------------|---------|
| Node.js | 18 LTS or 20 LTS |
| PostgreSQL | 14+ |
| npm | 9+ |

---

## Option A — Shared Hosting (Hostinger / cPanel)

Hostinger's Business plan and most cPanel hosts support Node.js apps and PostgreSQL.

### Step 1 — Create the PostgreSQL database

**cPanel → PostgreSQL Databases:**

1. Create database: `stacksettle`
2. Create user: `ss_user` with a strong password
3. Add user to database with **ALL PRIVILEGES**
4. Note the hostname — usually `localhost` or `127.0.0.1`

---

### Step 2 — Set up the Node.js app

**cPanel → Setup Node.js App:**

| Field | Value |
|-------|-------|
| Node.js version | 20 (or highest available) |
| Application mode | Production |
| Application root | `stacksettle-server` (a folder in your home dir) |
| Application URL | Your domain or subdomain |
| Application startup file | `index.js` |

Click **Create**. Note the path to the app's virtual environment (you'll need it for npm).

---

### Step 3 — Upload server files

Using File Manager or SFTP, upload the contents of your `server/` folder to the **Application root** you set above (e.g. `~/stacksettle-server/`).

```
~/stacksettle-server/
├── index.js
├── package.json
├── package-lock.json
├── .env                ← create this (see Step 4)
├── controllers/
├── middleware/
├── models/
├── routes/
└── utils/
```

> Do **not** upload `node_modules/` — install on the server instead (Step 5).

---

### Step 4 — Create the `.env` file on the server

In File Manager, create `~/stacksettle-server/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stacksettle
DB_USER=ss_user
DB_PASSWORD=your_strong_password_here

PORT=3001
NODE_ENV=production

JWT_SECRET=generate-a-long-random-string-here
APP_PIN=1234

CLIENT_URL=https://yourdomain.com
```

> **Generate JWT_SECRET:** run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` locally.

Alternatively, cPanel's Node.js App manager has an **Environment Variables** section — use that instead of a `.env` file.

---

### Step 5 — Install dependencies on the server

In cPanel → Setup Node.js App → click **Run NPM Install** (or use SSH/terminal):

```bash
cd ~/stacksettle-server
npm install --omit=dev
```

---

### Step 6 — Run database migrations

Open cPanel → Terminal (or SSH):

```bash
cd ~/stacksettle-server
node models/migrate.js
```

Expected output:
```
  apply 001_create_players.sql
  apply 002_create_games.sql
  apply 003_create_game_players.sql
  apply 004_create_transactions.sql
  apply 005_create_settlements.sql

Applied 5 migration(s).
```

---

### Step 7 — Build and upload the frontend

Run locally:

```bash
cd client
VITE_API_URL=https://yourdomain.com/api npm run build
```

Then upload the contents of `client/dist/` to `public_html/` on the server.

```
public_html/
├── index.html
├── assets/
│   ├── index-xxxx.js
│   └── index-xxxx.css
└── favicon.svg
```

---

### Step 8 — Configure API proxy (`.htaccess`)

The React app lives in `public_html/` but API calls go to the Node.js server on port 3001. Add a `.htaccess` to `public_html/`:

```apache
# Proxy /api/* to the Node.js app
RewriteEngine On

# API requests → Node.js server
RewriteCond %{REQUEST_URI} ^/api [NC]
RewriteRule ^api/(.*)$ http://localhost:3001/api/$1 [P,L]

# SPA fallback — send all non-file requests to index.html
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ /index.html [L]
```

> If your host doesn't support `mod_proxy`, set `VITE_API_URL` to the full URL of your Node app (e.g. `https://api.yourdomain.com`) and create a subdomain pointing at the Node.js app.

---

### Step 9 — Start the Node.js app

cPanel → Setup Node.js App → **Restart**.

Visit `https://yourdomain.com` — you should see the StackSettle login screen.

---

### Updating the app (shared hosting)

1. Pull changes locally, rebuild: `npm run build` in `client/`
2. Upload new `client/dist/` to `public_html/`
3. Upload changed server files to `~/stacksettle-server/`
4. If server deps changed: Run NPM Install in cPanel
5. If new migrations: `node models/migrate.js` in terminal
6. Restart Node.js app in cPanel

Or use the [GitHub Actions FTP deploy workflow](../.github/workflows/deploy-ftp.yml) to automate steps 1–2.

---

---

## Option B — VPS (Ubuntu 22.04 LTS)

Recommended for reliability. DigitalOcean's $6/mo Droplet handles StackSettle comfortably.

### Step 1 — Initial server setup

```bash
# As root on the server:
apt update && apt upgrade -y
apt install -y curl git ufw nginx certbot python3-certbot-nginx

# Create a non-root deploy user
adduser deploy
usermod -aG sudo deploy

# Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

### Step 2 — Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # should show v20.x.x
```

---

### Step 3 — Install PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl enable --now postgresql

# Create DB and user
sudo -u postgres psql <<SQL
CREATE USER ss_user WITH PASSWORD 'your_strong_password';
CREATE DATABASE stacksettle OWNER ss_user;
GRANT ALL PRIVILEGES ON DATABASE stacksettle TO ss_user;
SQL
```

---

### Step 4 — Install PM2 (process manager)

```bash
npm install -g pm2
pm2 startup systemd -u deploy --hp /home/deploy
# Run the outputted command as root
```

---

### Step 5 — Deploy the application

```bash
# As deploy user:
su - deploy
mkdir -p /var/www/stacksettle
cd /var/www/stacksettle

# Clone the repo
git clone https://github.com/YOUR_USERNAME/stacksettle.git .

# Install server deps
cd server && npm ci --omit=dev && cd ..

# Build the frontend
cd client && npm ci && npm run build && cd ..
```

---

### Step 6 — Configure environment

```bash
cat > /var/www/stacksettle/server/.env <<'EOF'
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stacksettle
DB_USER=ss_user
DB_PASSWORD=your_strong_password

PORT=3001
NODE_ENV=production

JWT_SECRET=REPLACE_WITH_LONG_RANDOM_STRING
APP_PIN=1234

CLIENT_URL=https://yourdomain.com
EOF

chmod 600 /var/www/stacksettle/server/.env
```

---

### Step 7 — Run migrations

```bash
cd /var/www/stacksettle/server
node models/migrate.js
```

---

### Step 8 — Start app with PM2

```bash
cd /var/www/stacksettle/server
pm2 start index.js --name stacksettle
pm2 save
```

Verify: `pm2 status` should show `stacksettle` as **online**.

---

### Step 9 — Configure nginx

```bash
cat > /etc/nginx/sites-available/stacksettle <<'NGINX'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Serve React build
    root /var/www/stacksettle/client/dist;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API to Express
    location /api {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
NGINX

ln -s /etc/nginx/sites-available/stacksettle /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

### Step 10 — SSL with Let's Encrypt

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Follow prompts; choose to redirect HTTP → HTTPS
```

Certbot auto-renews. Test renewal: `certbot renew --dry-run`.

---

### Updating the app (VPS)

```bash
cd /var/www/stacksettle
git pull origin main
cd client && npm ci && npm run build && cd ..
cd server && npm ci --omit=dev
node models/migrate.js   # only if new migrations
pm2 restart stacksettle
```

Or use the [GitHub Actions SSH deploy workflow](../.github/workflows/deploy-ssh.yml).

---

## Troubleshooting

### "Cannot reach the server" toast
- Check the Express server is running: `pm2 status` (VPS) or cPanel Node.js App
- Check `PORT` in `.env` matches the proxy config
- Check firewall isn't blocking 3001 (VPS: `ufw status`)

### 502 Bad Gateway (nginx)
- Express isn't running: `pm2 restart stacksettle`
- Port mismatch: nginx `proxy_pass` must match `PORT` in `.env`

### "Invalid PIN" on first login
- `APP_PIN` in `.env` must match what you type in the app
- Restart the app after changing `.env`

### Migrations fail
- Check DB credentials in `.env` match the PostgreSQL user/db you created
- Ensure the DB user has `CREATE TABLE` and `CREATE FUNCTION` privileges

### 404 on page refresh (SPA)
- Shared hosting: verify `.htaccess` is uploaded and `mod_rewrite` is enabled
- VPS/nginx: verify `try_files $uri $uri/ /index.html` is in the nginx config

---

## Backup

```bash
# Dump database (run on server or locally via SSH)
pg_dump -U ss_user -h localhost stacksettle > stacksettle_$(date +%Y%m%d).sql

# Restore
psql -U ss_user -d stacksettle < stacksettle_20260327.sql
```

Set up a daily cron on VPS:

```bash
crontab -e
# Add:
0 3 * * * pg_dump -U ss_user stacksettle | gzip > /home/deploy/backups/stacksettle_$(date +\%Y\%m\%d).sql.gz
```
