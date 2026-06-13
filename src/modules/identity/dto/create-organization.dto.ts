import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum VendorType {
  Grocery = 'grocery',
  Food = 'food',
}

export class CreateOrganizationDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsEnum(VendorType)
  @IsOptional()
  type?: VendorType;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  tin?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsString()
  @IsOptional()
  cityOrDistrict?: string;

  @IsString()
  @IsOptional()
  town?: string;

  @IsString()
  @IsOptional()
  street?: string;

  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lng?: number;

  @IsString()
  @IsOptional()
  categoryId?: string;
}

export class UpdateOrganizationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsBoolean()
  @IsOptional()
  isBusy?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  platformDeliveryEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  selfDeliveryEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  selfPickupEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  minimumOrderAmount?: number;

  @IsString()
  @IsOptional()
  pickupInstructions?: string;

  @IsString()
  @IsOptional()
  estimatedPrepTime?: string;
}

export class UpdatePayoutDto {
  @IsEnum(['mobile_money', 'bank'])
  payoutMethod!: 'mobile_money' | 'bank';

  @IsString()
  @IsOptional()
  payoutMobileNumber?: string;

  @IsString()
  @IsOptional()
  payoutBankName?: string;

  @IsString()
  @IsOptional()
  payoutBankAccount?: string;

  @IsString()
  @IsOptional()
  payoutBankBranch?: string;
}

export class InviteMemberDto {
  @IsString()
  email!: string;

  @IsEnum(['admin', 'member'])
  role!: 'admin' | 'member';
}

export class UpdateMemberRoleDto {
  @IsEnum(['admin', 'member'])
  role!: 'admin' | 'member';
}
