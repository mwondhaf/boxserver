import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ParcelService } from './parcel.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import { CancelParcelDto, CreateParcelDto } from './dto/parcel.dto';

@Controller('parcels')
export class ParcelsController {
  constructor(private readonly service: ParcelService) {}

  @Post()
  create(@Actor() actor: ActorContext, @Body() dto: CreateParcelDto) {
    return this.service.createParcel(actor, dto);
  }

  @Get()
  list(@Actor() actor: ActorContext) {
    return this.service.listMyParcels(actor);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.getParcel(id);
  }

  @Put(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Body() dto: CancelParcelDto,
  ) {
    return this.service.cancelParcel(id, actor, dto);
  }
}
