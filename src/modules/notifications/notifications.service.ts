import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { notifications } from '../../db/schema/notifications';
import { EventBus } from '../../realtime/event-bus';
import { RealtimeGateway } from '../../realtime/realtime.gateway';

interface NotificationEvent {
  channel: string;
  type: string;
  payload: unknown;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly log = new Logger(NotificationsService.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly eventBus: EventBus,
    private readonly gateway: RealtimeGateway,
  ) {}

  onModuleInit(): void {
    this.eventBus.on<NotificationEvent>('notification', async (event) => {
      const { channel, type, payload } = event.payload;

      this.gateway.pushToChannel(channel, type, payload);

      if (channel.startsWith('user:')) {
        const userId = channel.slice(5);
        try {
          await this.db.insert(notifications).values({ userId, type, payload });
        } catch (err) {
          this.log.error('Failed to persist notification', err);
        }
      }
    });
  }

  async list(userId: string, onlyUnread = false) {
    return this.db
      .select()
      .from(notifications)
      .where(
        onlyUnread
          ? and(eq(notifications.userId, userId), isNull(notifications.readAt))
          : eq(notifications.userId, userId),
      )
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      );
  }

  async unreadCount(userId: string): Promise<number> {
    const rows = await this.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      );
    return rows.length;
  }
}
