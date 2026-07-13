# node:22-slim (Debian/glibc) instead of alpine (musl) — lightningcss and other
# native addons used during the build don't ship linux-arm-musl binaries.
FROM node:22-slim AS builder

WORKDIR /app

# Copy every workspace manifest before installing so this layer is reproducible
# and local packages such as @dockyard/types resolve without using npmjs.org.
COPY package*.json ./
COPY agent/package*.json ./agent/
COPY packages/types/package.json ./packages/types/
RUN npm ci

COPY . .

# Turbopack native binaries are unavailable on ARM — use Webpack instead.
# next.config.ts has output: 'standalone' — produces a minimal self-contained build.
ARG TARGETARCH
RUN if [ "$TARGETARCH" = "arm" ] || [ "$TARGETARCH" = "arm64" ]; then \
      npx next build --webpack; \
    else \
      npm run build; \
    fi

# --- runner ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# standalone already contains its own node_modules copy
COPY --from=builder /app/.next/standalone ./
# static assets are not included in standalone — copy manually
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Drop root
RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["node", "server.js"]
