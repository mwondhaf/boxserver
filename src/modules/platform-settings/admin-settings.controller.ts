import { Body, Controller, Get, Patch } from '@nestjs/common';
import { PlatformSettingsService } from './platform-settings.service';
import { RequireRole } from '../../auth/casl/policies.guard';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

class UpdateSettingsDto {
  @IsBoolean() @IsOptional() mobileMoneyCodEnabled?: boolean;
  @IsBoolean() @IsOptional() cardEnabled?: boolean;
  @IsBoolean() @IsOptional() walletEnabled?: boolean;
  @IsBoolean() @IsOptional() cashOnDeliveryEnabled?: boolean;
  @IsBoolean() @IsOptional() markupEnabled?: boolean;
  @IsBoolean() @IsOptional() serviceFeeEnabled?: boolean;
  @IsInt() @Min(0) @IsOptional() serviceFeeAmount?: number;
  @IsString() @IsOptional() serviceFeeType?: string;
  @IsInt() @Min(0) @IsOptional() serviceFeeCap?: number;
  @IsBoolean() @IsOptional() smallOrderFeeEnabled?: boolean;
  @IsInt() @Min(0) @IsOptional() smallOrderFeeThreshold?: number;
  @IsInt() @Min(0) @IsOptional() smallOrderFeeAmount?: number;
  @IsBoolean() @IsOptional() referralEnabled?: boolean;
  @IsInt() @Min(0) @IsOptional() referralRewardAmount?: number;
  @IsInt() @Min(1) @IsOptional() unconfirmedOrderTimeoutMinutes?: number;
  @IsInt() @Min(10) @IsOptional() riderOfferWindowSeconds?: number;
  @IsInt() @Min(1) @IsOptional() cartTtlHours?: number;
}

@RequireRole('admin')
@Controller('a/settings')
export class AdminSettingsController {
  constructor(private readonly service: PlatformSettingsService) {}

  @Get()
  get() {
    return this.service.getSettings();
  }

  @Patch()
  update(@Actor() actor: ActorContext, @Body() dto: UpdateSettingsDto) {
    return this.service.updateSettings(dto, actor.userId);
  }
}
