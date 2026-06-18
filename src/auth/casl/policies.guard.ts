import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  defineAbilityFor,
  type Action,
  type Subject,
} from './casl-ability.factory';
import { IS_PUBLIC_KEY, type ActorContext } from '../session.guard';

export interface PolicyRule {
  action: Action;
  subject: Subject;
}

export const CHECK_POLICIES_KEY = 'checkPolicies';
export const CheckPolicies = (...rules: PolicyRule[]) =>
  SetMetadata(CHECK_POLICIES_KEY, rules);

export const REQUIRE_ROLES_KEY = 'requireRoles';
export const RequireRole = (...roles: ActorContext['platformRole'][]) =>
  SetMetadata(REQUIRE_ROLES_KEY, roles);

/**
 * Global guard (runs after SessionGuard) that enforces `@RequireRole` and
 * `@CheckPolicies` metadata. Routes without either declaration are allowed
 * through — authentication is handled by SessionGuard.
 */
@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const targets = [ctx.getHandler(), ctx.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<
      ActorContext['platformRole'][]
    >(REQUIRE_ROLES_KEY, targets);
    const policies = this.reflector.getAllAndOverride<PolicyRule[]>(
      CHECK_POLICIES_KEY,
      targets,
    );

    if (!requiredRoles?.length && !policies?.length) return true;

    const request = ctx.switchToHttp().getRequest<{ actor?: ActorContext }>();
    const actor = request.actor;
    if (!actor) throw new ForbiddenException('No actor context');

    if (requiredRoles?.length && !requiredRoles.includes(actor.platformRole)) {
      throw new ForbiddenException('Insufficient platform role');
    }

    if (policies?.length) {
      const ability = defineAbilityFor(actor);
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
