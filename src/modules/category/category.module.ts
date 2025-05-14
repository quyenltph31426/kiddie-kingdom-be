import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from '@/database/schemas/category.schema';
import { CategoryAdminController } from './controllers/admin/category-admin.controller';
import { CategoryClientController } from './controllers/client/category-client.controller';
import { CategoryService } from './services/category.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule.register({}), MongooseModule.forFeature([{ name: Category.name, schema: CategorySchema }])],
  controllers: [CategoryAdminController, CategoryClientController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
