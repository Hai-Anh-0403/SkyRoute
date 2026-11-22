import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class SimulateRainDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dayNumber: number;

  @ApiProperty({
    example: 'afternoon',
    enum: ['morning', 'lunch', 'afternoon', 'dinner'],
  })
  @IsIn(['morning', 'lunch', 'afternoon', 'dinner'])
  timeSlot: 'morning' | 'lunch' | 'afternoon' | 'dinner';

  @ApiPropertyOptional({ example: 75, default: 75, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  rainProbability?: number = 75;
}

export class SyncTripWeatherDto {
  @ApiPropertyOptional({ type: SimulateRainDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SimulateRainDto)
  simulateRain?: SimulateRainDto;
}
