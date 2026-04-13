#!/bin/sh
# Dynamically grant the node user access to the Docker socket.
# On Linux (Pi) the socket is owned by root:docker — we add node to that group.
# If socket is owned by root:root (GID 0)
# we chmod the socket so node can reach it, since joining group 0 is not useful.
SOCK=/var/run/docker.sock

if [ -S "$SOCK" ]; then
  SOCK_GID=$(stat -c '%g' "$SOCK")
  if [ "$SOCK_GID" = "0" ]; then
    chmod 666 "$SOCK"
  else
    addgroup -g "$SOCK_GID" dockerhost 2>/dev/null || true
    adduser node dockerhost 2>/dev/null || true
  fi
fi

exec su-exec node node dist/index.js
