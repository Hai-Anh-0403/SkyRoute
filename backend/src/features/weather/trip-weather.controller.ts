import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthUserPayload,
  CurrentUser,
} from '../../shared/decorators/current-user.decorator';
import { TripOwnerGuard } from '../trips/guards/trip-owner.guard';
import { SyncTripWeatherDto } from './dto/weather-sync.dto';
import { WeatherConflictService } from './services/weather-conflict.service';

@ApiTags('Weather')
@ApiBearerAuth()
@Controller('trips')
export class TripWeatherController {
  constructor(
    private readonly weatherConflictService: WeatherConflictService,
  ) {}

  @Post(':id/weather-sync')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TripOwnerGuard)
  @ApiOperation({
    summary:
      'Sync hourly weather forecast onto trip timeline slots and flag rain conflicts',
  })
  @ApiResponse({ status: 200, description: 'Trip weather synchronized' })
  @ApiResponse({ status: 503, description: 'WTHR_001 Weather unavailable' })
  syncTripWeather(
    @CurrentUser() user: AuthUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto?: SyncTripWeatherDto,
  ) {
    return this.weatherConflictService.syncTripWeather(
      user.userId,
      String(id),
      dto,
    );
  }
}
