import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { RiderService } from './rider.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import { AdminApproveDto, AssignStageDto } from './dto/rider.dto';
import { RequireRole } from '../../auth/ability/policies.guard';

@RequireRole('admin')
@Controller('a/riders')
export class AdminRidersController {
  constructor(private readonly service: RiderService) {}

  @Get()
  list() {
    return this.service.listForAdmin();
  }

  @Put(':id/approve')
  approve(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Body() dto: AdminApproveDto,
  ) {
    return this.service.adminApprove(id, actor, dto);
  }

  @Post(':id/stages')
  assignStage(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Body() dto: AssignStageDto,
  ) {
    return this.service.assignStage(id, actor, dto);
  }
}
