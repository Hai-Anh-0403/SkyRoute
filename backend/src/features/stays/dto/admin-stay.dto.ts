import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
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
import { StayType } from '../types/stay.types';

export class StayLocationDto {
  @ApiProperty({ example: 11.9404 })
  @Type(() => Number)
  @IsLatitude()
  lat: number;

  @ApiProperty({ example: 108.4583 })
  @Type(() => Number)
  @IsLongitude()
  lng: number;
}

export class CreateStayDto {
  @ApiProperty({ example: 'Dalat Boutique Homestay' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Da Lat' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiProperty({ enum: ['hotel', 'homestay', 'resort'] })
  @IsIn(['hotel', 'homestay', 'resort'])
  stayType: StayType;

  @ApiProperty({ example: 850000, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerNight: number;

  @ApiPropertyOptional({ example: 4.5, minimum: 0, maximum: 5, default: 4.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ example: '12 Trần Phú, Đà Lạt' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'https://example.com/stay.jpg' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: ['wifi', 'heater', 'breakfast'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiProperty({ type: StayLocationDto })
  @ValidateNested()
  @Type(() => StayLocationDto)
  location: StayLocationDto;
}

export class UpdateStayDto {
  @ApiPropertyOptional({ example: 'Dalat Boutique Villas' })
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

  @ApiPropertyOptional({ enum: ['hotel', 'homestay', 'resort'] })
  @IsOptional()
  @IsIn(['hotel', 'homestay', 'resort'])
  stayType?: StayType;

  @ApiPropertyOptional({ example: 950000, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerNight?: number;

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
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: ['wifi', 'parking'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({ type: StayLocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StayLocationDto)
  location?: StayLocationDto;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
