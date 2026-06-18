import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReferralService } from './referral.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';

class RedeemReferralDto {
  @ApiProperty({
    example: 'JANE2025',
    description: 'Referral code shared by a friend',
  })
  @IsString()
  code!: string;
}

@ApiTags('Referrals')
@ApiCookieAuth('session')
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly service: ReferralService) {}

  @Get('my-code')
  @ApiOperation({
    summary: 'Get my referral code',
    description:
      "Returns the user's unique referral code to share with friends.",
  })
  @ApiResponse({ status: 200, description: 'Referral code object' })
  getMyCode(@Actor() actor: ActorContext) {
    return this.service.getMyCode(actor);
  }

  @Post('redeem')
  @ApiOperation({
    summary: 'Redeem a referral code',
    description:
      "Applies a friend's referral code to the current user's account. Both users may receive a reward.",
  })
  @ApiResponse({ status: 201, description: 'Referral redeemed' })
  @ApiResponse({ status: 400, description: 'Invalid or already-used code' })
  redeem(@Actor() actor: ActorContext, @Body() dto: RedeemReferralDto) {
    return this.service.redeem(actor, dto.code);
  }

  @Get('my-referrals')
  @ApiOperation({
    summary: 'List users I have referred',
    description:
      "Returns all users who signed up using the current user's referral code.",
  })
  @ApiResponse({ status: 200, description: 'Array of referral records' })
  list(@Actor() actor: ActorContext) {
    return this.service.listMyReferrals(actor);
  }
}
