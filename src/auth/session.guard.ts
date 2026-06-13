import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { getAuth } from './better-auth';
import type { AppConfig } from '../common/config/app.config';

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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  Reflect.metadata(IS_PUBLIC_KEY, true) as MethodDecorator &
    ClassDecorator;

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<{ app: AppConfig }, true>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<
      Request & { actor?: ActorContext }
    >();
    const res = ctx.switchToHttp().getResponse<Response>();

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

    req.actor = {
      userId: user.id,
      email: user.email,
      name: user.name,
      platformRole: (user.platformRole as ActorContext['platformRole']) ?? 'customer',
      activeOrgId: (session.session as { activeOrganizationId?: string }).activeOrganizationId ?? null,
      orgRole: null, // resolved per-request by PoliciesGuard when org context needed
    };

    return true;
  }
}
