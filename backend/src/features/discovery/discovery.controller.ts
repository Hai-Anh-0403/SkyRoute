import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../shared/decorators/public.decorator';
import {
  FilterPlacesDto,
  FoodRecommendationQueryDto,
  RadarQueryDto,
} from './dto/discovery-query.dto';
import { DiscoveryService } from './services/discovery.service';
import { FoodDiscoveryService } from './services/food-discovery.service';

@ApiTags('Discovery')
@Controller('places')
export class DiscoveryController {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly foodDiscoveryService: FoodDiscoveryService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List places with multi-layer context filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of places' })
  listPlaces(@Query() query: FilterPlacesDto) {
    return this.discoveryService.listPlaces(query);
  }

  @Public()
  @Get('radar')
  @ApiOperation({
    summary: 'Proximity Radar scan via PostGIS ST_DWithin (1km - 5km)',
  })
  @ApiResponse({ status: 200, description: 'Places within radar radius' })
  @ApiResponse({ status: 400, description: 'DISC_002 / DISC_003 invalid params' })
  scanRadar(@Query() query: RadarQueryDto) {
    return this.discoveryService.scanRadar(query);
  }

  @Public()
  @Get('food-recommendations')
  @ApiOperation({
    summary: 'Context-aware food discovery based on temperature and rain',
  })
  @ApiResponse({ status: 200, description: 'Weather-matched restaurants & cafes' })
  recommendFood(@Query() query: FoodRecommendationQueryDto) {
    return this.foodDiscoveryService.recommendFood(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get active place detail by ID' })
  @ApiResponse({ status: 200, description: 'Place details' })
  @ApiResponse({ status: 404, description: 'DISC_001 Place not found' })
  getPlaceById(@Param('id', ParseIntPipe) id: number) {
    return this.discoveryService.getPlaceById(String(id));
  }
}
