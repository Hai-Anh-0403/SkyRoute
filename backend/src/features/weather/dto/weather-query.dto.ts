import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class WeatherForecastQueryDto {
  @ApiPropertyOptional({ example: 'Da Lat' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '2026-12-01' })
  @IsOptional()
  @IsDateString()
  date?: string;

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
}
