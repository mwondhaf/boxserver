import {
  All,
  Controller,
  Inject,
  Logger,
  Module,
  OnModuleInit,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import type Redis from 'ioredis';
import { getAuth, initAuth } from './better-auth';
import { SessionGuard, Public } from './session.guard';
import type { AppConfig } from '../common/config/app.config';
import { REDIS_TOKEN } from '../common/redis/redis.module';
import { DB_TOKEN } from '../db/drizzle.module';
import type { Db } from '../db/client';
import { users } from '../db/schema/index';

const BOOTSTRAP_ADMIN = {
  email: 'admin@mail.com',
  password: 'password123',
  name: 'Platform Admin',
};

@Public()
@Controller('api/auth')
export class AuthController implements OnModuleInit {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly config: ConfigService<{ app: AppConfig }, true>,
    @Inject(REDIS_TOKEN) private readonly redis: Redis | null,
    @Inject(DB_TOKEN) private readonly db: Db,
  ) {}

  async onModuleInit(): Promise<void> {
    const app = this.config.get('app', { infer: true });
    const trustedOrigins =
      process.env['ALLOWED_ORIGINS']?.split(',').map((o) => o.trim()) ?? [];
    initAuth({
      databaseUrl: app.databaseUrl,
      redis: this.redis,
      trustedOrigins,
      frontendUrl: app.betterAuth.frontendUrl,
      google: app.google,
      resend: app.resend,
      sms: app.sms,
    });
    await this.bootstrapAdmin(app.databaseUrl);
  }

  private async bootstrapAdmin(databaseUrl: string): Promise<void> {
    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, BOOTSTRAP_ADMIN.email))
      .limit(1);

    if (existing.length > 0) return;

    const auth = getAuth(databaseUrl);
    const result = await auth.api.signUpEmail({ body: BOOTSTRAP_ADMIN });
    await this.db
      .update(users)
      .set({ platformRole: 'admin' })
      .where(eq(users.id, result.user.id));

    this.logger.log(`Bootstrap admin created: ${BOOTSTRAP_ADMIN.email}`);
  }

  @All('*')
  async handleAuth(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): Promise<void> {
    const databaseUrl = this.config.get('app.databaseUrl', { infer: true });
    const auth = getAuth(databaseUrl);

    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

    const headers = new Headers(req.headers as Record<string, string>);

    const body =
      req.method !== 'GET' && req.method !== 'HEAD'
        ? JSON.stringify(req.body as unknown)
        : undefined;

    const response = await auth.handler(
      new Request(url.toString(), {
        method: req.method,
        headers,
        body,
      }),
    );

    res.status(response.status);
    // Set-Cookie must be handled separately: Headers.forEach/get collapse
    // multiple Set-Cookie headers into a single comma-joined value, which drops
    // Better Auth's session_token cookie (it sends session_token + session_data).
    const setCookies = response.headers.getSetCookie();
    if (setCookies.length > 0) {
      res.setHeader('set-cookie', setCookies);
    }
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        return;
      }
      res.setHeader(key, value);
    });
    const text = await response.text();
    res.send(text);
  }
}

@Module({
  controllers: [AuthController],
  providers: [SessionGuard],
  exports: [SessionGuard],
})
export class AuthModule {}
