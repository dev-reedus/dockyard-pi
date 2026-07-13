FROM node:22-alpine AS builder

WORKDIR /app

# Build from the repository root so npm can resolve the shared types workspace.
COPY package*.json ./
COPY agent/package*.json ./agent/
COPY packages/types/package.json packages/types/index.ts ./packages/types/
RUN npm ci

COPY agent/tsconfig.json ./agent/
COPY agent/src ./agent/src

RUN npm run build --workspace=dockyard-pi-agent

FROM node:22-alpine AS production-dependencies

WORKDIR /app

COPY package*.json ./
COPY agent/package*.json ./agent/
COPY packages/types/package.json ./packages/types/
# Root lifecycle scripts (Husky) are development-only and are intentionally
# skipped in this minimal production dependency stage.
RUN npm ci --omit=dev --ignore-scripts --workspace=dockyard-pi-agent --include-workspace-root=false

FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=builder /app/agent/dist ./dist

ENV NODE_ENV=production
ENV PORT=3001

RUN apk add --no-cache su-exec

COPY agent/entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health >/dev/null || exit 1

# Starts as root to detect and join the docker socket group dynamically,
# then drops to node via su-exec. See entrypoint.sh.
CMD ["./entrypoint.sh"]
