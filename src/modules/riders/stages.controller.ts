import { Controller, Get } from '@nestjs/common';
import { RiderService } from './rider.service';
import { Public } from '../../auth/session.guard';

@Controller('stages')
export class StagesController {
  constructor(private readonly service: RiderService) {}

  @Public()
  @Get()
  list() {
    return this.service.listStages();
  }
}
