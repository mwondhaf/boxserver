import {
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import { NotificationsService } from './notifications.service';

@Controller('me/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @Actor() actor: ActorContext,
    @Query('unread') unread?: string,
  ) {
    return this.notifications.list(actor.userId, unread === 'true');
  }

  @Get('count')
  async count(@Actor() actor: ActorContext) {
    const count = await this.notifications.unreadCount(actor.userId);
    return { count };
  }

  @Put(':id/read')
  async markRead(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
  ) {
    await this.notifications.markRead(id, actor.userId);
    return { ok: true };
  }

  @Delete('read-all')
  async markAllRead(@Actor() actor: ActorContext) {
    await this.notifications.markAllRead(actor.userId);
    return { ok: true };
  }
}
