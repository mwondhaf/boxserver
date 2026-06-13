import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDb, type Db } from './client';
import type { AppConfig } from '../common/config/app.config';

export const DB_TOKEN = Symbol('DRIZZLE_DB');

@Global()
@Module({
  providers: [
    {
      provide: DB_TOKEN,
      inject: [ConfigService],
      useFactory: (config: ConfigService<{ app: AppConfig }, true>): Db => {
        const databaseUrl = config.get('app.databaseUrl', { infer: true });
        return createDb(databaseUrl);
      },
    },
  ],
  exports: [DB_TOKEN],
})
export class DrizzleModule {}
