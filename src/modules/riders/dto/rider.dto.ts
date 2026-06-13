import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

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
  @IsString()
  name!: string;

  @IsString()
  phoneNumber!: string;

  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @IsString()
  @IsOptional()
  vehiclePlate?: string;

  @IsString()
  @IsOptional()
  nationalId?: string;

  @IsString()
  @IsOptional()
  drivingPermitNumber?: string;

  @IsString()
  @IsOptional()
  payoutMethod?: string;

  @IsString()
  @IsOptional()
  payoutMobileNumber?: string;

  @IsEnum(EmploymentType)
  @IsOptional()
  employmentType?: EmploymentType;
}

export class UpdateLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}

export class SetStatusDto {
  @IsEnum(['online', 'offline', 'busy'] as const)
  status!: 'online' | 'offline' | 'busy';
}

export class AdminApproveDto {
  @IsBoolean()
  @IsOptional()
  approve?: boolean;

  @IsString()
  @IsOptional()
  suspensionReason?: string;
}

export class AssignStageDto {
  @IsString()
  stageId!: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class RateRiderDto {
  @IsString()
  orderId!: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class ReportIncidentDto {
  @IsString()
  deliveryKind!: string;

  @IsString()
  deliveryId!: string;

  @IsString()
  category!: string;

  @IsString()
  description!: string;
}
