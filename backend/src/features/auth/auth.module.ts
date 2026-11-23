import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from './entities/user.entity';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { UserRepository } from './repositories/user.repository';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserRepository,
    RefreshTokenRepository,
    JwtStrategy,
    // Order matters: JwtAuthGuard populates request.user before RolesGuard checks @Roles().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
