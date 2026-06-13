const REQUIRED: Record<string, string> = {
  DATABASE_URL: 'PostgreSQL connection string',
  BETTER_AUTH_SECRET: 'Secret key for Better Auth (min 32 chars)',
};

const OPTIONAL: Record<string, string> = {
  REDIS_URL: 'Redis connection string — session store + cache disabled without this',
  BETTER_AUTH_URL: 'Public base URL of this server (default: http://localhost:3000)',
  PORT: 'Port to listen on (default: 3000)',
  ALLOWED_ORIGINS: 'Comma-separated CORS origins (default: all)',
  BOXWALLET_BASE_URL: 'BoxWallet API base URL',
  BOXWALLET_API_KEY: 'BoxWallet API key — financial splits disabled without this',
  RELWORX_API_KEY: 'Relworx API key — mobile money disabled without this',
  RELWORX_WEBHOOK_SECRET: 'HMAC secret for Relworx webhook verification',
  STORAGE_ENDPOINT: 'S3/R2 endpoint — file uploads disabled without this',
  STORAGE_BUCKET: 'Storage bucket name (default: boxserver)',
  STORAGE_ACCESS_KEY_ID: 'Storage access key ID',
  STORAGE_SECRET_ACCESS_KEY: 'Storage secret access key',
  DISTANCE_PROVIDER_KEY: 'Google/Mapbox key — falls back to haversine without this',
  DEFAULT_CURRENCY: 'ISO currency code (default: UGX)',
  DEFAULT_TIMEZONE: 'IANA timezone (default: Africa/Kampala)',
};

interface EnvCheckResult {
  ok: boolean;
  missing: string[];
  warnings: string[];
}

export function checkEnv(): EnvCheckResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const [key, description] of Object.entries(REQUIRED)) {
    if (!process.env[key]) {
      missing.push(`  ✗ ${key}  —  ${description}`);
    }
  }

  if (process.env['BETTER_AUTH_SECRET'] && process.env['BETTER_AUTH_SECRET'].length < 32) {
    missing.push(`  ✗ BETTER_AUTH_SECRET  —  must be at least 32 characters (got ${process.env['BETTER_AUTH_SECRET'].length})`);
  }

  for (const [key, description] of Object.entries(OPTIONAL)) {
    if (!process.env[key]) {
      warnings.push(`  △ ${key}  —  ${description}`);
    }
  }

  return { ok: missing.length === 0, missing, warnings };
}

export function assertEnv(): void {
  const { ok, missing, warnings } = checkEnv();

  if (warnings.length > 0) {
    console.warn('\nOptional env vars not set (degraded functionality):');
    for (const w of warnings) console.warn(w);
  }

  if (!ok) {
    console.error('\nMissing required environment variables — cannot start:\n');
    for (const m of missing) console.error(m);
    console.error('\nCreate a .env file or set these variables in your environment.\n');
    process.exit(1);
  }
}
