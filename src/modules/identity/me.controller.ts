import { Controller, Get } from '@nestjs/common';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';

@Controller('me')
export class MeController {
  @Get()
  getMe(@Actor() actor: ActorContext): ActorContext {
    return actor;
  }
}
