import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CustomerAddressesService } from './customer-addresses.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Controller('me/addresses')
export class CustomerAddressesController {
  constructor(private readonly service: CustomerAddressesService) {}

  @Get()
  list(@Actor() actor: ActorContext) {
    return this.service.list(actor);
  }

  @Post()
  create(@Actor() actor: ActorContext, @Body() dto: CreateAddressDto) {
    return this.service.create(actor, dto);
  }

  @Patch(':id')
  update(
    @Actor() actor: ActorContext,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.service.update(actor, id, dto);
  }

  @Put(':id/default')
  setDefault(@Actor() actor: ActorContext, @Param('id') id: string) {
    return this.service.setDefault(actor, id);
  }

  @Delete(':id')
  remove(@Actor() actor: ActorContext, @Param('id') id: string) {
    return this.service.remove(actor, id);
  }
}
