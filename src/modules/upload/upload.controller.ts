import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { UploadService } from './upload.service';
import { v2 as cloudinary } from 'cloudinary';

@ApiTags('Upload')
@Controller('upload')
// @UseGuards(AuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('single')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingle(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.uploadService.uploadSingle(file);
  }

  @Post('multiple')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    return this.uploadService.uploadMultiple(files);
  }

  @Post('test-cloudinary')
  @ApiOperation({ summary: 'Test Cloudinary configuration' })
  async testCloudinaryConfig() {
    try {
      // Test Cloudinary configuration
      const testResult = await cloudinary.uploader.upload('https://res.cloudinary.com/demo/image/upload/sample.jpg', {
        public_id: 'test_connection',
      });

      return {
        success: true,
        message: 'Cloudinary configuration is working',
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKeyConfigured: !!process.env.CLOUDINARY_API_KEY,
        apiSecretConfigured: !!process.env.CLOUDINARY_API_SECRET,
        testResult,
      };
    } catch (error) {
      return {
        success: false,
        message: `Cloudinary configuration error: ${error.message}`,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKeyConfigured: !!process.env.CLOUDINARY_API_KEY,
        apiSecretConfigured: !!process.env.CLOUDINARY_API_SECRET,
        error: error.message,
      };
    }
  }
}
