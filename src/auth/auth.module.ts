import { All, Controller, Inject, Module, OnModuleInit, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import type Redis from 'ioredis';
import { getAuth, initAuth } from './better-auth';
import { SessionGuard, Public } from './session.guard';
import { PoliciesGuard } from './ability/policies.guard';
import type { AppConfig } from '../common/config/app.config';
import { REDIS_TOKEN } from '../common/redis/redis.module';

@Public()
@Controller('api/auth')
export class AuthController implements OnModuleInit {
  constructor(
    private readonly config: ConfigService<{ app: AppConfig }, true>,
    @Inject(REDIS_TOKEN) private readonly redis: Redis | null,
  ) {}

  onModuleInit(): void {
    const databaseUrl = this.config.get('app.databaseUrl', { infer: true });
    initAuth(databaseUrl, this.redis);
  }

  @All('*')
  async handleAuth(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): Promise<void> {
    const databaseUrl = this.config.get('app.databaseUrl', { infer: true });
    const auth = getAuth(databaseUrl);

    const url = new URL(
      req.url,
      `http://${req.headers.host ?? 'localhost'}`,
    );

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
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const text = await response.text();
    res.send(text);
  }
}

@Module({
  controllers: [AuthController],
  providers: [SessionGuard, PoliciesGuard],
  exports: [SessionGuard, PoliciesGuard],
})
export class AuthModule {}
