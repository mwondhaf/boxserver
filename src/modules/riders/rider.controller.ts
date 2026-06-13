import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { RiderService } from './rider.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import {
  ApplyRiderDto,
  RateRiderDto,
  ReportIncidentDto,
  SetStatusDto,
  UpdateLocationDto,
} from './dto/rider.dto';

@Controller('rider')
export class RiderController {
  constructor(private readonly service: RiderService) {}

  @Post('apply')
  apply(@Actor() actor: ActorContext, @Body() dto: ApplyRiderDto) {
    return this.service.apply(actor, dto);
  }

  @Get('profile')
  profile(@Actor() actor: ActorContext) {
    return this.service.getProfile(actor);
  }

  @Put('location')
  updateLocation(@Actor() actor: ActorContext, @Body() dto: UpdateLocationDto) {
    return this.service.updateLocation(actor, dto);
  }

  @Put('status')
  setStatus(@Actor() actor: ActorContext, @Body() dto: SetStatusDto) {
    return this.service.setStatus(actor, dto);
  }

  @Post('rate')
  rate(@Actor() actor: ActorContext, @Body() dto: RateRiderDto) {
    return this.service.rateRider(actor, dto);
  }

  @Post('incidents')
  reportIncident(@Actor() actor: ActorContext, @Body() dto: ReportIncidentDto) {
    return this.service.reportIncident(actor, dto);
  }
}
