#!/usr/bin/env bash
# deploy.sh — build the dockyard-app image for linux/arm/v7 (32-bit Pi)
# and deploy it to the Raspberry Pi over SSH.
#
# Usage:
#   ./deploy.sh [pi-host] [ssh-password]
#
#   pi-host      defaults to pi@raspberrypi.local
#   ssh-password optional — if omitted, SSH key auth is used.
#                If provided, requires sshpass: brew install sshpass
#
# Examples:
#   ./deploy.sh                               # key auth, default host
#   ./deploy.sh pi@192.168.1.42               # key auth, custom host
#   ./deploy.sh pi@192.168.1.42 mypassword    # password auth
set -euo pipefail

PI_HOST="${1:-pi@raspberrypi.local}"
SSH_PASSWORD="${2:-}"
IMAGE="dockyard-app"
TARBALL="/tmp/${IMAGE}.tar.gz"
PLATFORM="linux/arm/v7"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
info() { echo "[deploy] $*"; }
die()  { echo "[deploy] ERROR: $*" >&2; exit 1; }

require_cmd() {
  command -v "$1" &>/dev/null || die "'$1' not found. Please install it first."
}

# ---------------------------------------------------------------------------
# Prerequisites
# ---------------------------------------------------------------------------
require_cmd docker
require_cmd ssh
require_cmd scp

# sshpass wraps ssh/scp to supply a password non-interactively
if [ -n "$SSH_PASSWORD" ]; then
  require_cmd sshpass
  SSH="sshpass -p $SSH_PASSWORD ssh"
  SCP="sshpass -p $SSH_PASSWORD scp"
else
  SSH="ssh"
  SCP="scp"
fi

if ! docker buildx version &>/dev/null; then
  die "docker buildx not available. Update Docker Desktop or install the buildx plugin."
fi

# ---------------------------------------------------------------------------
# QEMU — only needed on x86_64; arm64 can run arm/v7 binaries natively
# ---------------------------------------------------------------------------
HOST_ARCH="$(uname -m)"
if [ "$HOST_ARCH" = "x86_64" ]; then
  info "Registering QEMU binfmt handlers (required on x86_64)..."
  docker run --rm --privileged tonistiigi/binfmt --install arm &>/dev/null
else
  info "Host is $HOST_ARCH — skipping QEMU (arm/v7 runs natively)"
fi

# ---------------------------------------------------------------------------
# Buildx builder
# ---------------------------------------------------------------------------
BUILDER="dockyard-builder"
info "Creating buildx builder '$BUILDER'..."
docker buildx create --name "$BUILDER" --use

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
info "Building $IMAGE for $PLATFORM (this may take a while)..."
docker buildx build \
  --platform "$PLATFORM" \
  --tag "$IMAGE" \
  --load \
  .

# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------
info "Exporting image to $TARBALL..."
docker save "$IMAGE" | gzip > "$TARBALL"

# ---------------------------------------------------------------------------
# Copy to Pi
# ---------------------------------------------------------------------------
info "Copying image to $PI_HOST..."
$SCP "$TARBALL" "${PI_HOST}:~/${IMAGE}.tar.gz"

# ---------------------------------------------------------------------------
# Load and start on Pi
# ---------------------------------------------------------------------------
info "Loading image and restarting stack on Pi..."
$SSH "$PI_HOST" bash <<EOF
  docker load < ~/${IMAGE}.tar.gz
  rm ~/${IMAGE}.tar.gz
EOF

# ---------------------------------------------------------------------------
# Cleanup — remove local tarball and buildx builder
# ---------------------------------------------------------------------------
rm "$TARBALL"
docker buildx rm "$BUILDER"

info "Done. ${IMAGE} has been loaded. Run docker-compose up -d from project directory"
