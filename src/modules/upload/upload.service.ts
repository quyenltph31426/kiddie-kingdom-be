import { Injectable, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly logger = new Logger(UploadService.name);
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private cloudinaryConfigured = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.configureCloudinary();
  }

  private configureCloudinary() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.error('Cloudinary configuration is missing. Check your .env file.');
      return;
    }

    try {
      // Configure Cloudinary directly in the service
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });

      this.cloudinaryConfigured = true;
      this.logger.log('Cloudinary configured successfully');
    } catch (error) {
      this.logger.error(`Failed to configure Cloudinary: ${error.message}`);
    }
  }

  private validateFile(file: Express.Multer.File): boolean {
    // Check if file exists
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds the limit of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    // Check file type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    return true;
  }

  async uploadSingle(file: Express.Multer.File) {
    try {
      // Check if Cloudinary is configured
      if (!this.cloudinaryConfigured) {
        this.configureCloudinary();
        if (!this.cloudinaryConfigured) {
          throw new Error('Cloudinary is not properly configured');
        }
      }

      // Validate file
      this.validateFile(file);

      // Upload to Cloudinary
      const result = await this.uploadToCloudinary(file);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        resourceType: result.resource_type,
        size: file.size,
        originalName: file.originalname,
        mimeType: file.mimetype,
      };
    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  async uploadMultiple(files: Express.Multer.File[]) {
    try {
      // Validate each file
      files.forEach((file) => this.validateFile(file));

      const uploadPromises = files.map((file) => this.uploadToCloudinary(file));
      const results = await Promise.all(uploadPromises);

      return results.map((result, index) => ({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        resourceType: result.resource_type,
        size: files[index].size,
        originalName: files[index].originalname,
        mimeType: files[index].mimetype,
      }));
    } catch (error) {
      this.logger.error(`Multiple upload failed: ${error.message}`, error.stack);
      throw new BadRequestException(error.message);
    }
  }

  private async uploadToCloudinary(file: Express.Multer.File) {
    return new Promise<any>((resolve, reject) => {
      const folderName = process.env.CLOUDINARY_FOLDER || 'uploads';

      const upload = cloudinary.uploader.upload_stream(
        {
          folder: folderName,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      const buffer = Buffer.from(file.buffer);
      const stream = Readable.from(buffer);
      stream.pipe(upload);
    });
  }
}
