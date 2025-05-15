import { Controller, Get, Post, Body, Put, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { UserAddressService } from '../../services/user-address.service';
import { AddAddressDto, UpdateAddressDto, DeleteAddressDto, SetDefaultAddressDto } from '../../dto/address.dto';

@ApiTags('User Addresses')
@Controller('user/addresses')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class UserAddressController {
  constructor(private readonly userAddressService: UserAddressService) {}

  @Get()
  @ApiOperation({ summary: 'Get all user addresses' })
  async getAllAddresses(@Request() req) {
    return this.userAddressService.getAllAddresses(req.user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new address' })
  async addAddress(@Request() req, @Body() addAddressDto: AddAddressDto) {
    return this.userAddressService.addAddress(req.user.sub, addAddressDto);
  }

  @Put()
  @ApiOperation({ summary: 'Update an existing address' })
  async updateAddress(@Request() req, @Body() updateAddressDto: UpdateAddressDto) {
    return this.userAddressService.updateAddress(req.user.sub, updateAddressDto);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete an address' })
  async deleteAddress(@Request() req, @Body() deleteAddressDto: DeleteAddressDto) {
    return this.userAddressService.deleteAddress(req.user.sub, deleteAddressDto.addressId);
  }

  @Post('default')
  @ApiOperation({ summary: 'Set an address as default' })
  async setDefaultAddress(@Request() req, @Body() setDefaultAddressDto: SetDefaultAddressDto) {
    return this.userAddressService.setDefaultAddress(req.user.sub, setDefaultAddressDto.addressId);
  }
}
