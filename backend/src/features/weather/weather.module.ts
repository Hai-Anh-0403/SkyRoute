import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpenMeteoClient } from '../../core/integrations/open-meteo.client';
import { TripsModule } from '../trips/trips.module';
import { WeatherSnapshot } from './entities/weather-snapshot.entity';
import { WeatherSnapshotRepository } from './repositories/weather-snapshot.repository';
import { WeatherConflictService } from './services/weather-conflict.service';
import { WeatherPollerService } from './services/weather-poller.service';
import { WeatherService } from './services/weather.service';
import { TripWeatherController } from './trip-weather.controller';
import { WeatherController } from './weather.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WeatherSnapshot]), TripsModule],
  controllers: [WeatherController, TripWeatherController],
  providers: [
    OpenMeteoClient,
    WeatherSnapshotRepository,
    WeatherService,
    WeatherPollerService,
    WeatherConflictService,
  ],
  exports: [WeatherService, WeatherConflictService],
})
export class WeatherModule {}
