import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from './modules/core/core.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';
import { UploadModule } from './modules/upload/upload.module';
import { CategoryModule } from './modules/category/category.module';
import { BrandModule } from './modules/brand/brand.module';
import { ProductModule } from './modules/product/product.module';
import { UserModule } from './modules/user/user.module';
import { AdminModule } from './modules/admin/admin.module';
import { CartModule } from './modules/cart/cart.module';
import { ProductFavoriteModule } from './modules/product-favorite/product-favorite.module';
import { EmailModule } from './modules/email/email.module';
import authConfig from './config/auth.config';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import serverConfig from './config/server.config';
import emailConfig from './config/email.config';

@Module({
  imports: [
    CoreModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [authConfig, appConfig, databaseConfig, serverConfig, emailConfig],
    }),
    DatabaseModule,
    AuthModule,
    AdminAuthModule,
    UploadModule,
    CategoryModule,
    BrandModule,
    ProductModule,
    UserModule,
    AdminModule,
    CartModule,
    ProductFavoriteModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
