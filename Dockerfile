# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps

RUN npm install

# Build shared packages first
RUN npx tsc -p packages/logger/tsconfig.json
RUN npx tsc -p packages/types/tsconfig.json
RUN npx tsc -p packages/auth/tsconfig.json
RUN npx tsc -p packages/cache/tsconfig.json
RUN npx tsc -p packages/queue/tsconfig.json
RUN npx tsc -p packages/db/tsconfig.json

# Build apps
RUN npx tsc -p apps/api/tsconfig.json
RUN npx tsc -p apps/worker/tsconfig.json
RUN npm --workspace apps/web run build

# ── API runtime ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS api
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache postgresql-client

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/infra/migrations ./infra/migrations
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "apps/api/dist/server.js"]

# ── Worker runtime ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS worker
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist

CMD ["node", "apps/worker/dist/worker.js"]

# ── Web (nginx) ────────────────────────────────────────────────────────────────
FROM nginx:alpine AS web
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
