import { Controller, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from '../../services/user.service';
import { UpdateUserDto } from '../../dto/update-user.dto';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { UpdatePasswordDto } from '../../dto/update-password.dto';

@ApiTags('Users')
@Controller('users')
export class UserClientController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@Request() req) {
    return this.userService.findOne(req.user.sub);
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    // Prevent users from changing sensitive fields
    delete updateUserDto.isActive;

    return this.userService.update(req.user.sub, updateUserDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID (public)' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch('profile/password')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user password' })
  updatePassword(@Request() req, @Body() updatePasswordDto: UpdatePasswordDto) {
    return this.userService.updatePassword(
      req.user.sub,
      updatePasswordDto.currentPassword,
      updatePasswordDto.newPassword,
    );
  }
}
