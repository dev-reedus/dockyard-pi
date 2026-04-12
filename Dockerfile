FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# next.config.ts has output: 'standalone' — produces a minimal self-contained build
RUN npm run build

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
