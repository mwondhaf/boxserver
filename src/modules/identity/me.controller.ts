import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';

@ApiTags('Identity')
@ApiCookieAuth('session')
@Controller('me')
export class MeController {
  @Get()
  @ApiOperation({ summary: 'Get current user', description: 'Returns the authenticated user\'s identity, platform role, and active organisation.' })
  @ApiResponse({ status: 200, description: 'Actor context object' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  getMe(@Actor() actor: ActorContext): ActorContext {
    return actor;
  }
}
