import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscoveryModule } from '../discovery/discovery.module';
import { Stay } from '../stays/entities/stay.entity';
import { ItineraryItem } from './entities/itinerary-item.entity';
import { Trip } from './entities/trip.entity';
import { TripOwnerGuard } from './guards/trip-owner.guard';
import { ItineraryItemRepository } from './repositories/itinerary-item.repository';
import { TripRepository } from './repositories/trip.repository';
import { TimelineService } from './services/timeline.service';
import { TripsService } from './services/trips.service';
import { TripsController } from './trips.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, ItineraryItem, Stay]),
    DiscoveryModule,
  ],
  controllers: [TripsController],
  providers: [
    TripRepository,
    ItineraryItemRepository,
    TripsService,
    TimelineService,
    TripOwnerGuard,
  ],
  exports: [
    TripsService,
    TimelineService,
    TripRepository,
    ItineraryItemRepository,
    TripOwnerGuard,
  ],
})
export class TripsModule {}
