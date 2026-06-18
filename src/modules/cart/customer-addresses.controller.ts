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
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CustomerAddressesService } from './customer-addresses.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@ApiTags('Addresses')
@ApiCookieAuth('session')
@Controller('me/addresses')
export class CustomerAddressesController {
  constructor(private readonly service: CustomerAddressesService) {}

  @Get()
  @ApiOperation({ summary: 'List my saved addresses' })
  @ApiResponse({ status: 200, description: 'Array of addresses' })
  list(@Actor() actor: ActorContext) {
    return this.service.list(actor);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a delivery address',
    description:
      "Saves a new address to the user's address book. Set isDefault: true to use it as the default checkout address.",
  })
  @ApiResponse({ status: 201, description: 'Created address' })
  create(@Actor() actor: ActorContext, @Body() dto: CreateAddressDto) {
    return this.service.create(actor, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an address' })
  @ApiParam({ name: 'id', example: 'addr_01abc' })
  @ApiResponse({ status: 200, description: 'Updated address' })
  update(
    @Actor() actor: ActorContext,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.service.update(actor, id, dto);
  }

  @Put(':id/default')
  @ApiOperation({
    summary: 'Set address as default',
    description:
      'Marks this address as the default, and unmarks any previous default.',
  })
  @ApiParam({ name: 'id', example: 'addr_01abc' })
  @ApiResponse({ status: 200, description: 'Address set as default' })
  setDefault(@Actor() actor: ActorContext, @Param('id') id: string) {
    return this.service.setDefault(actor, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an address' })
  @ApiParam({ name: 'id', example: 'addr_01abc' })
  @ApiResponse({ status: 200, description: 'Address deleted' })
  remove(@Actor() actor: ActorContext, @Param('id') id: string) {
    return this.service.remove(actor, id);
  }
}
