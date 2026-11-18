import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('weather_snapshots')
@Index(
  'uq_weather_snapshots_city_date_slot',
  ['city', 'forecastDate', 'timeSlot'],
  { unique: true },
)
export class WeatherSnapshot {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ name: 'forecast_date', type: 'date' })
  forecastDate: string;

  @Column({ name: 'time_slot', type: 'varchar', length: 20 })
  timeSlot: 'morning' | 'lunch' | 'afternoon' | 'dinner';

  @Column({ name: 'temperature_c', type: 'numeric', precision: 4, scale: 1 })
  temperatureC: number;

  @Column({ name: 'rain_probability', type: 'smallint' })
  rainProbability: number;

  @Column({ name: 'weather_code', type: 'smallint' })
  weatherCode: number;

  @Column({ name: 'condition_tag', type: 'varchar', length: 50 })
  conditionTag: string;

  @CreateDateColumn({ name: 'fetched_at', type: 'timestamptz' })
  fetchedAt: Date;
}
