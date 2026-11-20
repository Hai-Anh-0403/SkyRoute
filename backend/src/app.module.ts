import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import * as path from 'path';
import { DatabaseModule } from './core/database/database.module';
import { AuthModule } from './features/auth/auth.module';
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
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
