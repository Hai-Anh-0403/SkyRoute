import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PlaceCategory } from '../types/discovery.types';

export class PlaceLocationDto {
  @ApiProperty({ example: 11.9404 })
  @Type(() => Number)
  @IsLatitude()
  lat: number;

  @ApiProperty({ example: 108.4583 })
  @Type(() => Number)
  @IsLongitude()
  lng: number;
}

export class CreatePlaceDto {
  @ApiProperty({ example: 'Thác Datanla' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Da Lat' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiProperty({ enum: ['attraction', 'restaurant', 'cafe'] })
  @IsIn(['attraction', 'restaurant', 'cafe'])
  category: PlaceCategory;

  @ApiPropertyOptional({ example: 'nature' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  subcategory?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isOutdoor: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  hasAc?: boolean;

  @ApiProperty({ example: ['rainy', 'cloudy'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  suitableWeather: string[];

  @ApiPropertyOptional({ example: 2, minimum: 1, maximum: 3, default: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  priceLevel?: number;

  @ApiPropertyOptional({ example: 4.5, minimum: 0, maximum: 5, default: 4.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ example: 'QL20 Đèo Prenn, Phường 3, Đà Lạt' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Điểm tham quan nổi bật tại Đà Lạt.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/place.jpg' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiProperty({ type: PlaceLocationDto })
  @ValidateNested()
  @Type(() => PlaceLocationDto)
  location: PlaceLocationDto;
}

export class UpdatePlaceDto {
  @ApiPropertyOptional({ example: 'Thác Datanla Mới' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Da Lat' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ enum: ['attraction', 'restaurant', 'cafe'] })
  @IsOptional()
  @IsIn(['attraction', 'restaurant', 'cafe'])
  category?: PlaceCategory;

  @ApiPropertyOptional({ example: 'museum' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  subcategory?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isOutdoor?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  hasAc?: boolean;

  @ApiPropertyOptional({ example: ['rainy', 'cold'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  suitableWeather?: string[];

  @ApiPropertyOptional({ example: 2, minimum: 1, maximum: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  priceLevel?: number;

  @ApiPropertyOptional({ example: 4.7, minimum: 0, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ type: PlaceLocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PlaceLocationDto)
  location?: PlaceLocationDto;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
