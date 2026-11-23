import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPlacesController } from './admin-places.controller';
import { DiscoveryController } from './discovery.controller';
import { Place } from './entities/place.entity';
import { PlaceRepository } from './repositories/place.repository';
import { DiscoveryService } from './services/discovery.service';
import { FoodDiscoveryService } from './services/food-discovery.service';

@Module({
  imports: [TypeOrmModule.forFeature([Place])],
  controllers: [DiscoveryController, AdminPlacesController],
  providers: [PlaceRepository, DiscoveryService, FoodDiscoveryService],
  exports: [DiscoveryService, FoodDiscoveryService],
})
export class DiscoveryModule {}
