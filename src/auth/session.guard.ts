import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import type { Request } from 'express';
import { getAuth } from './better-auth';
import type { AppConfig } from '../common/config/app.config';
import { DB_TOKEN } from '../db/drizzle.module';
import type { Db } from '../db/client';
import { members } from '../db/schema/identity';

export interface ActorContext {
  userId: string;
  email: string;
  name: string;
  platformRole: 'customer' | 'rider' | 'admin';
  activeOrgId: string | null;
  orgRole: 'owner' | 'admin' | 'member' | null;
}

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () =>
  Reflect.metadata(IS_PUBLIC_KEY, true) as MethodDecorator & ClassDecorator;

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<{ app: AppConfig }, true>,
    @Inject(DB_TOKEN) private readonly db: Db,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx
      .switchToHttp()
      .getRequest<Request & { actor?: ActorContext }>();

    const databaseUrl = this.config.get('app.databaseUrl', { infer: true });
    const auth = getAuth(databaseUrl);

    const session = await auth.api.getSession({
      headers: new Headers(req.headers as Record<string, string>),
    });

    if (!session) throw new UnauthorizedException('Session required');

    const user = session.user as {
      id: string;
      email: string;
      name: string;
      platformRole?: string;
    };

    const activeOrgId =
      (session.session as { activeOrganizationId?: string })
        .activeOrganizationId ?? null;

    let orgRole: ActorContext['orgRole'] = null;
    if (activeOrgId) {
      const membership = await this.db.query.members.findFirst({
        where: and(
          eq(members.userId, user.id),
          eq(members.organizationId, activeOrgId),
        ),
        columns: { role: true },
      });
      orgRole = (membership?.role as ActorContext['orgRole']) ?? null;
    }

    req.actor = {
      userId: user.id,
      email: user.email,
      name: user.name,
      platformRole:
        (user.platformRole as ActorContext['platformRole']) ?? 'customer',
      activeOrgId,
      orgRole,
    };

    return true;
  }
}
