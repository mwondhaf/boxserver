import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VendorType {
  Grocery = 'grocery',
  Food = 'food',
}

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Kampala Fresh Market' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'kampala-fresh-market' })
  @IsString()
  slug!: string;

  @ApiPropertyOptional({ enum: VendorType, example: VendorType.Grocery })
  @IsEnum(VendorType)
  @IsOptional()
  type?: VendorType;

  @ApiPropertyOptional({ example: 'vendor@example.com' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+256700000000' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Tax identification number', example: '1234567890' })
  @IsString()
  @IsOptional()
  tin?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiPropertyOptional({ example: '+256700000001' })
  @IsString()
  @IsOptional()
  contactPhone?: string;

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

  @ApiPropertyOptional({ example: 0.3136, description: 'Latitude of vendor location' })
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ example: 32.5811, description: 'Longitude of vendor location' })
  @IsNumber()
  @IsOptional()
  lng?: number;

  @ApiPropertyOptional({ example: 'cat_01abc', description: 'Category ID from /admin/catalog/categories' })
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
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: false, description: 'Mark the store temporarily unavailable' })
  @IsBoolean()
  @IsOptional()
  isBusy?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Whether the store appears in the storefront' })
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

  @ApiPropertyOptional({ example: 5000, description: 'Minimum order amount in UGX' })
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
}

export class UpdatePayoutDto {
  @ApiProperty({ enum: ['mobile_money', 'bank'], example: 'mobile_money' })
  @IsEnum(['mobile_money', 'bank'])
  payoutMethod!: 'mobile_money' | 'bank';

  @ApiPropertyOptional({ example: '+256700000000' })
  @IsString()
  @IsOptional()
  payoutMobileNumber?: string;

  @ApiPropertyOptional({ example: 'Stanbic Bank' })
  @IsString()
  @IsOptional()
  payoutBankName?: string;

  @ApiPropertyOptional({ example: '9030012345678' })
  @IsString()
  @IsOptional()
  payoutBankAccount?: string;

  @ApiPropertyOptional({ example: 'Kampala Road' })
  @IsString()
  @IsOptional()
  payoutBankBranch?: string;
}

export class InviteMemberDto {
  @ApiProperty({ example: 'staff@example.com' })
  @IsString()
  email!: string;

  @ApiProperty({ enum: ['admin', 'member'], example: 'member' })
  @IsEnum(['admin', 'member'])
  role!: 'admin' | 'member';
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ['admin', 'member'], example: 'admin' })
  @IsEnum(['admin', 'member'])
  role!: 'admin' | 'member';
}
