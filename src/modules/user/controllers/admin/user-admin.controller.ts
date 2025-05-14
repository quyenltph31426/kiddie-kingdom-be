import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserService } from '../../services/user.service';
import { UpdateUserDto } from '../../dto/update-user.dto';
import { AdminAuthGuard } from '@/modules/admin-auth/guards/admin-auth.guard';
import { AdminRolesAllowed } from '@/shared/decorator/adminRoles.decorator';
import { AdminRoles } from '@/shared/enums';
import { CreateUserDto } from '../../dto/create-user.dto';
import { UserStatus } from '@/shared/interfaces';

@ApiTags('Admin Users')
@Controller('admin/users')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class UserAdminController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: UserStatus,
  ) {
    return this.userService.findAll({
      page,
      limit,
      search,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID (admin)' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change user status' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  changeStatus(@Param('id') id: string, @Body('status') status: UserStatus) {
    return this.userService.changeStatus(id, status);
  }
}
