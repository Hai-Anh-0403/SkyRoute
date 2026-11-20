import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CookieOptions, Request, Response } from 'express';
import {
  AuthUserPayload,
  CurrentUser,
} from '../../shared/decorators/current-user.decorator';
import { Public } from '../../shared/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';
import { ClientMeta, IssuedSession } from './types/auth.types';

export const REFRESH_COOKIE_NAME = 'skyroute_rt';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a new account' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.register(dto, this.clientMeta(req));
    return this.respondWithSession(res, session);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login and receive access token + refresh cookie' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.login(dto, this.clientMeta(req));
    return this.respondWithSession(res, session);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh cookie and issue a new access token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.refresh(
      req.cookies?.[REFRESH_COOKIE_NAME],
      this.clientMeta(req),
    );
    return this.respondWithSession(res, session);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the current refresh token' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE_NAME]);
    res.clearCookie(REFRESH_COOKIE_NAME, this.cookieOptions());
    return { loggedOut: true };
  }

  @ApiBearerAuth()
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all refresh tokens across devices' })
  async logoutAll(
    @CurrentUser() user: AuthUserPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logoutAll(user.userId);
    res.clearCookie(REFRESH_COOKIE_NAME, this.cookieOptions());
    return { loggedOut: true };
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  me(@CurrentUser() user: AuthUserPayload) {
    return this.auth.getProfile(user.userId);
  }

  @ApiBearerAuth()
  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile & travel preferences' })
  updateMe(@CurrentUser() user: AuthUserPayload, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.userId, dto);
  }

  /** Sets the httpOnly refresh cookie; the raw refresh token never appears in the JSON body. */
  private respondWithSession(res: Response, session: IssuedSession) {
    res.cookie(REFRESH_COOKIE_NAME, session.refreshToken, {
      ...this.cookieOptions(),
      expires: session.refreshExpiresAt,
    });
    return { user: session.user, accessToken: session.accessToken };
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
    };
  }

  private clientMeta(req: Request): ClientMeta {
    return {
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    };
  }
}
