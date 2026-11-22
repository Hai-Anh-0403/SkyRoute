import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

const mockClient = {
  status: 'wait' as string,
  connect: jest.fn(),
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  ttl: jest.fn(),
  ping: jest.fn(),
  quit: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
};

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => mockClient),
}));

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.status = 'wait';
    mockClient.connect.mockImplementation(async () => {
      mockClient.status = 'ready';
    });
    mockClient.quit.mockResolvedValue('OK');

    const config = {
      get: jest.fn((key: string, fallback?: unknown) => {
        if (key === 'REDIS_HOST') return 'localhost';
        if (key === 'REDIS_PORT') return 6379;
        return fallback;
      }),
    } as unknown as ConfigService;

    service = new RedisService(config);
  });

  it('connects on module init and reads/writes/deletes JSON keys cleanly', async () => {
    mockClient.setex.mockResolvedValue('OK');
    mockClient.get.mockResolvedValue(JSON.stringify({ lat: 11.94, lng: 108.45 }));
    mockClient.ttl.mockResolvedValue(3599);
    mockClient.del.mockResolvedValue(1);
    mockClient.ping.mockResolvedValue('PONG');

    await service.onModuleInit();
    await service.setJson('trip:centroid:1', { lat: 11.94, lng: 108.45 }, 3600);
    const cached = await service.getJson<{ lat: number; lng: number }>(
      'trip:centroid:1',
    );
    const ttl = await service.getTtl('trip:centroid:1');
    const healthy = await service.ping();
    await service.del('trip:centroid:1');

    expect(mockClient.connect).toHaveBeenCalledTimes(1);
    expect(mockClient.setex).toHaveBeenCalledWith(
      'trip:centroid:1',
      3600,
      JSON.stringify({ lat: 11.94, lng: 108.45 }),
    );
    expect(cached).toEqual({ lat: 11.94, lng: 108.45 });
    expect(ttl).toBe(3599);
    expect(healthy).toBe(true);
    expect(mockClient.del).toHaveBeenCalledWith('trip:centroid:1');
  });

  it('degrades gracefully without throwing when Redis connection fails', async () => {
    mockClient.connect.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(service.onModuleInit()).resolves.toBeUndefined();
    await expect(service.ping()).resolves.toBe(false);
    await expect(service.getJson('missing')).resolves.toBeNull();
    await expect(service.getTtl('missing')).resolves.toBe(-2);
    await expect(service.setJson('k', { ok: true }, 60)).resolves.toBeUndefined();
    await expect(service.del('k')).resolves.toBeUndefined();
  });
});
