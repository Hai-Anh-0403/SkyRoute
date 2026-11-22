import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import * as path from 'path';
import { RedisModule } from './core/cache/redis.module';
import { DatabaseModule } from './core/database/database.module';
import { AuthModule } from './features/auth/auth.module';
import { DiscoveryModule } from './features/discovery/discovery.module';
import { TripsModule } from './features/trips/trips.module';
import { WeatherModule } from './features/weather/weather.module';
import { Public } from './shared/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok', service: 'skyroute-backend' };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [path.resolve(process.cwd(), '../.env'), '.env'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    RedisModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    AuthModule,
    DiscoveryModule,
    TripsModule,
    WeatherModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
