# node:22-slim (Debian/glibc) instead of alpine (musl) — lightningcss and other
# native addons used during the build don't ship linux-arm-musl binaries.
FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Force-install the correct SWC native binary for the target platform.
# npm sometimes skips optional platform packages inside Docker — this ensures
# the right one is present so Next.js doesn't fall back to broken WASM mode.
ARG TARGETARCH
RUN if [ "$TARGETARCH" = "arm64" ]; then \
      npm install @next/swc-linux-arm64-gnu --no-save; \
    elif [ "$TARGETARCH" = "arm" ]; then \
      npm install @next/swc-linux-arm-gnueabihf --no-save; \
    fi

COPY . .

# Turbopack requires native binaries unavailable on ARM — use Webpack instead.
# next.config.ts has output: 'standalone' — produces a minimal self-contained build.
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
