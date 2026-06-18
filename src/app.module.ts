import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { LoggerModule } from 'nestjs-pino';
import type Redis from 'ioredis';
import { ConfigModule } from './common/config/config.module';
import { RedisModule, REDIS_TOKEN } from './common/redis/redis.module';
import { DrizzleModule } from './db/drizzle.module';
import { AuthModule } from './auth/auth.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { IdentityModule } from './modules/identity/identity.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CartModule } from './modules/cart/cart.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { OrdersModule } from './modules/orders/orders.module';
import { RidersModule } from './modules/riders/riders.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { ZonesModule } from './modules/zones/zones.module';
import { FinancialModule } from './modules/financial/financial.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ParcelsModule } from './modules/parcels/parcels.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SessionGuard } from './auth/session.guard';
import { PoliciesGuard } from './auth/casl/policies.guard';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { globalValidationPipe } from './common/validation/validation.pipe';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env['NODE_ENV'] !== 'production' ? 'debug' : 'info',
        transport:
          process.env['NODE_ENV'] !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        serializers: {
          req(req: { method: string; url: string }) {
            return { method: req.method, url: req.url };
          },
        },
      },
    }),
    RedisModule,
    ThrottlerModule.forRootAsync({
      inject: [REDIS_TOKEN],
      useFactory: (redis: Redis | null) => ({
        throttlers: [
          { name: 'short', ttl: 60_000, limit: 60 },
          { name: 'medium', ttl: 60_000, limit: 20 },
        ],
        ...(redis && { storage: new ThrottlerStorageRedisService(redis) }),
      }),
    }),
    ConfigModule,
    DrizzleModule,
    AuthModule,
    RealtimeModule,
    SchedulingModule,
    IdentityModule,
    CatalogModule,
    CartModule,
    CheckoutModule,
    OrdersModule,
    RidersModule,
    DispatchModule,
    ZonesModule,
    FinancialModule,
    PaymentsModule,
    ParcelsModule,
    PromotionsModule,
    ReferralsModule,
    SubscriptionsModule,
    AdminModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: PoliciesGuard },
    { provide: APP_PIPE, useValue: globalValidationPipe },
  ],
})
export class AppModule {}
