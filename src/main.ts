import 'reflect-metadata';
import 'dotenv/config';
import { assertEnv } from './common/config/env';
assertEnv();

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  // Prevent caching of API responses
  if (req.path.startsWith('/api/v1/') || req.path.startsWith('/api/auth/')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
}

async function runMigrations(): Promise<void> {
  const migrationsFolder = path.join(process.cwd(), 'drizzle');
  const pool = new Pool({ connectionString: process.env['DATABASE_URL']! });

  // If the DB was bootstrapped via `db:push` (or a prior partial run) the
  // baseline schema already exists but the Drizzle migration-tracking table is
  // missing or empty. Detect this and seed the baseline migration row so
  // migrate() only runs genuinely new SQL files instead of replaying 0000.
  const { rows } = await pool.query<{ db_exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    ) AS db_exists
  `);

  const baselineWhen = 1781434361531;

  if (rows[0]?.db_exists) {
    const sql0 = fs.readFileSync(
      path.join(migrationsFolder, '0000_damp_the_fallen.sql'),
      'utf8',
    );
    const hash0 = crypto.createHash('sha256').update(sql0).digest('hex');

    await pool.query(`
      CREATE SCHEMA IF NOT EXISTS drizzle;
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      );
    `);

    // Idempotent: only record the baseline if no migration at or after the
    // baseline timestamp is already tracked (covers an empty tracking table).
    await pool.query(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
       SELECT $1, $2
       WHERE NOT EXISTS (
         SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at >= $2
       )`,
      [hash0, baselineWhen],
    );
  }

  const db = drizzle(pool);
  await migrate(db, { migrationsFolder });
  await pool.end();
}

async function bootstrap(): Promise<void> {
  await runMigrations();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  app.set('trust proxy', 1);

  app.use(securityHeaders);

  app.enableCors({
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
  });

  app.setGlobalPrefix('api/v1', { exclude: ['api/auth/(.*)'] });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('BoxServer API')
    .setDescription(
      `BoxConv marketplace platform — multi-vendor food & grocery delivery.\n\n` +
        `**Authentication:** All protected endpoints require a session cookie set by Better Auth. ` +
        `Sign in via \`POST /api/auth/sign-in/email\` with \`{ email, password }\` — the session cookie is set automatically.\n\n` +
        `**Roles:** \`customer\` · \`vendor\` (requires active organisation) · \`rider\` · \`admin\`\n\n` +
        `**Money:** All amounts are integer UGX (no decimals). 1000 = UGX 1,000.`,
    )
    .setVersion('1.0')
    .addCookieAuth('session')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  app.use(
    '/reference',
    apiReference({
      content: document,
      theme: 'default',
    }),
  );

  const logger = app.get(Logger);
  const port = Number(process.env['PORT'] ?? 3000);
  await app.listen(port);
  logger.log(`BoxServer running on :${port}`);
}

bootstrap().catch((err) => {
  process.stderr.write(`Fatal bootstrap error: ${String(err)}\n`);
  process.exit(1);
});
