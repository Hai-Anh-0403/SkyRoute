import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import * as path from 'path';
import { DatabaseModule } from './core/database/database.module';

@Controller('health')
export class HealthController {
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
    DatabaseModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
  ],
  controllers: [HealthController],
})
export class AppModule {}
