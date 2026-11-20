import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscoveryController } from './discovery.controller';
import { Place } from './entities/place.entity';
import { PlaceRepository } from './repositories/place.repository';
import { DiscoveryService } from './services/discovery.service';
import { FoodDiscoveryService } from './services/food-discovery.service';

@Module({
  imports: [TypeOrmModule.forFeature([Place])],
  controllers: [DiscoveryController],
  providers: [PlaceRepository, DiscoveryService, FoodDiscoveryService],
  exports: [DiscoveryService, FoodDiscoveryService],
})
export class DiscoveryModule {}
