import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../shared/decorators/public.decorator';
import { WeatherForecastQueryDto } from './dto/weather-query.dto';
import { WeatherService } from './services/weather.service';

@ApiTags('Weather')
@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Public()
  @Get('forecast')
  @ApiOperation({
    summary:
      'Get hourly and 4-slot weather forecast (Redis 30m cache + Open-Meteo + DB fallback)',
  })
  @ApiResponse({ status: 200, description: 'Weather forecast by hour & slot' })
  @ApiResponse({ status: 503, description: 'WTHR_001 Weather unavailable' })
  getForecast(@Query() query: WeatherForecastQueryDto) {
    return this.weatherService.getForecast(query);
  }
}
