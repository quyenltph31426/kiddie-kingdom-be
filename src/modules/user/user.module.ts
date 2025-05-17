import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { User, UserSchema } from '@/database/schemas/user.schema';
import { UserAddress, UserAddressSchema } from '@/database/schemas/user-address.schema';
import { UserAdminController } from './controllers/admin/user-admin.controller';
import { UserClientController } from './controllers/client/user-client.controller';
import { UserAddressController } from './controllers/client/user-address.controller';
import { UserService } from './services/user.service';
import { UserAddressService } from './services/user-address.service';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { Admin, AdminSchema } from '@/database/schemas/admin.schema';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Admin.name, schema: AdminSchema },
      { name: UserAddress.name, schema: UserAddressSchema },
    ]),
    AdminAuthModule,
  ],
  controllers: [UserAdminController, UserClientController, UserAddressController],
  providers: [UserService, UserAddressService],
  exports: [UserService, UserAddressService],
})
export class UserModule {}
