import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Place } from '../../discovery/entities/place.entity';
import { Stay } from '../../stays/entities/stay.entity';
import { Trip } from './trip.entity';

@Entity('itinerary_items')
@Index('idx_itinerary_items_trip_day_slot', [
  'tripId',
  'dayNumber',
  'timeSlot',
  'orderIndex',
])
export class ItineraryItem {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'trip_id', type: 'bigint' })
  tripId: string;

  @ManyToOne(() => Trip, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ name: 'place_id', type: 'bigint', nullable: true })
  placeId: string | null;

  @ManyToOne(() => Place, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'place_id' })
  place: Place | null;

  @Column({ name: 'stay_id', type: 'bigint', nullable: true })
  stayId: string | null;

  @ManyToOne(() => Stay, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'stay_id' })
  stay: Stay | null;

  @Column({ name: 'day_number', type: 'smallint' })
  dayNumber: number;

  @Column({ name: 'time_slot', type: 'varchar', length: 20 })
  timeSlot: 'morning' | 'lunch' | 'afternoon' | 'dinner';

  @Column({ name: 'order_index', type: 'smallint' })
  orderIndex: number;

  @Column({
    name: 'distance_from_prev_km',
    type: 'numeric',
    precision: 6,
    scale: 2,
    default: 0,
  })
  distanceFromPrevKm: number;

  @Column({ name: 'is_detour_warning', type: 'boolean', default: false })
  isDetourWarning: boolean;

  @Column({
    name: 'weather_condition',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  weatherCondition: string | null;

  @Column({
    name: 'temperature_c',
    type: 'numeric',
    precision: 4,
    scale: 1,
    nullable: true,
  })
  temperatureC: number | null;

  @Column({ name: 'rain_probability', type: 'smallint', nullable: true })
  rainProbability: number | null;

  @Column({ name: 'weather_alert_flag', type: 'boolean', default: false })
  weatherAlertFlag: boolean;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
