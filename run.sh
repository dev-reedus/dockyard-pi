#!/usr/bin/env bash
# run.sh — build and start the full DockYard stack (app + agent).
# Run this on the Pi after cloning the repo.
set -euo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
info()  { echo "[dockyard] $*"; }
warn()  { echo "[dockyard] WARNING: $*" >&2; }
die()   { echo "[dockyard] ERROR: $*" >&2; exit 1; }

require_cmd() {
  command -v "$1" &>/dev/null || die "'$1' not found. Please install it first."
}

# ---------------------------------------------------------------------------
# Prerequisites
# ---------------------------------------------------------------------------
require_cmd docker

# `docker compose` (plugin) preferred over the legacy `docker-compose` binary
if ! docker compose version &>/dev/null; then
  die "Docker Compose plugin not found. Run: sudo apt-get install docker-compose-plugin"
fi

# ---------------------------------------------------------------------------
# Env files
# ---------------------------------------------------------------------------
info "Checking environment files…"

if [ ! -f ".env" ]; then
  info ".env not found — copying from .env.example"
  cp .env.example .env
fi

if [ ! -f "agent/.env" ]; then
  info "agent/.env not found — copying from agent/.env.example"
  cp agent/.env.example agent/.env
fi

# ---------------------------------------------------------------------------
# Generate missing secrets
# ---------------------------------------------------------------------------
generate_secret() {
  openssl rand -hex 32
}

# Patch a KEY=value line in a file. Adds the line if the key is missing.
set_env_value() {
  local file="$1" key="$2" value="$3"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    # Replace existing (handles empty values)
    sed -i.bak "s|^${key}=.*|${key}=${value}|" "$file" && rm -f "${file}.bak"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

# AUTH_SECRET
if ! grep -q "^AUTH_SECRET=.\+" .env 2>/dev/null; then
  secret=$(generate_secret)
  set_env_value .env AUTH_SECRET "$secret"
  info "Generated AUTH_SECRET"
fi

# Shared AGENT_TOKEN — must be identical in both env files
agent_token=$(grep "^AGENT_TOKEN=.\+" agent/.env 2>/dev/null | cut -d= -f2- || true)
if [ -z "$agent_token" ] || [ "$agent_token" = "change_me" ]; then
  agent_token=$(generate_secret)
  set_env_value agent/.env AGENT_TOKEN "$agent_token"
  info "Generated AGENT_TOKEN"
fi
# Keep app .env in sync
set_env_value .env AGENT_TOKEN "$agent_token"

# Refuse to start with an empty or documented placeholder password. This app can
# control Docker, so an insecure default must not be deployable by accident.
auth_password=$(grep "^AUTH_PASSWORD=.\+" .env 2>/dev/null | cut -d= -f2- || true)
if [ -z "$auth_password" ] || [ "$auth_password" = "yourpassword" ]; then
  die "Set a strong AUTH_PASSWORD in .env before starting DockYard"
fi

# ---------------------------------------------------------------------------
# Build & start
# ---------------------------------------------------------------------------
info "Building images and starting containers…"
docker compose up --build -d

info "Done. DockYard is running at http://localhost:3000"
