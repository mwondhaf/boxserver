import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RiderService } from './rider.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import { AdminApproveDto, AssignStageDto } from './dto/rider.dto';
import { RequireRole } from '../../auth/casl/policies.guard';

@ApiTags('Admin — Riders')
@ApiCookieAuth('session')
@RequireRole('admin')
@Controller('a/riders')
export class AdminRidersController {
  constructor(private readonly service: RiderService) {}

  @Get()
  @ApiOperation({
    summary: 'List all riders',
    description:
      'Admin-only. Returns all rider applications with their approval status, ratings, and assigned stages.',
  })
  @ApiResponse({ status: 200, description: 'Array of riders' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  list() {
    return this.service.listForAdmin();
  }

  @Put(':id/approve')
  @ApiOperation({
    summary: 'Approve or suspend a rider',
    description:
      'Set approve: true to activate a pending rider application. Set approve: false with a suspensionReason to suspend an active rider.',
  })
  @ApiParam({ name: 'id', example: 'rider_01abc' })
  @ApiResponse({ status: 200, description: 'Updated rider' })
  approve(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Body() dto: AdminApproveDto,
  ) {
    return this.service.adminApprove(id, actor, dto);
  }

  @Post(':id/stages')
  @ApiOperation({
    summary: 'Assign a stage to a rider',
    description:
      'Links the rider to a delivery stage/zone. A rider can have multiple stages; one is marked as primary.',
  })
  @ApiParam({ name: 'id', example: 'rider_01abc' })
  @ApiResponse({ status: 201, description: 'Stage assigned' })
  assignStage(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Body() dto: AssignStageDto,
  ) {
    return this.service.assignStage(id, actor, dto);
  }
}
