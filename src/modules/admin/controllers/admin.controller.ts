import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from '../services/admin.service';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { AdminAuthGuard } from '@/modules/admin-auth/guards/admin-auth.guard';
import { AdminRolesAllowed } from '@/shared/decorator/adminRoles.decorator';
import { AdminRoles, AdminStatus } from '@/shared/enums';
import { Admin } from '@/shared/decorator/admin.decorator';

@ApiTags('Admin Management')
@Controller('admin/admins')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new admin' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.create(createAdminDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all admins' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: AdminStatus })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: AdminStatus,
  ) {
    return this.adminService.findAll({
      page,
      limit,
      search,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an admin by ID' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  findOne(@Param('id') id: string) {
    return this.adminService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an admin' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto, @Admin() admin: any) {
    // Prevent admins from updating themselves to lower privileges
    if (id === admin.sub) {
      delete updateAdminDto.role;
      delete updateAdminDto.isActive;
    }
    return this.adminService.update(id, updateAdminDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an admin' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  remove(@Param('id') id: string, @Admin() admin: any) {
    // Prevent admins from deleting themselves
    if (id === admin.sub) {
      throw new Error('Cannot delete your own account');
    }
    return this.adminService.remove(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change admin status' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  changeStatus(@Param('id') id: string, @Body('status') status: AdminStatus, @Admin() admin: any) {
    // Prevent admins from changing their own status
    if (id === admin.sub) {
      throw new Error('Cannot change your own status');
    }
    return this.adminService.changeStatus(id, status);
  }
}
