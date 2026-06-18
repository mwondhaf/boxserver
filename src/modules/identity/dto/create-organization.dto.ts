import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUgandanPhone } from '../../../common/validation/ugandan-phone.validator';

export enum VendorType {
  Grocery = 'grocery',
  Food = 'food',
}

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Kampala Fresh Market' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    example: 'kampala-fresh-market',
    description: 'Auto-generated from name if omitted.',
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ enum: VendorType, example: VendorType.Grocery })
  @IsEnum(VendorType)
  @IsOptional()
  type?: VendorType;

  @ApiPropertyOptional({ example: 'vendor@example.com' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+256700000000' })
  @IsUgandanPhone()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Tax identification number',
    example: '1234567890',
  })
  @IsString()
  @IsOptional()
  tin?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiPropertyOptional({ example: '+256700000001' })
  @IsUgandanPhone()
  @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'contact@example.com' })
  @IsEmail()
  @IsOptional()
  contactPersonEmail?: string;

  @ApiPropertyOptional({ example: 'Kampala' })
  @IsString()
  @IsOptional()
  cityOrDistrict?: string;

  @ApiPropertyOptional({ example: 'Nakawa' })
  @IsString()
  @IsOptional()
  town?: string;

  @ApiPropertyOptional({ example: 'Plot 12 Jinja Road' })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiPropertyOptional({
    example: 0.3136,
    description: 'Latitude of vendor location',
  })
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({
    example: 32.5811,
    description: 'Longitude of vendor location',
  })
  @IsNumber()
  @IsOptional()
  lng?: number;

  @ApiPropertyOptional({
    example: 'cat_01abc',
    description: 'Category ID from /admin/catalog/categories',
  })
  @IsString()
  @IsOptional()
  categoryId?: string;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ example: 'Kampala Fresh Market' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'vendor@example.com' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+256700000000' })
  @IsUgandanPhone()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsString()
  @IsOptional()
  tin?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiPropertyOptional({ example: '+256700000001' })
  @IsUgandanPhone()
  @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'contact@example.com' })
  @IsEmail()
  @IsOptional()
  contactPersonEmail?: string;

  @ApiPropertyOptional({ example: 'Kampala' })
  @IsString()
  @IsOptional()
  cityOrDistrict?: string;

  @ApiPropertyOptional({ example: 'Nakawa' })
  @IsString()
  @IsOptional()
  town?: string;

  @ApiPropertyOptional({ example: 'Plot 12 Jinja Road' })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Mark the store temporarily unavailable',
  })
  @IsBoolean()
  @IsOptional()
  isBusy?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the store appears in the storefront',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  platformDeliveryEnabled?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  selfDeliveryEnabled?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  selfPickupEnabled?: boolean;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Minimum order amount in UGX',
  })
  @IsNumber()
  @IsOptional()
  minimumOrderAmount?: number;

  @ApiPropertyOptional({ example: 'Come to the blue gate and call us' })
  @IsString()
  @IsOptional()
  pickupInstructions?: string;

  @ApiPropertyOptional({ example: '20-30 mins' })
  @IsString()
  @IsOptional()
  estimatedPrepTime?: string;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Self-delivery fee in UGX',
  })
  @IsNumber()
  @IsOptional()
  selfDeliveryFee?: number;

  @ApiPropertyOptional({
    example: 5.5,
    description: 'Self-delivery radius in km',
  })
  @IsNumber()
  @IsOptional()
  selfDeliveryRadius?: number;
}

export class UpdatePayoutDto {
  @ApiProperty({ enum: ['mobile_money', 'bank'], example: 'mobile_money' })
  @IsEnum(['mobile_money', 'bank'])
  payoutMethod!: 'mobile_money' | 'bank';

  @ApiPropertyOptional({ example: 'MTN', description: 'MTN, Airtel, etc.' })
  @IsString()
  @IsOptional()
  mobileMoneyProvider?: string;

  @ApiPropertyOptional({ example: '+256700000000' })
  @IsUgandanPhone()
  @IsOptional()
  payoutMobileNumber?: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Mobile money account holder name',
  })
  @IsString()
  @IsOptional()
  mobileMoneyName?: string;

  @ApiPropertyOptional({ example: 'Stanbic Bank' })
  @IsString()
  @IsOptional()
  payoutBankName?: string;

  @ApiPropertyOptional({ example: '9030012345678' })
  @IsString()
  @IsOptional()
  payoutBankAccount?: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Bank account holder name',
  })
  @IsString()
  @IsOptional()
  bankAccountName?: string;

  @ApiPropertyOptional({ example: 'Kampala Road' })
  @IsString()
  @IsOptional()
  payoutBankBranch?: string;
}

export const VENDOR_MEMBER_ROLES = ['owner', 'admin', 'member'] as const;
export type VendorMemberRole = (typeof VENDOR_MEMBER_ROLES)[number];

export class AddMemberDto {
  @ApiProperty({
    example: 'staff@example.com',
    description: 'Email of an existing platform user',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: VENDOR_MEMBER_ROLES, example: 'member' })
  @IsEnum(VENDOR_MEMBER_ROLES)
  role!: VendorMemberRole;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: VENDOR_MEMBER_ROLES, example: 'admin' })
  @IsEnum(VENDOR_MEMBER_ROLES)
  role!: VendorMemberRole;
}
