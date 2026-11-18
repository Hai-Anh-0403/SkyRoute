import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

@Entity('places')
@Index('idx_places_city_category_outdoor', ['city', 'category', 'isOutdoor'])
export class Place {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 50 })
  category: 'attraction' | 'restaurant' | 'cafe';

  @Column({ type: 'varchar', length: 50, nullable: true })
  subcategory: string | null;

  @Column({ name: 'is_outdoor', type: 'boolean', default: true })
  isOutdoor: boolean;

  @Column({ name: 'has_ac', type: 'boolean', default: false })
  hasAc: boolean;

  @Column({
    name: 'suitable_weather',
    type: 'varchar',
    length: 50,
    array: true,
    default: () => "'{}'",
  })
  suitableWeather: string[];

  @Column({ name: 'price_level', type: 'smallint', default: 2 })
  priceLevel: number;

  @Column({ type: 'numeric', precision: 2, scale: 1, default: 4.0 })
  rating: number;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl: string | null;

  @Index('idx_places_location', { spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: GeoJsonPoint;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
