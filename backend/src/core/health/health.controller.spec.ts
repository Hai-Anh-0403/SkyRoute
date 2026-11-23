import { HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthController } from '../../app.module';
import { DomainException } from '../../shared/exceptions/domain.exception';
import { RedisService } from '../cache/redis.service';

describe('HealthController', () => {
  it('returns liveness payload on /health', () => {
    const controller = new HealthController();
    expect(controller.check()).toEqual({
      status: 'ok',
      service: 'skyroute-backend',
    });
  });

  it('returns 200 readiness when both PostgreSQL and Redis respond', async () => {
    const dataSource = {
      isInitialized: true,
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as DataSource;
    const redis = {
      ping: jest.fn().mockResolvedValue(true),
    } as unknown as RedisService;

    const controller = new HealthController(dataSource, redis);
    const result = await controller.ready();

    expect(result.status).toBe('ready');
    expect(result.checks.database.status).toBe('up');
    expect(result.checks.redis.status).toBe('up');
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
    expect(redis.ping).toHaveBeenCalledTimes(1);
  });

  it('throws 503 DomainException when PostgreSQL query fails or Redis ping fails', async () => {
    const failingDb = {
      isInitialized: true,
      query: jest.fn().mockRejectedValue(new Error('DB connection lost')),
    } as unknown as DataSource;
    const okRedis = {
      ping: jest.fn().mockResolvedValue(true),
    } as unknown as RedisService;

    const dbDownController = new HealthController(failingDb, okRedis);
    await expect(dbDownController.ready()).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
    });

    const okDb = {
      isInitialized: true,
      query: jest.fn().mockResolvedValue([]),
    } as unknown as DataSource;
    const failingRedis = {
      ping: jest.fn().mockResolvedValue(false),
    } as unknown as RedisService;

    const redisDownController = new HealthController(okDb, failingRedis);
    try {
      await redisDownController.ready();
      fail('Expected DomainException');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainException);
      expect((err as DomainException).getStatus()).toBe(
        HttpStatus.SERVICE_UNAVAILABLE,
      );
      const response = (err as DomainException).getResponse() as {
        details: { checks: { database: { status: string }; redis: { status: string } } };
      };
      expect(response.details.checks.database.status).toBe('up');
      expect(response.details.checks.redis.status).toBe('down');
    }
  });
});
