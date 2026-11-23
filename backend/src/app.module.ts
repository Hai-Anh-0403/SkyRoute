import {
  Controller,
  Get,
  HttpStatus,
  Module,
  Optional,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerModule } from '@nestjs/throttler';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { envValidationSchema } from './config/env.validation';
import { RedisModule } from './core/cache/redis.module';
import { RedisService } from './core/cache/redis.service';
import { DatabaseModule } from './core/database/database.module';
import { AiCopilotModule } from './features/ai-copilot/ai-copilot.module';
import { AuthModule } from './features/auth/auth.module';
import { DiscoveryModule } from './features/discovery/discovery.module';
import { StaysModule } from './features/stays/stays.module';
import { TripsModule } from './features/trips/trips.module';
import { WeatherModule } from './features/weather/weather.module';
import { Public } from './shared/decorators/public.decorator';
import { DomainException } from './shared/exceptions/domain.exception';

interface DependencyCheckResult {
  status: 'up' | 'down';
  latencyMs: number;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @Optional() private readonly dataSource?: DataSource,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Check SkyRoute API liveness status' })
  @ApiResponse({ status: 200, description: 'Service is live' })
  check() {
    return { status: 'ok', service: 'skyroute-backend' };
  }

  @Public()
  @Get('ready')
  @ApiOperation({
    summary: 'Deep readiness probe checking PostgreSQL/PostGIS and Redis',
  })
  @ApiResponse({ status: 200, description: 'All dependencies are ready' })
  @ApiResponse({
    status: 503,
    description: 'Database or Redis dependency is unavailable',
  })
  async ready() {
    const [database, redis] = await Promise.all([
      this.probeDatabase(),
      this.probeRedis(),
    ]);

    const checks = { database, redis };
    if (database.status !== 'up' || redis.status !== 'up') {
      throw new DomainException(
        'SYS_001',
        'Service dependencies are not ready',
        HttpStatus.SERVICE_UNAVAILABLE,
        { checks },
      );
    }

    return {
      status: 'ready',
      service: 'skyroute-backend',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  private async probeDatabase(): Promise<DependencyCheckResult> {
    const startedAt = Date.now();
    try {
      if (!this.dataSource?.isInitialized) {
        return { status: 'down', latencyMs: Date.now() - startedAt };
      }
      await this.dataSource.query('SELECT 1');
      return { status: 'up', latencyMs: Date.now() - startedAt };
    } catch {
      return { status: 'down', latencyMs: Date.now() - startedAt };
    }
  }

  private async probeRedis(): Promise<DependencyCheckResult> {
    const startedAt = Date.now();
    try {
      const ok = (await this.redisService?.ping()) ?? false;
      return {
        status: ok ? 'up' : 'down',
        latencyMs: Date.now() - startedAt,
      };
    } catch {
      return { status: 'down', latencyMs: Date.now() - startedAt };
    }
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [path.resolve(process.cwd(), '../.env'), '.env'],
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    RedisModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    AuthModule,
    DiscoveryModule,
    StaysModule,
    TripsModule,
    WeatherModule,
    AiCopilotModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
