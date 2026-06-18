import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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

@ApiTags('Riders')
@ApiCookieAuth('session')
@Controller('rider')
export class RiderController {
  constructor(private readonly service: RiderService) {}

  @Post('apply')
  @ApiOperation({
    summary: 'Apply to become a rider',
    description:
      'Submits a rider application. An admin must approve it before the rider can accept deliveries.',
  })
  @ApiResponse({ status: 201, description: 'Rider application created' })
  @ApiResponse({
    status: 409,
    description: 'Application already exists for this user',
  })
  apply(@Actor() actor: ActorContext, @Body() dto: ApplyRiderDto) {
    return this.service.apply(actor, dto);
  }

  @Get('profile')
  @ApiOperation({
    summary: 'Get my rider profile',
    description:
      'Returns the rider profile including status, ratings, and assigned stages.',
  })
  @ApiResponse({ status: 200, description: 'Rider profile' })
  @ApiResponse({
    status: 404,
    description: 'Rider profile not found — apply first',
  })
  profile(@Actor() actor: ActorContext) {
    return this.service.getProfile(actor);
  }

  @Put('location')
  @ApiOperation({
    summary: 'Update current location',
    description:
      'Riders should call this frequently while on a delivery so customers and vendors can track progress.',
  })
  @ApiResponse({ status: 200, description: 'Location updated' })
  updateLocation(@Actor() actor: ActorContext, @Body() dto: UpdateLocationDto) {
    return this.service.updateLocation(actor, dto);
  }

  @Put('status')
  @ApiOperation({
    summary: 'Set availability status',
    description:
      'online = available for new deliveries, busy = currently delivering, offline = not working.',
  })
  @ApiResponse({ status: 200, description: 'Status updated' })
  setStatus(@Actor() actor: ActorContext, @Body() dto: SetStatusDto) {
    return this.service.setStatus(actor, dto);
  }

  @Post('rate')
  @ApiOperation({
    summary: 'Rate a rider after delivery',
    description:
      'Customers use this to leave a 1–5 star rating for the rider who delivered their order.',
  })
  @ApiResponse({ status: 201, description: 'Rating submitted' })
  rate(@Actor() actor: ActorContext, @Body() dto: RateRiderDto) {
    return this.service.rateRider(actor, dto);
  }

  @Post('incidents')
  @ApiOperation({
    summary: 'Report an incident',
    description:
      'Riders use this to report accidents, theft, or other delivery-related incidents.',
  })
  @ApiResponse({ status: 201, description: 'Incident reported' })
  reportIncident(@Actor() actor: ActorContext, @Body() dto: ReportIncidentDto) {
    return this.service.reportIncident(actor, dto);
  }
}
