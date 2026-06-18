FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Bring the full dependency set (includes drizzle-kit) so the entrypoint can run
# migrations before the server starts.
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./

# Drizzle assets needed by `db:migrate` (and `db:generate` when explicitly
# enabled via DB_AUTO_GENERATE).
COPY drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src/db/schema ./src/db/schema

COPY docker-entrypoint.sh ./
COPY --from=builder /app/dist ./dist

EXPOSE 3000
# The entrypoint applies pending migrations, then execs the CMD (the server).
# DB_AUTO_GENERATE is intentionally unset here: production only applies
# migrations that were generated and reviewed ahead of time.
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["node", "dist/main"]
