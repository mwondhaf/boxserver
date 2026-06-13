import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { AppConfig } from '../config/app.config';

export const REDIS_TOKEN = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_TOKEN,
      inject: [ConfigService],
      useFactory: (config: ConfigService<{ app: AppConfig }, true>) => {
        const url = config.get('app.redisUrl', { infer: true });
        const log = new Logger('RedisModule');

        if (!url) {
          log.warn('REDIS_URL not set — Redis disabled; using in-process fallbacks');
          return null;
        }

        const client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 });

        client.on('connect', () => log.log('Redis connected'));
        client.on('error', (err: Error) => log.error('Redis error', err.message));

        return client;
      },
    },
  ],
  exports: [REDIS_TOKEN],
})
export class RedisModule {}
