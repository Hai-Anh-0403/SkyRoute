import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class GenerateItineraryDto {
  @ApiProperty({ example: 12, description: 'Owned Trip ID to populate' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tripId: number;

  @ApiProperty({
    example: 'Đà Lạt 3N2Đ thích săn mây, lẩu nướng, ngân sách vừa',
    minLength: 5,
    maxLength: 600,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(600)
  prompt: string;
}
