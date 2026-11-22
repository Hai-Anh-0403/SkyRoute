import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpenMeteoClient } from '../../core/integrations/open-meteo.client';
import { WeatherSnapshot } from './entities/weather-snapshot.entity';
import { WeatherSnapshotRepository } from './repositories/weather-snapshot.repository';
import { WeatherPollerService } from './services/weather-poller.service';
import { WeatherService } from './services/weather.service';
import { WeatherController } from './weather.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WeatherSnapshot])],
  controllers: [WeatherController],
  providers: [
    OpenMeteoClient,
    WeatherSnapshotRepository,
    WeatherService,
    WeatherPollerService,
  ],
  exports: [WeatherService],
})
export class WeatherModule {}
