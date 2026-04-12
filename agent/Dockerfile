FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3001

# Drop root — node:alpine ships with a built-in `node` user (uid 1000).
# Note: the Docker socket (/var/run/docker.sock) is mounted at runtime and
# owned by root:docker on the host. If the agent can't reach it, add the
# host's docker gid to this container via `group_add` in compose.yml.
RUN chown -R node:node /app
USER node

EXPOSE 3001

CMD ["node", "dist/index.js"]
