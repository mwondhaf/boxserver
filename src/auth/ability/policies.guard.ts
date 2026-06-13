import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createAbility, type Action, type Subject } from './ability.factory';
import type { ActorContext } from '../session.guard';

export interface PolicyRule {
  action: Action;
  subject: Subject;
}

export const CHECK_POLICIES_KEY = 'checkPolicies';

export const CheckPolicies = (...rules: PolicyRule[]) =>
  SetMetadata(CHECK_POLICIES_KEY, rules);

import { SetMetadata } from '@nestjs/common';
export const RequireRole = (...roles: ActorContext['platformRole'][]) =>
  SetMetadata('requireRoles', roles);

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<ActorContext['platformRole'][]>(
      'requireRoles',
      ctx.getHandler(),
    );
    const policies = this.reflector.get<PolicyRule[]>(
      CHECK_POLICIES_KEY,
      ctx.getHandler(),
    );

    const request = ctx.switchToHttp().getRequest<{ actor: ActorContext }>();
    const actor = request.actor;
    if (!actor) throw new ForbiddenException('No actor context');

    if (requiredRoles?.length) {
      if (!requiredRoles.includes(actor.platformRole)) {
        throw new ForbiddenException('Insufficient platform role');
      }
    }

    if (policies?.length) {
      const ability = createAbility(actor);
      for (const policy of policies) {
        if (ability.cannot(policy.action, policy.subject)) {
          throw new ForbiddenException(
            `Action '${policy.action}' on '${policy.subject}' is not allowed`,
          );
        }
      }
    }

    return true;
  }
}
