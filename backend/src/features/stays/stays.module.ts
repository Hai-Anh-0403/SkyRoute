import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripsModule } from '../trips/trips.module';
import { AdminStaysController } from './admin-stays.controller';
import { Stay } from './entities/stay.entity';
import { StayRepository } from './repositories/stay.repository';
import { StaysService } from './services/stays.service';
import { StaysController } from './stays.controller';
import { TripStaysController } from './trip-stays.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Stay]), TripsModule],
  controllers: [StaysController, TripStaysController, AdminStaysController],
  providers: [StayRepository, StaysService],
  exports: [StaysService],
})
export class StaysModule {}
