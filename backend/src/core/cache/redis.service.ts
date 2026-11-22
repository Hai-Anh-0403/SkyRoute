import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

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

  async getJson<T>(key: string): Promise<T | null> {
    try {
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
      await this.client.setex(key, ttlSec, JSON.stringify(value));
    } catch (err) {
      this.logger.warn(
        `[Redis] setJson failed for ${key}: ${(err as Error).message}`,
      );
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(
        `[Redis] del failed for ${key}: ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
