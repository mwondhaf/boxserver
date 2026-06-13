import { Global, Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { EventBus } from './event-bus';

@Global()
@Module({
  providers: [EventBus, RealtimeGateway],
  exports: [EventBus, RealtimeGateway],
})
export class RealtimeModule {}
