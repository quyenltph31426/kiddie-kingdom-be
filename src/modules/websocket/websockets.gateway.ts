import { getLogger } from '@/shared/logger';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
// import { Redis } from 'ioredis';
import { Server, Socket } from 'socket.io';
import { EChannel } from './types';
import { RedisClientType } from 'redis';

const logger = getLogger('WebSocketsGateway');
@Injectable()
@WebSocketGateway({
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class WebSocketsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  private readonly connectedUsers = new Set<string>();
  private readonly connectedUsersMap = new Map<string, string>();

  private readonly channels = [
    EChannel.COMMENT,
    EChannel.LIVE_BATTLE,
    EChannel.LIVE_BATTLE_LOADING,
    EChannel.DEBATE_CREATED,
    EChannel.DEBATE_UPDATED,
    EChannel.DEBATE_DELETED,
    EChannel.DEBATE_RESOLVED,
    EChannel.BET_PLACED,
    EChannel.USER_CLAIMED,
  ];

  constructor(
    @Inject('REDIS_SERVICE') private redisClient: RedisClientType,
    private jwtService: JwtService,
  ) {}

  @WebSocketServer() server: Server;

  async onModuleInit() {
    this.initializeRedis();
  }

  async initializeRedis() {
    try {
      this.subscribeToChannels();

      this.redisClient.on('message', (channel: EChannel, message) => {
        this.handleRedisMessage(channel, message);
      });
    } catch (error) {
      logger.error('Error initializing Redis: ' + error.message);
    }
  }

  private subscribeToChannels() {
    for (const channel of this.channels) {
      this.redisClient.subscribe(channel, (message: string) => {
        logger.debug(`Subscribed to Redis channel: ${channel}`);
        this.handleRedisMessage(channel, message);
      });
    }
  }

  private handleRedisMessage(channel: EChannel, message: string) {
    logger.debug(`Received message from Redis channel ${channel}: ${message}`);

    try {
      if (channel === EChannel.COMMENT) {
        const data = JSON.parse(message);

        if (!data || !data?.data || data?.type !== 'USER_COMMENT') return;
        this.server.emit('comment_' + data?.data?.battle, data.data);
        return;
      }

      if (channel === EChannel.LIVE_BATTLE) {
        const data = JSON.parse(message);

        if (!data || !data?.payload || data?.type !== 'LIVE_BATTLE') return;
        this.server.emit(`live_battle_${data.payload.battle_id}`, data.payload);
        return;
      }

      if (channel === EChannel.LIVE_BATTLE_LOADING) {
        const data = JSON.parse(message);

        if (!data || !data?.payload || data?.type !== 'LIVE_BATTLE_LOADING') return;
        this.server.emit(`live_battle_loading_${data.payload.battle_id}`, data.payload);
        return;
      }

      if (channel === EChannel.DEBATE_CREATED) {
        const data = JSON.parse(message);

        if (!data || !data?.payload || data?.type !== EChannel.DEBATE_CREATED) return;

        this.server.emit(EChannel.DEBATE_CREATED, data.payload);
        return;
      }

      if (channel === EChannel.DEBATE_UPDATED) {
        const data = JSON.parse(message);

        if (!data || !data?.payload || data?.type !== EChannel.DEBATE_UPDATED) return;

        this.server.emit(EChannel.DEBATE_UPDATED, data.payload);
        return;
      }

      if (channel === EChannel.DEBATE_DELETED) {
        const data = JSON.parse(message);

        if (!data || !data?.payload || data?.type !== EChannel.DEBATE_DELETED) return;

        this.server.emit(EChannel.DEBATE_DELETED, data.payload);
        return;
      }

      if (channel === EChannel.DEBATE_RESOLVED) {
        const data = JSON.parse(message);

        if (!data || !data?.payload || data?.type !== EChannel.DEBATE_RESOLVED) return;

        this.server.emit(`${EChannel.DEBATE_RESOLVED}_${data.payload.id}`, data.payload);
        return;
      }

      if (channel === EChannel.USER_CLAIMED) {
        const data = JSON.parse(message);

        if (!data || !data?.payload || data?.type !== EChannel.USER_CLAIMED) return;

        this.server
          .to(data.payload?.user_wallet)
          .emit(`${EChannel.USER_CLAIMED}_${data.payload.battleId}`, data.payload);
        return;
      }

      if (channel === EChannel.BET_PLACED) {
        const data = JSON.parse(message);

        if (!data || !data?.payload || data?.type !== EChannel.BET_PLACED) return;

        this.server.emit(`${EChannel.BET_PLACED}_${data.payload.battleId}`, data.payload);
        return;
      }

      logger.warn(`Unhandled Redis channel: ${channel}`);
    } catch (error) {
      logger.error('Error processing Redis message: ' + error.message);
    }
  }

  async handleConnection(socket: Socket) {
    logger.debug(`Client connected: ${socket.id}`);

    const authHeader = socket.handshake.headers.authorization;
    logger.debug(`Bearer token: ${authHeader}`);
    const token = authHeader ? authHeader.split(' ')[1] : null;

    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_SECRET_KEY,
        });

        logger.debug(`User payload: ${JSON.stringify(payload)}`);
        this.connectedUsersMap.set(`${socket.id}`, payload?.id);

        const roomName =
          payload?.type === 'ADMIN_ACCESS_TOKEN'
            ? `admin_wallet_${payload?.wallet_address}`
            : `user_wallet_${payload?.wallet_address}`;
        socket.join(roomName);

        logger.debug(`User wallet ${payload?.wallet_address} joined room: ${roomName}`);
        this.server.emit('message', { success: true, walletAddress: payload?.wallet_address });
      } catch (error) {
        this.server.emit('message', { success: false, message: 'User not authorized' });
        logger.warn(`Token verification failed: ${error.message}`);
      }
    } else {
      this.server.emit('message', { success: false, message: 'User not authorized' });
      logger.warn(`No token provided`);
    }
  }

  handleDisconnect(client: Socket) {
    logger.debug(`Client disconnected: ${client.id}`);
    this.connectedUsersMap.delete(client.id);
  }

  @SubscribeMessage('ping')
  handleMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    logger.debug(`Message received from client id: ${client.id}`);
    logger.debug(`Payload: ${data}`);
    return {
      event: 'pong',
      data: 'Pong response from server',
    };
  }
}
