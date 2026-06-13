import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ActorContext } from './session.guard';

export const Actor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ActorContext => {
    const request = ctx.switchToHttp().getRequest<{ actor: ActorContext }>();
    return request.actor;
  },
);
