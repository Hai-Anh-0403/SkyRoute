import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GeoJsonPoint } from '../../discovery/entities/place.entity';

@Entity('stays')
@Index('idx_stays_city_price', ['city', 'pricePerNight'])
export class Stay {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ name: 'stay_type', type: 'varchar', length: 50 })
  stayType: 'hotel' | 'homestay' | 'resort';

  @Column({ name: 'price_per_night', type: 'numeric', precision: 12, scale: 2 })
  pricePerNight: number;

  @Column({ type: 'numeric', precision: 2, scale: 1, default: 4.0 })
  rating: number;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl: string | null;

  @Index('idx_stays_location', { spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: GeoJsonPoint;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  amenities: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
