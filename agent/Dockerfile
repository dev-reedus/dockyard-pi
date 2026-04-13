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

RUN apk add --no-cache su-exec

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3001

# Starts as root to detect and join the docker socket group dynamically,
# then drops to node via su-exec. See entrypoint.sh.
CMD ["./entrypoint.sh"]
