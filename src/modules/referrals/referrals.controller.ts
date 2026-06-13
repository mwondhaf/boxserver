import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { ReferralService } from './referral.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';

class RedeemReferralDto {
  @IsString() code!: string;
}

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly service: ReferralService) {}

  @Get('my-code')
  getMyCode(@Actor() actor: ActorContext) {
    return this.service.getMyCode(actor);
  }

  @Post('redeem')
  redeem(@Actor() actor: ActorContext, @Body() dto: RedeemReferralDto) {
    return this.service.redeem(actor, dto.code);
  }

  @Get('my-referrals')
  list(@Actor() actor: ActorContext) {
    return this.service.listMyReferrals(actor);
  }
}
