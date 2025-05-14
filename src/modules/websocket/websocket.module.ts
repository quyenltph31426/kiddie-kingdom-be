import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import Redis from 'ioredis';
import { WebSocketsGateway } from './websockets.gateway';
import { createClient } from 'redis';
import { getLogger } from 'src/shared/logger';

const logger = getLogger('WebSocketsGateway');

@Module({
  imports: [JwtModule],
  providers: [
    WebSocketsGateway,
    {
      provide: 'REDIS_SERVICE',
      useFactory: async () => {
        const redisClient = createClient({
          socket: {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT),
          },
          database: parseInt(process.env.REDIS_DB_CACHE),
          // username: process.env.REDIS_USERNAME || undefined,
          password: process.env.REDIS_PASS || undefined,
        });

        logger.debug('Connecting to Redis...');

        await redisClient.connect();

        logger.debug('Redis connection established successfully');

        return redisClient;
      },
    },
  ],
})
export class WebSocketsModule {}
