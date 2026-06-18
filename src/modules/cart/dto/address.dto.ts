import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUgandanPhone } from '../../../common/validation/ugandan-phone.validator';

export class CreateAddressDto {
  @ApiProperty({ example: 'Home', description: 'Label for this address' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: '+256700000000' })
  @IsUgandanPhone()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Kampala' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Nakawa' })
  @IsString()
  @IsOptional()
  town?: string;

  @ApiPropertyOptional({ example: 'Jinja Road' })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiPropertyOptional({ example: 'home', description: 'home | work | other' })
  @IsString()
  @IsOptional()
  addressType?: string;

  @ApiPropertyOptional({ example: 'Nakawa House' })
  @IsString()
  @IsOptional()
  buildingName?: string;

  @ApiPropertyOptional({ example: '3B' })
  @IsString()
  @IsOptional()
  apartmentNo?: string;

  @ApiPropertyOptional({ example: 0.3456, description: 'Latitude (-90 to 90)' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({
    example: 32.6011,
    description: 'Longitude (-180 to 180)',
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  lng?: number;

  @ApiPropertyOptional({ example: 'Next to the Shell petrol station' })
  @IsString()
  @IsOptional()
  directions?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Set as the default delivery address',
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateAddressDto extends CreateAddressDto {}
