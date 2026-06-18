import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ParcelService } from './parcel.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import { CancelParcelDto, CreateParcelDto } from './dto/parcel.dto';

@ApiTags('Parcels')
@ApiCookieAuth('session')
@Controller('parcels')
export class ParcelsController {
  constructor(private readonly service: ParcelService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a parcel delivery',
    description:
      'Books a point-to-point parcel delivery. A rider is automatically dispatched from the pickup location to the drop-off.',
  })
  @ApiResponse({
    status: 201,
    description: 'Created parcel with delivery tracking ID',
  })
  @ApiResponse({
    status: 400,
    description: 'No riders available in the pickup zone',
  })
  create(@Actor() actor: ActorContext, @Body() dto: CreateParcelDto) {
    return this.service.createParcel(actor, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my parcel deliveries' })
  @ApiResponse({ status: 200, description: 'Array of parcels' })
  list(@Actor() actor: ActorContext) {
    return this.service.listMyParcels(actor);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get parcel detail',
    description: 'Returns parcel with current status and rider location.',
  })
  @ApiParam({ name: 'id', example: 'parcel_01abc' })
  @ApiResponse({ status: 200, description: 'Parcel detail' })
  @ApiResponse({ status: 404, description: 'Parcel not found' })
  get(@Param('id') id: string) {
    return this.service.getParcel(id);
  }

  @Put(':id/cancel')
  @ApiOperation({
    summary: 'Cancel a parcel delivery',
    description: 'Cancellable only before a rider is assigned.',
  })
  @ApiParam({ name: 'id', example: 'parcel_01abc' })
  @ApiResponse({ status: 200, description: 'Parcel cancelled' })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel — rider already assigned',
  })
  cancel(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Body() dto: CancelParcelDto,
  ) {
    return this.service.cancelParcel(id, actor, dto);
  }
}
