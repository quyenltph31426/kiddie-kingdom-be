import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserAddress, UserAddressDocument } from '@/database/schemas/user-address.schema';
import { AddAddressDto, UpdateAddressDto } from '../dto/address.dto';

@Injectable()
export class UserAddressService {
  constructor(@InjectModel(UserAddress.name) private userAddressModel: Model<UserAddressDocument>) {}

  async getAllAddresses(userId: string) {
    const userAddress = await this.userAddressModel.findOne({ userId: new Types.ObjectId(userId) });

    if (!userAddress) {
      return [];
    }

    return userAddress.addresses;
  }

  async getAddressById(userId: string, addressId: string) {
    const userAddress = await this.userAddressModel.findOne({ userId: new Types.ObjectId(userId) });

    if (!userAddress) {
      throw new NotFoundException('User addresses not found');
    }

    const address = userAddress.addresses.find((addr) => addr._id.toString() === addressId);

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  async addAddress(userId: string, addressDto: AddAddressDto) {
    let userAddress = await this.userAddressModel.findOne({ userId: new Types.ObjectId(userId) });

    if (!userAddress) {
      userAddress = await this.userAddressModel.create({
        userId: new Types.ObjectId(userId),
        addresses: [],
      });
    }

    // If this is the first address or isDefault is true, make it the default
    const isDefault = addressDto.isDefault || userAddress.addresses.length === 0;

    // If setting this address as default, unset any existing default
    if (isDefault) {
      userAddress.addresses.forEach((address) => {
        address.isDefault = false;
      });
    }

    // Add the new address
    userAddress.addresses.push({
      ...addressDto,
      isDefault,
    });

    await userAddress.save();

    return { addresses: userAddress.addresses };
  }

  async updateAddress(userId: string, updateAddressDto: UpdateAddressDto) {
    const { addressId, ...addressData } = updateAddressDto;

    const userAddress = await this.userAddressModel.findOne({ userId: new Types.ObjectId(userId) });

    if (!userAddress) {
      throw new NotFoundException('User addresses not found');
    }

    // Find the address to update
    const addressIndex = userAddress.addresses.findIndex((addr) => addr._id.toString() === addressId);

    if (addressIndex === -1) {
      throw new NotFoundException('Address not found');
    }

    // If setting this address as default, unset any existing default
    if (addressData.isDefault) {
      userAddress.addresses.forEach((address) => {
        address.isDefault = false;
      });
    }

    // Update the address
    userAddress.addresses[addressIndex] = {
      ...userAddress.addresses[addressIndex],
      ...addressData,
    };

    await userAddress.save();

    return { addresses: userAddress.addresses };
  }

  async deleteAddress(userId: string, addressId: string) {
    const userAddress = await this.userAddressModel.findOne({ userId: new Types.ObjectId(userId) });

    if (!userAddress) {
      throw new NotFoundException('User addresses not found');
    }

    // Find the address to delete
    const addressIndex = userAddress.addresses.findIndex((addr) => addr._id.toString() === addressId);

    if (addressIndex === -1) {
      throw new NotFoundException('Address not found');
    }

    // Check if we're deleting the default address
    const isDefault = userAddress.addresses[addressIndex].isDefault;

    // Remove the address
    userAddress.addresses.splice(addressIndex, 1);

    // If we deleted the default address and there are other addresses, make the first one default
    if (isDefault && userAddress.addresses.length > 0) {
      userAddress.addresses[0].isDefault = true;
    }

    await userAddress.save();

    return { addresses: userAddress.addresses };
  }

  async setDefaultAddress(userId: string, addressId: string) {
    const userAddress = await this.userAddressModel.findOne({ userId: new Types.ObjectId(userId) });

    if (!userAddress) {
      throw new NotFoundException('User addresses not found');
    }

    // Find the address to set as default
    const addressIndex = userAddress.addresses.findIndex((addr) => addr._id.toString() === addressId);

    if (addressIndex === -1) {
      throw new NotFoundException('Address not found');
    }

    // Set all addresses to non-default
    userAddress.addresses.forEach((address) => {
      address.isDefault = false;
    });

    // Set the selected address as default
    userAddress.addresses[addressIndex].isDefault = true;

    await userAddress.save();

    return { addresses: userAddress.addresses };
  }

  async getDefaultAddress(userId: string) {
    const userAddress = await this.userAddressModel.findOne({ userId: new Types.ObjectId(userId) });

    if (!userAddress || userAddress.addresses.length === 0) {
      return null;
    }

    const defaultAddress = userAddress.addresses.find((address) => address.isDefault);

    return defaultAddress || userAddress.addresses[0]; // Return default or first address
  }
}
