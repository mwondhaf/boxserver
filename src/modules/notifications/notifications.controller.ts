import {
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiCookieAuth('session')
@Controller('me/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications', description: 'Returns notifications for the current user. Pass unread=true to fetch only unread items.' })
  @ApiQuery({ name: 'unread', required: false, example: 'true', description: 'If true, returns only unread notifications' })
  @ApiResponse({ status: 200, description: 'Array of notifications' })
  list(
    @Actor() actor: ActorContext,
    @Query('unread') unread?: string,
  ) {
    return this.notifications.list(actor.userId, unread === 'true');
  }

  @Get('count')
  @ApiOperation({ summary: 'Get unread notification count', description: 'Returns the number of unread notifications. Use this to power a badge in the UI.' })
  @ApiResponse({ status: 200, description: '{ count: number }' })
  async count(@Actor() actor: ActorContext) {
    const count = await this.notifications.unreadCount(actor.userId);
    return { count };
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', example: 'notif_01abc' })
  @ApiResponse({ status: 200, description: '{ ok: true }' })
  async markRead(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
  ) {
    await this.notifications.markRead(id, actor.userId);
    return { ok: true };
  }

  @Delete('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: '{ ok: true }' })
  async markAllRead(@Actor() actor: ActorContext) {
    await this.notifications.markAllRead(actor.userId);
    return { ok: true };
  }
}
