import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private connectPromise: Promise<boolean> | null = null;

  constructor(config: ConfigService) {
    const password = config.get<string>('REDIS_PASSWORD');
    this.client = new Redis({
      host: config.get<string>('REDIS_HOST', 'localhost'),
      port: Number(config.get<number>('REDIS_PORT', 6379)),
      ...(password ? { password } : {}),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => (times <= 2 ? 200 : null),
    });

    this.client.on('error', (err) => {
      this.logger.warn(`[Redis] connection warning: ${err.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureConnected();
  }

  private async ensureConnected(): Promise<boolean> {
    const status = this.client.status;
    if (status === 'ready') {
      return true;
    }
    if (status === 'end') {
      return false;
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }

    // With lazyConnect + enableOfflineQueue=false, commands fail immediately until connect() opens the socket.
    this.connectPromise = this.client
      .connect()
      .then(() => true)
      .catch((err: Error) => {
        this.logger.warn(`[Redis] connect failed: ${err.message}`);
        return false;
      })
      .finally(() => {
        this.connectPromise = null;
      });

    return this.connectPromise;
  }

  async ping(): Promise<boolean> {
    try {
      if (!(await this.ensureConnected())) {
        return false;
      }
      const res = await this.client.ping();
      return res === 'PONG';
    } catch (err) {
      this.logger.warn(`[Redis] ping failed: ${(err as Error).message}`);
      return false;
    }
  }

  async getTtl(key: string): Promise<number> {
    try {
      if (!(await this.ensureConnected())) {
        return -2;
      }
      return await this.client.ttl(key);
    } catch (err) {
      this.logger.warn(
        `[Redis] getTtl failed for ${key}: ${(err as Error).message}`,
      );
      return -2;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      if (!(await this.ensureConnected())) {
        return null;
      }
      const raw = await this.client.get(key);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(
        `[Redis] getJson failed for ${key}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSec: number): Promise<void> {
    try {
      if (!(await this.ensureConnected())) {
        return;
      }
      await this.client.setex(key, ttlSec, JSON.stringify(value));
    } catch (err) {
      this.logger.warn(
        `[Redis] setJson failed for ${key}: ${(err as Error).message}`,
      );
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (!(await this.ensureConnected())) {
        return;
      }
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(
        `[Redis] del failed for ${key}: ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (
        this.client.status === 'ready' ||
        this.client.status === 'connecting' ||
        this.client.status === 'connect'
      ) {
        await this.client.quit();
      } else {
        this.client.disconnect();
      }
    } catch {
      this.client.disconnect();
    }
  }
}
