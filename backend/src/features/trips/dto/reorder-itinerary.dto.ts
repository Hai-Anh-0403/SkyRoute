import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReorderItemEntryDto {
  @ApiProperty({ example: 101 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  itemId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  dayNumber: number;

  @ApiProperty({
    example: 'morning',
    enum: ['morning', 'lunch', 'afternoon', 'dinner'],
  })
  @IsString()
  timeSlot: string;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex: number;
}

export class ReorderItineraryDto {
  @ApiProperty({ type: [ReorderItemEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderItemEntryDto)
  items: ReorderItemEntryDto[];
}
