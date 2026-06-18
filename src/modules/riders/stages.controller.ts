import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RiderService } from './rider.service';
import { Public } from '../../auth/session.guard';

@ApiTags('Riders')
@Controller('stages')
export class StagesController {
  constructor(private readonly service: RiderService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List delivery stages',
    description:
      'Public. Returns all operational delivery stages/zones that riders can be assigned to.',
  })
  @ApiResponse({ status: 200, description: 'Array of stages' })
  list() {
    return this.service.listStages();
  }
}
