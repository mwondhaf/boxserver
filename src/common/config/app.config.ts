import { registerAs } from '@nestjs/config';

export interface AppConfig {
  databaseUrl: string;
  redisUrl: string | undefined;
  betterAuth: {
    secret: string;
    url: string;
    frontendUrl: string;
  };
  google: {
    clientId: string;
    clientSecret: string;
  };
  resend: {
    apiKey: string;
    from: string;
  };
  sms: {
    atApiKey: string;
    atUsername: string;
    senderId: string;
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
    publicBaseUrl: string;
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
      frontendUrl: process.env['FRONTEND_URL'] ?? 'http://localhost:3002',
    },
    google: {
      clientId: process.env['GOOGLE_CLIENT_ID'] ?? '',
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
    },
    resend: {
      apiKey: process.env['RESEND_API_KEY'] ?? '',
      from: process.env['RESEND_FROM'] ?? 'noreply@boxkubox.com',
    },
    sms: {
      atApiKey: process.env['AT_API_KEY'] ?? '',
      atUsername: process.env['AT_USERNAME'] ?? 'sandbox',
      senderId: process.env['AT_SENDER_ID'] ?? 'BoxConv',
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
      endpoint: required('STORAGE_ENDPOINT'),
      bucket: process.env['STORAGE_BUCKET'] ?? 'boxserver',
      accessKeyId: required('STORAGE_ACCESS_KEY_ID'),
      secretAccessKey: required('STORAGE_SECRET_ACCESS_KEY'),
      publicBaseUrl: required('STORAGE_PUBLIC_URL'),
    },
    distanceProviderKey: process.env['DISTANCE_PROVIDER_KEY'] ?? '',
    currency: process.env['DEFAULT_CURRENCY'] ?? 'UGX',
    timezone: process.env['DEFAULT_TIMEZONE'] ?? 'Africa/Kampala',
    port: Number(process.env['PORT'] ?? 3000),
  };
});
