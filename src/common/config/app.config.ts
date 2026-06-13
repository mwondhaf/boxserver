import { registerAs } from '@nestjs/config';

export interface AppConfig {
  databaseUrl: string;
  redisUrl: string | undefined;
  betterAuth: {
    secret: string;
    url: string;
  };
  boxWallet: {
    baseUrl: string;
    apiKey: string;
  };
  relworx: {
    apiKey: string;
    webhookSecret: string;
  };
  storage: {
    endpoint: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  distanceProviderKey: string;
  currency: string;
  timezone: string;
  port: number;
}

export const appConfig = registerAs('app', (): AppConfig => {
  const required = (key: string): string => {
    const val = process.env[key];
    if (!val) throw new Error(`Missing required env var: ${key}`);
    return val;
  };

  return {
    databaseUrl: required('DATABASE_URL'),
    redisUrl: process.env['REDIS_URL'],
    betterAuth: {
      secret: required('BETTER_AUTH_SECRET'),
      url: process.env['BETTER_AUTH_URL'] ?? 'http://localhost:3000',
    },
    boxWallet: {
      baseUrl:
        process.env['BOXWALLET_BASE_URL'] ?? 'https://px.boxkubox.com/api/v1',
      apiKey: process.env['BOXWALLET_API_KEY'] ?? '',
    },
    relworx: {
      apiKey: process.env['RELWORX_API_KEY'] ?? '',
      webhookSecret: process.env['RELWORX_WEBHOOK_SECRET'] ?? '',
    },
    storage: {
      endpoint: process.env['STORAGE_ENDPOINT'] ?? '',
      bucket: process.env['STORAGE_BUCKET'] ?? 'boxserver',
      accessKeyId: process.env['STORAGE_ACCESS_KEY_ID'] ?? '',
      secretAccessKey: process.env['STORAGE_SECRET_ACCESS_KEY'] ?? '',
    },
    distanceProviderKey: process.env['DISTANCE_PROVIDER_KEY'] ?? '',
    currency: process.env['DEFAULT_CURRENCY'] ?? 'UGX',
    timezone: process.env['DEFAULT_TIMEZONE'] ?? 'Africa/Kampala',
    port: Number(process.env['PORT'] ?? 3000),
  };
});
