import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, organization, phoneNumber } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import type Redis from 'ioredis';
import { createDb } from '../db/client';
import * as schema from '../db/schema/index';

function buildResend(apiKey: string, from: string) {
  if (!apiKey) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resend } = require('resend') as {
    Resend: new (key: string) => {
      emails: {
        send: (p: {
          from: string;
          to: string;
          subject: string;
          html: string;
        }) => Promise<unknown>;
      };
    };
  };
  return { client: new Resend(apiKey), from };
}

function buildAtSms(atApiKey: string, atUsername: string, senderId: string) {
  if (!atApiKey) return null;
  // Lazy import to avoid startup errors when key is absent
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AfricasTalking = require('africastalking') as (opts: {
    apiKey: string;
    username: string;
  }) => { SMS: { send: (p: Record<string, unknown>) => Promise<unknown> } };
  const at = AfricasTalking({ apiKey: atApiKey, username: atUsername });
  return { sms: at.SMS, senderId };
}

interface AuthDeps {
  databaseUrl: string;
  redis: Redis | null;
  trustedOrigins: string[];
  frontendUrl: string;
  google: { clientId: string; clientSecret: string };
  resend: { apiKey: string; from: string };
  sms: { atApiKey: string; atUsername: string; senderId: string };
}

function createAuthInstance(deps: AuthDeps) {
  const {
    databaseUrl,
    redis,
    trustedOrigins,
    frontendUrl,
    google,
    resend: resendConfig,
    sms: smsConfig,
  } = deps;
  const db = createDb(databaseUrl);
  const mailer = buildResend(resendConfig.apiKey, resendConfig.from);
  const smsSvc = buildAtSms(
    smsConfig.atApiKey,
    smsConfig.atUsername,
    smsConfig.senderId,
  );

  return betterAuth({
    appName: 'BoxConv',
    trustedOrigins,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
        organization: schema.organizations,
        member: schema.members,
        invitation: schema.invitations,
      },
    }),
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            // Default the active organization to the user's first membership so
            // session.activeOrganizationId isn't null for vendor/team users.
            const membership = await db.query.members.findFirst({
              where: eq(schema.members.userId, session.userId),
            });
            return {
              data: {
                ...session,
                activeOrganizationId: membership?.organizationId ?? null,
              },
            };
          },
        },
      },
    },
    ...(redis && {
      secondaryStorage: {
        get: (key: string) => redis.get(key),
        set: (key: string, value: string, ttl?: number) => {
          if (ttl)
            return redis.set(key, value, 'EX', ttl).then(() => undefined);
          return redis.set(key, value).then(() => undefined);
        },
        delete: (key: string) => redis.del(key).then(() => undefined),
      },
    }),
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, token }) => {
        console.log({ token });
        if (!mailer) return;
        const url = `${frontendUrl}/auth/reset-password?token=${token}`;
        console.log({ url });

        await mailer.client.emails.send({
          from: mailer.from,
          to: user.email,
          subject: 'Reset your BoxConv password',
          html: `<p>Hi ${user.name},</p><p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${url}">${url}</a></p><p>If you didn't request this, ignore this email.</p>`,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, token }) => {
        if (!mailer) return;
        const url = `${frontendUrl}/auth/verify-email?token=${token}`;
        await mailer.client.emails.send({
          from: mailer.from,
          to: user.email,
          subject: 'Verify your BoxConv email',
          html: `<p>Hi ${user.name},</p><p>Click the link below to verify your email address.</p><p><a href="${url}">${url}</a></p>`,
        });
      },
    },
    socialProviders: {
      ...(google.clientId && {
        google: {
          clientId: google.clientId,
          clientSecret: google.clientSecret,
        },
      }),
    },
    plugins: [
      organization(),
      admin({
        defaultRole: 'customer',
        adminRoles: ['admin'],
        schema: {
          user: {
            fields: {
              role: 'platformRole',
            },
          },
        },
      }),
      phoneNumber({
        sendOTP: async ({ phoneNumber: phone, code }) => {
          if (!smsSvc) {
            console.warn('[auth] SMS provider not configured — code:', code);
            return;
          }
          await smsSvc.sms.send({
            to: [phone],
            message: `Your BoxConv verification code is: ${code}. Valid for 10 minutes.`,
            from: smsSvc.senderId,
          });
        },
        otpLength: 6,
        expiresIn: 600,
      }),
    ],
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      storeSessionInDatabase: true,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
    user: {
      additionalFields: {
        phone: { type: 'string', required: false },
        platformRole: {
          type: 'string',
          required: false,
          defaultValue: 'customer',
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuthInstance>;

let _auth: Auth | undefined;

export function initAuth(deps: AuthDeps): void {
  if (!_auth) _auth = createAuthInstance(deps);
}

export function getAuth(databaseUrl: string): Auth {
  if (!_auth) {
    _auth = createAuthInstance({
      databaseUrl,
      redis: null,
      trustedOrigins: [],
      frontendUrl: process.env['FRONTEND_URL'] ?? 'http://localhost:3002',
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
    });
  }
  return _auth;
}
