import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PlaceCategory } from '../types/discovery.types';

function parseBooleanQuery({ value }: { value: unknown }): unknown {
  if (value === 'true' || value === true) {
    return true;
  }
  if (value === 'false' || value === false) {
    return false;
  }
  return value;
}

export class FilterPlacesDto {
  @ApiPropertyOptional({ example: 'Da Lat' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: ['attraction', 'restaurant', 'cafe'] })
  @IsOptional()
  @IsIn(['attraction', 'restaurant', 'cafe'])
  category?: PlaceCategory;

  @ApiPropertyOptional({
    example: 'hotpot,bbq',
    description: 'Comma-separated subcategories',
  })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(parseBooleanQuery)
  @IsBoolean()
  is_outdoor?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(parseBooleanQuery)
  @IsBoolean()
  has_ac?: boolean;

  @ApiPropertyOptional({ example: 'rainy' })
  @IsOptional()
  @IsString()
  weather_tag?: string;

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
    enum: ['rating', 'price_level', 'created_at'],
    default: 'rating',
  })
  @IsOptional()
  @IsIn(['rating', 'price_level', 'created_at'])
  sort?: 'rating' | 'price_level' | 'created_at' = 'rating';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}

export class RadarQueryDto {
  @ApiProperty({ example: 11.9404 })
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 108.4583 })
  @Type(() => Number)
  @IsNumber()
  lng: number;

  @ApiPropertyOptional({ default: 3, description: 'Radius in km (1 to 5)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radius_km?: number = 3;

  @ApiPropertyOptional({ example: 'Da Lat' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: ['attraction', 'restaurant', 'cafe'] })
  @IsOptional()
  @IsIn(['attraction', 'restaurant', 'cafe'])
  category?: PlaceCategory;

  @ApiPropertyOptional({ example: 'hotpot,bbq' })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(parseBooleanQuery)
  @IsBoolean()
  is_outdoor?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(parseBooleanQuery)
  @IsBoolean()
  has_ac?: boolean;

  @ApiPropertyOptional({ example: 'rainy' })
  @IsOptional()
  @IsString()
  weather_tag?: string;

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

  @ApiPropertyOptional({ enum: ['distance', 'rating'], default: 'distance' })
  @IsOptional()
  @IsIn(['distance', 'rating'])
  sort?: 'distance' | 'rating' = 'distance';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'asc';
}

export class FoodRecommendationQueryDto {
  @ApiPropertyOptional({ example: 'Da Lat' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 11.9404 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 108.4583 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ example: 17.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  temperature_c?: number;

  @ApiPropertyOptional({ example: 75, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  rain_probability?: number;

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
}
