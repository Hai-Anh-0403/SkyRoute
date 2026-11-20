import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'traveler@skyroute.vn' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'securePassword123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt input limit
  password: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName: string;
}

export class LoginDto {
  @ApiProperty({ example: 'traveler@skyroute.vn' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  @MinLength(1)
  password: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn B' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({
    example: { interests: ['nature', 'hotpot'], budget: 'medium' },
  })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;
}
