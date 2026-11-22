import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerModule } from '@nestjs/throttler';
import * as path from 'path';
import { envValidationSchema } from './config/env.validation';
import { RedisModule } from './core/cache/redis.module';
import { DatabaseModule } from './core/database/database.module';
import { AiCopilotModule } from './features/ai-copilot/ai-copilot.module';
import { AuthModule } from './features/auth/auth.module';
import { DiscoveryModule } from './features/discovery/discovery.module';
import { StaysModule } from './features/stays/stays.module';
import { TripsModule } from './features/trips/trips.module';
import { WeatherModule } from './features/weather/weather.module';
import { Public } from './shared/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Check SkyRoute API health status' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check() {
    return { status: 'ok', service: 'skyroute-backend' };
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
