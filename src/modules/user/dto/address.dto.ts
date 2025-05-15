import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsPhoneNumber } from 'class-validator';

export class AddressDto {
  @ApiProperty({ description: 'Full name of the recipient', example: 'Nguyen Van A' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ description: 'Phone number', example: '0912345678' })
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber('VN')
  phone: string;

  @ApiProperty({ description: 'Address line 1', example: '123 Nguyen Hue Street' })
  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @ApiPropertyOptional({ description: 'Address line 2', example: 'Apartment 4B' })
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @ApiProperty({ description: 'City/Province', example: 'Ho Chi Minh City' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'District', example: 'District 1' })
  @IsString()
  @IsNotEmpty()
  district: string;

  @ApiPropertyOptional({ description: 'Ward', example: 'Ben Nghe Ward' })
  @IsString()
  @IsOptional()
  ward?: string;

  @ApiPropertyOptional({ description: 'Postal code', example: '700000' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Set as default address', example: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class AddAddressDto extends AddressDto {}

export class UpdateAddressDto extends AddressDto {
  @ApiProperty({ description: 'Address ID', example: '60d5ec9af682fbd12a0b4b72' })
  @IsString()
  @IsNotEmpty()
  addressId: string;
}

export class DeleteAddressDto {
  @ApiProperty({ description: 'Address ID', example: '60d5ec9af682fbd12a0b4b72' })
  @IsString()
  @IsNotEmpty()
  addressId: string;
}

export class SetDefaultAddressDto {
  @ApiProperty({ description: 'Address ID', example: '60d5ec9af682fbd12a0b4b72' })
  @IsString()
  @IsNotEmpty()
  addressId: string;
}
