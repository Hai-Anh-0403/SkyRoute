import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
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
import { CentroidStaysQueryDto } from './dto/stays-query.dto';
import { StaysService } from './services/stays.service';

@ApiTags('Stays')
@ApiBearerAuth()
@Controller('trips')
export class TripStaysController {
  constructor(private readonly staysService: StaysService) {}

  @Get(':tripId/centroid-stays')
  @UseGuards(TripOwnerGuard)
  @ApiOperation({
    summary:
      'Find stays nearest to the trip geometric centroid via PostGIS KNN (<->)',
  })
  @ApiResponse({
    status: 200,
    description: 'Centroid coordinates and nearest recommended stays',
  })
  @ApiResponse({ status: 403, description: 'AUTH_004 Not trip owner' })
  @ApiResponse({ status: 404, description: 'TRIP_001 Trip not found' })
  @ApiResponse({
    status: 422,
    description: 'STAY_002 Trip has no selected places for centroid calculation',
  })
  findNearestToTripCentroid(
    @CurrentUser() user: AuthUserPayload,
    @Param('tripId', ParseIntPipe) tripId: number,
    @Query() query: CentroidStaysQueryDto,
  ) {
    return this.staysService.findNearestToTripCentroid(
      user.userId,
      String(tripId),
      query,
    );
  }
}
