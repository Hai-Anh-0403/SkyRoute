import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PlanBSwap } from '../entities/plan-b-swap.entity';

@Injectable()
export class PlanBSwapRepository {
  constructor(
    @InjectRepository(PlanBSwap)
    private readonly repo: Repository<PlanBSwap>,
  ) {}

  createAudit(
    data: {
      tripId: string;
      itineraryItemId: string;
      originalPlaceId: string;
      replacementPlaceId: string;
      rainProbabilityAtSwap: number;
      distanceFromPrevKm: number;
    },
    manager: EntityManager,
  ): Promise<PlanBSwap> {
    const repo = manager.getRepository(PlanBSwap);
    return repo.save(repo.create(data));
  }

  findByTrip(tripId: string): Promise<PlanBSwap[]> {
    return this.repo.find({
      where: { tripId },
      order: { createdAt: 'DESC' },
    });
  }

  findByTripWithDetails(tripId: string): Promise<PlanBSwap[]> {
    return this.repo.find({
      where: { tripId },
      relations: ['originalPlace', 'replacementPlace', 'itineraryItem'],
      order: { createdAt: 'DESC' },
    });
  }
}
