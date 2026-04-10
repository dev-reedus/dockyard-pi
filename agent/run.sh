#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env file not found at $ENV_FILE"
  echo "Copy .env.example to .env and fill in the values."
  exit 1
fi

IMAGE="dockyard-agent"
CONTAINER="dockyard-agent"

echo "*****************************"
echo "* Building container image *"
echo "*****************************"
echo ""

docker build -t "$IMAGE" .

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "*****************************"
    echo "Stopping and removing existing container '$CONTAINER'..."
    echo "*****************************"
    echo ""
  docker rm -f "$CONTAINER"
fi

echo "*****************************"
echo "* Running assets-watchlist container on port 8087 *"
echo "*****************************"
echo ""

docker run -d \
  --name "$CONTAINER" \
  --restart unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --env-file "$ENV_FILE" \
  -p 3001:3001 \
  "$IMAGE"

echo "*************************************"
echo "✅ Agent running at http://localhost:3001/health"
echo "*************************************"
echo ""
