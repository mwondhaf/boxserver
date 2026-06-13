import { createAuthClient } from 'better-auth/client';
import { organizationClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000',
  plugins: [organizationClient()],
});

export type Session = typeof authClient.$Infer.Session;
