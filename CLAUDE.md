# Breakroom Project - Claude Context

## Project Overview
Breakroom is a full-stack web application with:
- **Frontend**: Vue 3 + Vite (port 5173)
- **Backend**: Express.js + Node 24 (port 3000)
- **Database**: MariaDB (migrated from PostgreSQL)
- **Reverse Proxy**: Host nginx (not Docker)

## Recent Changes (Dec 25, 2025)

### PostgreSQL to MariaDB Migration
- Replaced `pg` package with `mysql2` in backend
- Rewrote `backend/utilities/db.js` with a MySQL connection pool that provides a pg-compatible wrapper (auto-converts `$1, $2` placeholders to `?`, returns `rows`/`rowCount`)
- Converted `data/1-user-auth.sql` to MariaDB syntax (AUTO_INCREMENT, TIMESTAMP, InnoDB)
- Updated route files to remove `RETURNING` clauses (MariaDB doesn't support them)
- Updated `build.sh` to use `docker compose` v2 instead of `docker-compose`

### Docker Setup
- Removed reverse-proxy container from `docker-compose.local.yml` (using host nginx instead)
- Added environment variables to docker-compose: `VITE_ALLOWED_HOST`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, `CORS_ORIGIN`

### Host Nginx Setup
- Created `nginx-host-local.conf` for host nginx configuration
- SSL certificates at `/etc/nginx/ssl/local.prosaurus.com.*` (self-signed)
- Config installed at `/etc/nginx/sites-available/local.prosaurus.com`

## Database Configuration

**MariaDB Server**: 44.225.148.34:3306
**Database**: breakroom
**User**: DCAdminUser

Tables:
- `users` - User accounts
- `groups` - Permission groups (5 seeded)
- `permissions` - Individual permissions (20 seeded)
- `user_permissions` - User-permission assignments
- `group_permissions` - Group-permission assignments
- `user_groups` - User-group assignments

## Local Development Setup

### Prerequisites
- Docker and docker-compose-v2 installed
- Host nginx running
- `/etc/hosts` entry: `127.0.0.1 local.prosaurus.com`

### Environment File
Create `.env.local` in project root (not committed to git):
```
VITE_API_BASE_URL=https://local.prosaurus.com
VITE_ALLOWED_HOST=local.prosaurus.com
NODE_ENV=development

DB_HOST=44.225.148.34
DB_PORT=3306
DB_USER=DCAdminUser
DB_PASS=<password>
DB_NAME=breakroom

CORS_ORIGIN=https://local.prosaurus.com
```

### Running Locally
```bash
# Start Docker containers
./build.sh local up

# Stop containers
docker compose -f docker-compose.local.yml down
```

### Access
- **URL**: https://local.prosaurus.com
- Browser will trust the self-signed cert (added to system CA store)

## EC2 Production Deployment

### Step 1: Install Docker & Docker Compose

```bash
# Install Docker
sudo apt update
sudo apt install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

# Install Docker Compose v2
sudo apt install -y docker-compose-plugin

# Log out and back in for group changes to take effect
```

### Step 2: Configure Environment Variables

Edit `.env.production` in project root with production values:
```
VITE_API_BASE_URL=https://www.prosaurus.com
VITE_ALLOWED_HOST=www.prosaurus.com
NODE_ENV=production

DB_HOST=44.225.148.34
DB_PORT=3306
DB_USER=DCAdminUser
DB_PASS=<password>
DB_NAME=breakroom

CORS_ORIGIN=https://www.prosaurus.com
SECRET_KEY=<strong-jwt-secret>
SENDGRID_API_KEY=<sendgrid-key>
```

### Step 3: Set Up SSL Certificates

Option A - Let's Encrypt (recommended for production):
```bash
sudo apt install -y certbot
sudo certbot certonly --standalone -d www.prosaurus.com
# Certs will be at /etc/letsencrypt/live/www.prosaurus.com/
```

Option B - Self-signed (testing only):
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /path/to/domain.key \
  -out /path/to/domain.crt
```

Update `backend/etc/nginx.production.conf` with certificate paths.

### Step 4: Configure DNS

Point your domain to EC2 public IP:
- `www.prosaurus.com` → `<EC2-Public-IP>`
- Or use Route 53 / your DNS provider

### Step 5: Build & Deploy

```bash
cd /home/hakr49/breakroom

# Build for production (builds frontend, creates nginx image)
./build.sh production

# Start containers in detached mode
docker compose -f docker-compose.production.yml up -d
```

### Step 6: Verify Deployment

```bash
# Check running containers
docker ps

# View logs
docker compose -f docker-compose.production.yml logs -f

# Test the endpoint
curl -k https://www.prosaurus.com
```

### Step 7: EC2 Security Group Configuration

In AWS Console, ensure security group allows:
| Type  | Port | Source    | Description           |
|-------|------|-----------|----------------------|
| HTTP  | 80   | 0.0.0.0/0 | Redirect to HTTPS    |
| HTTPS | 443  | 0.0.0.0/0 | Main application     |
| MySQL | 3306 | Outbound  | Database connection  |

### Useful Commands

```bash
# Stop production containers
docker compose -f docker-compose.production.yml down

# Rebuild and restart
./build.sh production
docker compose -f docker-compose.production.yml up -d --force-recreate

# View specific container logs
docker logs breakroom-backend -f
docker logs breakroom-nginx -f
```

## File Structure Notes
- `backend/utilities/db.js` - Database connection wrapper (MySQL2 with pg-compatible interface)
- `backend/routes/` - API routes (authentication, user, group, permission)
- `data/1-user-auth.sql` - MariaDB schema with seed data
- `nginx-host-local.conf` - Host nginx config template
- `.env.local` - Local environment variables (gitignored)

## Known Issues / Notes
- The db.js wrapper auto-converts PostgreSQL `$1, $2` placeholders to MySQL `?` placeholders
- `RETURNING` clause not supported in MariaDB - queries fetch data separately after INSERT/UPDATE
- `groups` table name requires backticks in SQL (reserved word in MySQL)
- Docker containers need host.docker.internal or 172.17.0.1 to reach host services

## Git
- Repository: https://github.com/dallascaley/Breakroom
- Branch: main
- `.env.local` removed from repo and added to `.gitignore`
