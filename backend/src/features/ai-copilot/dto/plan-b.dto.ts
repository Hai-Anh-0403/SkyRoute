import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class SwapPlanBDto {
  @ApiProperty({ example: 88 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  replacementPlaceId: number;

  @ApiPropertyOptional({
    example: 'Swapped due to 75% afternoon rain forecast',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
