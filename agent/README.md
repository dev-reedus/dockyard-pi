# DockYard Pi — Agent

A minimal Node.js/Express API that sits between the Next.js dashboard and the Docker socket on the Raspberry Pi. The
dashboard never talks to Docker directly — all infrastructure reads and writes go through this agent, which exposes only
the operations the UI actually needs.

---

## Why a separate agent?

Giving a web app direct access to `/var/run/docker.sock` exposes Docker setup too much. The agent acts as a constrained
proxy:

- Only the endpoints defined here are reachable
- Every mutation is recorded in the audit log before it runs
- The token secret never leaves the Pi's local network

---

## API

All endpoints require `Authorization: Bearer <AGENT_TOKEN>`.

| Method | Path                        | Description                              |
| ------ | --------------------------- | ---------------------------------------- |
| `GET`  | `/health`                   | Health check — unauthenticated           |
| `GET`  | `/services`                 | List all containers                      |
| `GET`  | `/services/:id`             | Single container detail                  |
| `GET`  | `/services/:id/stats`       | Live CPU, memory, network snapshot       |
| `GET`  | `/services/:id/logs?tail=N` | Recent log lines (default 100, max 1000) |
| `POST` | `/services/:id/actions`     | Trigger an action (see below)            |
| `GET`  | `/deployments?serviceId=`   | Action history, newest first             |
| `GET`  | `/events`                   | Recent system events                     |

### Actions

POST body: `{ "action": "<type>" }`

| Action           | Description                                             |
| ---------------- | ------------------------------------------------------- |
| `restart`        | Restart the container                                   |
| `stop`           | Stop the container                                      |
| `start`          | Start a stopped container                               |
| `recreate`       | Pull latest image and recreate the container            |
| `compose-update` | `docker compose pull && up -d` in the project directory |

---

## Setup

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3001
AGENT_TOKEN=<openssl rand -hex 32>   # must match AGENT_TOKEN in the Next.js app

# macOS (OrbStack):      /Users/<you>/.orbstack/run/docker.sock
# macOS (Docker Desktop): /Users/<you>/.docker/run/docker.sock
# Linux / Pi:            leave unset, defaults to /var/run/docker.sock
DOCKER_SOCKET=
```

> **Note:** Always use absolute paths. Node.js does not expand `~`.

### 2. Development (local)

```bash
npm install
npm run dev     # tsx watch — auto-restarts on file change
```

```bash
# Run with the helper script (reads .env automatically)
./run.sh
```

The script build new image, stops any existing container, starts a new one with `--restart unless-stopped`, and mounts
the Docker socket.

### 3. Production (Docker on the Pi)

```bash
docker compose up -d --build #from the project root
```

The `compose.yml` declares the socket mount, env file, and restart policy — the canonical way to run this in production.
Use `run.sh` only for quick one-off testing.

### 4. Verify

```bash
curl http://localhost:3001/health
# → {"status":"ok","uptime":12.3}

curl -H "Authorization: Bearer <token>" http://localhost:3001/services
# → [{ "id": "...", "displayName": "...", ... }]
```

---

## Project structure

```
src/
  index.ts              Entry point — Express app, proxy, route registration
  types.ts              Shared types (mirrors src/types/service.ts in the Next.js app)
  proxy/
    auth.ts             Bearer token check using timing-safe comparison
  lib/
    docker.ts           All dockerode calls — the only file that talks to Docker
    store.ts            In-memory audit log for deployments and events
  routes/
    services.ts         GET /services, GET /services/:id
    stats.ts            GET /services/:id/stats
    logs.ts             GET /services/:id/logs
    actions.ts          POST /services/:id/actions
    deployments.ts      GET /deployments
    events.ts           GET /events
```

---

## v2 improvements

These are intentionally out of scope for v1 cause of time, but worth building next, in the meantime the list could be
extended with other ideas:

- [ ] **Persistence** — Replace the in-memory store (`lib/store.ts`) with SQLite via `better-sqlite3`. The audit log
      currently resets on every agent restart. On the Pi this is rare, but deployments and events history should survive
      reboots.

- [x] **Live log streaming** — Replace the snapshot log endpoint with an SSE (Server-Sent Events) stream. The client
      keeps an open HTTP connection and the agent pipes `docker logs --follow` output in real time. No WebSocket server
      needed — SSE is one-directional and works over plain HTTP.

- [ ] **Host metrics** — Expose Pi-level metrics: CPU temperature (`/sys/class/thermal`), disk usage (`df`), total RAM.
      These sit alongside container stats on the dashboard without needing a separate tool like Prometheus.

- [ ] **Webhook endpoint** — A `POST /deploy/:serviceId` endpoint callable from a GitHub Actions workflow after a
      successful image push. The agent pulls the new image and recreates the container, turning a git push into a full
      deploy.

- [ ] **Structured logging** — Replace `console.log` / `console.error` with a proper logger (e.g. `pino`)

- [ ] **Request validation** — Add schema validation on POST bodies (eg `zod`). Currently the action type is checked
      with a
      `Set`
