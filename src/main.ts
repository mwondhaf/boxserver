import 'reflect-metadata';
import { assertEnv } from './common/config/env';
assertEnv();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

function securityHeaders(req: Request, res: Response, next: NextFunction): void {
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

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

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

  const port = Number(process.env['PORT'] ?? 3000);
  await app.listen(port);
  console.log(`BoxServer running on :${port}`);
}

bootstrap().catch(console.error);
