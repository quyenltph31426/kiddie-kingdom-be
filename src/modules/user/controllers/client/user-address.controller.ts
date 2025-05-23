import { Controller, Get, Post, Body, Put, Patch, Delete, UseGuards, Request, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { UserAddressService } from '../../services/user-address.service';
import { AddAddressDto, UpdateAddressDto, SetDefaultAddressDto } from '../../dto/address.dto';

@ApiTags('User Addresses')
@Controller('user/addresses')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class UserAddressController {
  constructor(private readonly userAddressService: UserAddressService) {}

  @Get()
  @ApiOperation({ summary: 'Get all user addresses' })
  @ApiResponse({
    status: 200,
    description: 'Returns all addresses for the current user',
    schema: {
      example: [
        {
          fullName: 'Nguyen Van A',
          phone: '0912345678',
          addressLine1: '123 Nguyen Hue Street',
          addressLine2: 'Apartment 4B',
          city: 'Ho Chi Minh City',
          district: 'District 1',
          ward: 'Ben Nghe Ward',
          postalCode: '700000',
          isDefault: true,
          _id: '60d5ec9af682fbd12a0b4b72',
        },
      ],
    },
  })
  async getAllAddresses(@Request() req) {
    return this.userAddressService.getAllAddresses(req.user.sub);
  }

  @Get('default')
  @ApiOperation({ summary: 'Get user default address' })
  @ApiResponse({
    status: 200,
    description: 'Returns the default address for the current user',
    schema: {
      example: {
        fullName: 'Nguyen Van A',
        phone: '0912345678',
        addressLine1: '123 Nguyen Hue Street',
        addressLine2: 'Apartment 4B',
        city: 'Ho Chi Minh City',
        district: 'District 1',
        ward: 'Ben Nghe Ward',
        postalCode: '700000',
        isDefault: true,
        _id: '60d5ec9af682fbd12a0b4b72',
      },
    },
  })
  async getDefaultAddress(@Request() req) {
    return this.userAddressService.getDefaultAddress(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific address by ID' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the specified address',
    schema: {
      example: {
        fullName: 'Nguyen Van A',
        phone: '0912345678',
        addressLine1: '123 Nguyen Hue Street',
        addressLine2: 'Apartment 4B',
        city: 'Ho Chi Minh City',
        district: 'District 1',
        ward: 'Ben Nghe Ward',
        postalCode: '700000',
        isDefault: false,
        _id: '60d5ec9af682fbd12a0b4b72',
      },
    },
  })
  async getAddressById(@Request() req, @Param('id') addressId: string) {
    return this.userAddressService.getAddressById(req.user.sub, addressId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new address' })
  @ApiResponse({
    status: 201,
    description: 'Address added successfully',
    schema: {
      example: {
        addresses: [
          {
            fullName: 'Nguyen Van A',
            phone: '0912345678',
            addressLine1: '123 Nguyen Hue Street',
            addressLine2: 'Apartment 4B',
            city: 'Ho Chi Minh City',
            district: 'District 1',
            ward: 'Ben Nghe Ward',
            postalCode: '700000',
            isDefault: true,
            _id: '60d5ec9af682fbd12a0b4b72',
          },
        ],
      },
    },
  })
  async addAddress(@Request() req, @Body() addAddressDto: AddAddressDto) {
    return this.userAddressService.addAddress(req.user.sub, addAddressDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing address' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({
    status: 200,
    description: 'Address updated successfully',
    schema: {
      example: {
        addresses: [
          {
            fullName: 'Nguyen Van A',
            phone: '0912345678',
            addressLine1: '123 Nguyen Hue Street',
            addressLine2: 'Apartment 4B',
            city: 'Ho Chi Minh City',
            district: 'District 1',
            ward: 'Ben Nghe Ward',
            postalCode: '700000',
            isDefault: true,
            _id: '60d5ec9af682fbd12a0b4b72',
          },
        ],
      },
    },
  })
  async updateAddress(@Request() req, @Param('id') addressId: string, @Body() updateAddressDto: UpdateAddressDto) {
    // Combine the addressId from the URL with the DTO data
    const completeUpdateDto = {
      ...updateAddressDto,
      addressId,
    };
    return this.userAddressService.updateAddress(req.user.sub, completeUpdateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an address' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({
    status: 200,
    description: 'Address deleted successfully',
    schema: {
      example: {
        addresses: [
          {
            fullName: 'Nguyen Van A',
            phone: '0912345678',
            addressLine1: '123 Nguyen Hue Street',
            addressLine2: 'Apartment 4B',
            city: 'Ho Chi Minh City',
            district: 'District 1',
            ward: 'Ben Nghe Ward',
            postalCode: '700000',
            isDefault: true,
            _id: '60d5ec9af682fbd12a0b4b72',
          },
        ],
      },
    },
  })
  async deleteAddress(@Request() req, @Param('id') addressId: string) {
    return this.userAddressService.deleteAddress(req.user.sub, addressId);
  }

  @Post(':id/default')
  @ApiOperation({ summary: 'Set an address as default' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({
    status: 200,
    description: 'Default address set successfully',
    schema: {
      example: {
        addresses: [
          {
            fullName: 'Nguyen Van A',
            phone: '0912345678',
            addressLine1: '123 Nguyen Hue Street',
            addressLine2: 'Apartment 4B',
            city: 'Ho Chi Minh City',
            district: 'District 1',
            ward: 'Ben Nghe Ward',
            postalCode: '700000',
            isDefault: true,
            _id: '60d5ec9af682fbd12a0b4b72',
          },
        ],
      },
    },
  })
  async setDefaultAddress(@Request() req, @Param('id') addressId: string) {
    return this.userAddressService.setDefaultAddress(req.user.sub, addressId);
  }
}
