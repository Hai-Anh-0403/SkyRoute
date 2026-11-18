import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Place } from '../../discovery/entities/place.entity';
import { ItineraryItem } from '../../trips/entities/itinerary-item.entity';
import { Trip } from '../../trips/entities/trip.entity';

@Entity('plan_b_swaps')
@Index('idx_plan_b_swaps_trip_created', ['tripId', 'createdAt'])
@Index('idx_plan_b_swaps_item', ['itineraryItemId'])
export class PlanBSwap {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'trip_id', type: 'bigint' })
  tripId: string;

  @ManyToOne(() => Trip, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ name: 'itinerary_item_id', type: 'bigint' })
  itineraryItemId: string;

  @ManyToOne(() => ItineraryItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'itinerary_item_id' })
  itineraryItem: ItineraryItem;

  @Column({ name: 'original_place_id', type: 'bigint' })
  originalPlaceId: string;

  @ManyToOne(() => Place, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'original_place_id' })
  originalPlace: Place;

  @Column({ name: 'replacement_place_id', type: 'bigint' })
  replacementPlaceId: string;

  @ManyToOne(() => Place, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'replacement_place_id' })
  replacementPlace: Place;

  @Column({ name: 'rain_probability_at_swap', type: 'smallint' })
  rainProbabilityAtSwap: number;

  @Column({
    name: 'distance_from_prev_km',
    type: 'numeric',
    precision: 6,
    scale: 2,
  })
  distanceFromPrevKm: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
