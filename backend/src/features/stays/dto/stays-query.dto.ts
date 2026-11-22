import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { StayType } from '../types/stay.types';

export class FilterStaysDto {
  @ApiPropertyOptional({ example: 'Da Lat' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: ['hotel', 'homestay', 'resort'] })
  @IsOptional()
  @IsIn(['hotel', 'homestay', 'resort'])
  stay_type?: StayType;

  @ApiPropertyOptional({ example: 300000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_price?: number;

  @ApiPropertyOptional({ example: 1500000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max_price?: number;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 12, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 12;

  @ApiPropertyOptional({
    enum: ['price_per_night', 'rating'],
    default: 'rating',
  })
  @IsOptional()
  @IsIn(['price_per_night', 'rating'])
  sort?: 'price_per_night' | 'rating' = 'rating';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}

export class CentroidStaysQueryDto {
  @ApiPropertyOptional({ enum: ['hotel', 'homestay', 'resort'] })
  @IsOptional()
  @IsIn(['hotel', 'homestay', 'resort'])
  stay_type?: StayType;

  @ApiPropertyOptional({ example: 300000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_price?: number;

  @ApiPropertyOptional({ example: 2000000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max_price?: number;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 10;
}
