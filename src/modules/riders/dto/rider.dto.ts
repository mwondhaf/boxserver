import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUgandanPhone } from '../../../common/validation/ugandan-phone.validator';

export enum VehicleType {
  Walking = 'walking',
  Bicycle = 'bicycle',
  Scooter = 'scooter',
  Motorbike = 'motorbike',
  Car = 'car',
  Van = 'van',
  Truck = 'truck',
}

export enum EmploymentType {
  Freelance = 'freelance',
  Inhouse = 'inhouse',
}

export class ApplyRiderDto {
  @ApiProperty({ example: 'James Okello' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '+256700000000' })
  @IsUgandanPhone()
  phoneNumber!: string;

  @ApiProperty({ enum: VehicleType, example: VehicleType.Motorbike })
  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @ApiPropertyOptional({ example: 'UAA 123B' })
  @IsString()
  @IsOptional()
  vehiclePlate?: string;

  @ApiPropertyOptional({ example: 'CM12345678' })
  @IsString()
  @IsOptional()
  nationalId?: string;

  @ApiPropertyOptional({ example: 'DL-9876543' })
  @IsString()
  @IsOptional()
  drivingPermitNumber?: string;

  @ApiPropertyOptional({ example: 'mobile_money' })
  @IsString()
  @IsOptional()
  payoutMethod?: string;

  @ApiPropertyOptional({ example: '+256700000000' })
  @IsUgandanPhone()
  @IsOptional()
  payoutMobileNumber?: string;

  @ApiPropertyOptional({
    enum: EmploymentType,
    example: EmploymentType.Freelance,
  })
  @IsEnum(EmploymentType)
  @IsOptional()
  employmentType?: EmploymentType;
}

export class UpdateLocationDto {
  @ApiProperty({ example: 0.3136, description: 'Current latitude (-90 to 90)' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({
    example: 32.5811,
    description: 'Current longitude (-180 to 180)',
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}

export class SetStatusDto {
  @ApiProperty({ enum: ['online', 'offline', 'busy'], example: 'online' })
  @IsEnum(['online', 'offline', 'busy'] as const)
  status!: 'online' | 'offline' | 'busy';
}

export class AdminApproveDto {
  @ApiPropertyOptional({
    example: true,
    description: 'true = approve, false = suspend',
  })
  @IsBoolean()
  @IsOptional()
  approve?: boolean;

  @ApiPropertyOptional({
    example: 'Fraudulent activity detected',
    description: 'Required when approve is false',
  })
  @IsString()
  @IsOptional()
  suspensionReason?: string;
}

export class AssignStageDto {
  @ApiProperty({
    example: 'stage_01abc',
    description: 'Delivery stage / zone ID',
  })
  @IsString()
  stageId!: string;

  @ApiPropertyOptional({
    example: true,
    description: "Set this as the rider's primary stage",
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class RateRiderDto {
  @ApiProperty({ example: 'order_01abc' })
  @IsString()
  orderId!: string;

  @ApiProperty({
    example: 5,
    description: 'Rating from 1 (poor) to 5 (excellent)',
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: 'Very fast and polite' })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class ReportIncidentDto {
  @ApiProperty({
    example: 'order',
    description: 'Type of delivery: order or parcel',
  })
  @IsString()
  deliveryKind!: string;

  @ApiProperty({ example: 'order_01abc' })
  @IsString()
  deliveryId!: string;

  @ApiProperty({ example: 'accident', description: 'Incident category' })
  @IsString()
  category!: string;

  @ApiProperty({ example: 'Slipped on wet road near Nakawa roundabout' })
  @IsString()
  description!: string;
}
