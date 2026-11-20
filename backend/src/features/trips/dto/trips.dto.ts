import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TripStatusType } from '../types/trip.types';

export class CreateTripDto {
  @ApiProperty({ example: 'Đà Lạt 3N2Đ Chữa Lành' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Da Lat' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  destinationCity: string;

  @ApiProperty({ example: '2026-12-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-12-03' })
  @IsDateString()
  endDate: string;
}

export class UpdateTripDto {
  @ApiPropertyOptional({ example: 'Đà Lạt Mùa Sương' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 'Da Lat' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  destinationCity?: string;

  @ApiPropertyOptional({ example: '2026-12-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-04' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: ['draft', 'active', 'completed', 'archived'] })
  @IsOptional()
  @IsIn(['draft', 'active', 'completed', 'archived'])
  status?: TripStatusType;
}

export class ListTripsQueryDto {
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

  @ApiPropertyOptional({ enum: ['draft', 'active', 'completed', 'archived'] })
  @IsOptional()
  @IsIn(['draft', 'active', 'completed', 'archived'])
  status?: TripStatusType;
}

export class AddItineraryItemDto {
  @ApiPropertyOptional({ example: 42 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  placeId?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  stayId?: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  dayNumber: number;

  @ApiProperty({ example: 'morning', enum: ['morning', 'lunch', 'afternoon', 'dinner'] })
  @IsString()
  timeSlot: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({ example: 'Ăn trưa lẩu gà lá é' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class UpdateItineraryItemDto {
  @ApiPropertyOptional({ example: 88 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  placeId?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  stayId?: number;

  @ApiPropertyOptional({ example: 'Ghi chú mới' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
