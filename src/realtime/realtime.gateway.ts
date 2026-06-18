import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { getAuth } from '../auth/better-auth';
import { EventBus } from './event-bus';
import type { AppConfig } from '../common/config/app.config';

// Mirror the HTTP CORS policy (main.ts): when credentials are sent the browser
// rejects a wildcard `*` origin, so reflect the configured allowed origins (or
// any origin in dev when unset) and echo them back per-request.
const allowedOrigins = process.env['ALLOWED_ORIGINS']?.split(',') ?? true;

@WebSocketGateway({
  cors: { origin: allowedOrigins, credentials: true },
  namespace: '/',
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly eventBus: EventBus,
    private readonly config: ConfigService<{ app: AppConfig }, true>,
  ) {}

  afterInit(): void {
    this.eventBus.onAll((event) => {
      // Fan-out all domain events to subscribed channels
      this.server.emit(event.type, event.payload);
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    const cookie = client.handshake.headers.cookie ?? '';
    const databaseUrl = this.config.get('app.databaseUrl', { infer: true });

    try {
      const auth = getAuth(databaseUrl);
      const session = await auth.api.getSession({
        headers: new Headers({ cookie }),
      });
      if (!session) {
        client.disconnect(true);
        return;
      }
      (client.data as { userId: string }).userId = session.user.id;
      // Join personal channel
      await client.join(`user:${session.user.id}`);
      this.logger.log(`Client connected: ${session.user.id}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { channel: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const userId = (client.data as { userId?: string }).userId;
    if (!userId) throw new WsException('Unauthorized');
    void client.join(data.channel);
  }

  pushToChannel(channel: string, event: string, payload: unknown): void {
    this.server.to(channel).emit(event, payload);
  }
}
