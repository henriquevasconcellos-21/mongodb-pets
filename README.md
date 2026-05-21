# MongoDB Pets

A full-stack application for managing pet information. Built with a NestJS REST API, a Vue 3 SPA, MongoDB Atlas for the database, and AWS S3 for file storage.

```
backend/    # NestJS REST API  →  http://localhost:3000
frontend/   # Vue 3 + Vite SPA →  http://localhost:5173
scripts/    # Python utilities (seed_pets.py, update_birthdates.py)
```

---

## Environment Setup

All environment variables live in a single `.env.*` file at the **project root** (not inside `backend/` or `frontend/`).

```bash
cp .env.example .env.development   # local dev (manual or containerised)
cp .env.example .env.production    # EC2 / production
```

Edit the file and fill in your values:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Atlas connection string |
| `MONGODB_DB_NAME` | Database name |
| `AWS_REGION` | S3 bucket region |
| `AWS_S3_BUCKET` | S3 bucket name |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_PROFILE` | (Optional) local AWS named profile |
| `DOMAIN_NAME` | **Production only** — domain Traefik will route (e.g. `pets.yourdomain.com`) |
| `VITE_API_BASE_URL` | Backend URL baked into the frontend bundle at build time. `http://localhost:3000` for local, `https://pets.yourdomain.com/api` for production |

> **Note:** The project uses **MongoDB Atlas** (cloud). There is no local MongoDB instance — `MONGODB_URI` must point to a valid Atlas cluster.

---

## Option 1 — Running Locally Without Docker

Best for active development: hot-reload for both services, full debugger access.

### Prerequisites

- Node.js **v18+**
- npm

### 1. Configure environment

```bash
cp .env.example .env.development
# Edit .env.development with your Atlas URI, S3 credentials, etc.
```

### 2. Start the backend

```bash
cd backend
npm install
npm run start:dev        # watches for changes, runs on http://localhost:3000
```

### 3. Start the frontend (new terminal)

```bash
cd frontend
npm install
npm run dev              # Vite dev server, runs on http://localhost:5173
```

### Useful backend commands

```bash
npm test                 # Jest unit tests
npm run test:e2e         # E2E tests
npm run test:cov         # Coverage report
npm run lint             # ESLint with auto-fix
npm run format           # Prettier
```

---

## Option 2 — Running With Docker (local)

Builds optimised multi-stage images and runs both services with a single command. No Node.js installation required on the host.

### Prerequisites

- Docker **20.10+** with the Compose plugin (`docker compose`)

### Steps

```bash
# 1. Make sure .env.development is configured (see Environment Setup above)

# 2. Build images and start containers
docker compose -f docker-compose.local.yml up --build

# Run in the background
docker compose -f docker-compose.local.yml up --build -d

# Stop and remove containers
docker compose -f docker-compose.local.yml down
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |

> The local compose file reads `.env.development` automatically via `env_file`.

---

## Option 3 — Running With Podman (local)

Identical workflow to Docker. Use `podman compose` (built-in since Podman 4+) or install `podman-compose` separately.

### Prerequisites

- Podman **4.0+** (includes `podman compose`) **or** `podman-compose` installed via pip

### Steps

```bash
# 1. Make sure .env.development is configured (see Environment Setup above)

# 2. Build images and start containers
podman compose -f docker-compose.local.yml up --build

# Run in the background
podman compose -f docker-compose.local.yml up --build -d

# Stop and remove containers
podman compose -f docker-compose.local.yml down
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |

> If you are on a system where Podman runs rootless, make sure the `web-proxy` network and host port bindings are accessible under your user namespace.

---

## Option 4 — EC2 Deployment With Traefik

This section assumes:
- An EC2 instance (Amazon Linux 2023 / Ubuntu) with Docker or Podman installed.
- A Traefik container already running on the same host, attached to an external Docker/Podman network named **`web-proxy`**.
- A DNS `A` record for your domain pointing to the EC2 instance's public IP.

Traefik handles TLS termination (Let's Encrypt), HTTPS redirects, and reverse-proxy routing — the app containers do **not** expose ports directly.

### 1. SSH into your EC2 instance and clone the repo

```bash
ssh ec2-user@<your-ec2-ip>
git clone https://github.com/<your-org>/mongodb-pets.git
cd mongodb-pets
```

### 2. Configure production environment

```bash
cp .env.example .env.production
nano .env.production   # or vi, vim, etc.
```

Fill in every variable. Two are especially important for production:

```
DOMAIN_NAME=pets.yourdomain.com
VITE_API_BASE_URL=https://pets.yourdomain.com/api
```

> **`VITE_API_BASE_URL` is baked into the frontend bundle at build time.** If you leave it as `http://localhost:3000` (the default from `.env.example`), the frontend will ship pointing at localhost and every API call will fail in the browser.

### 3. Verify the external network exists

Traefik must already be attached to a network called `web-proxy`. Check it:

```bash
# Docker
docker network ls | grep web-proxy

# Podman
podman network ls | grep web-proxy
```

If it is missing, create it before starting Traefik:

```bash
docker network create web-proxy
# or
podman network create web-proxy
```

### 4a. Deploy with Docker

```bash
# Build images and start in the background
docker compose --env-file .env.production up -d --build

# Check running containers
docker compose ps

# Follow logs
docker compose logs -f

# Pull latest code and redeploy
git pull
docker compose --env-file .env.production up -d --build
```

### 4b. Deploy with Podman

```bash
# Build images and start in the background
podman compose --env-file .env.production up -d --build

# Check running containers
podman compose ps

# Follow logs
podman compose logs -f

# Pull latest code and redeploy
git pull
podman compose --env-file .env.production up -d --build
```

### How routing works

| Route | Container | Traefik rule |
|---|---|---|
| `https://pets.yourdomain.com/api/*` | `pets-backend` (port 3000) | `Host + PathPrefix(/api)` → strips `/api` prefix |
| `https://pets.yourdomain.com/*` | `pets-frontend` (Nginx port 80) | `Host` catch-all |

TLS certificates are provisioned automatically by Let's Encrypt via the `myresolver` cert resolver configured in Traefik.

### Useful production commands

```bash
# Stop without removing images
docker compose --env-file .env.production stop

# Destroy containers (keeps images and volumes)
docker compose --env-file .env.production down

# Rebuild a single service
docker compose --env-file .env.production up -d --build pets-backend
```

---

## Technologies

| Layer | Stack |
|---|---|
| Backend | NestJS · MongoDB native driver · AWS SDK v3 (S3) · TypeScript 5.7 |
| Frontend | Vue 3 · Vite · TypeScript 6 |
| Database | MongoDB Atlas (cloud) |
| Storage | AWS S3 |
| Container | Docker / Podman (multi-stage builds, Nginx for frontend) |
| Reverse Proxy | Traefik v2 (production) |
