import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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
import { ReorderItineraryDto } from './dto/reorder-itinerary.dto';
import {
  AddItineraryItemDto,
  CreateTripDto,
  ListTripsQueryDto,
  UpdateItineraryItemDto,
  UpdateTripDto,
} from './dto/trips.dto';
import { TripOwnerGuard } from './guards/trip-owner.guard';
import { TimelineService } from './services/timeline.service';
import { TripsService } from './services/trips.service';

@ApiTags('Trips')
@ApiBearerAuth()
@Controller('trips')
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly timelineService: TimelineService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List trips owned by the authenticated user' })
  listTrips(
    @CurrentUser() user: AuthUserPayload,
    @Query() query: ListTripsQueryDto,
  ) {
    return this.tripsService.listTrips(user.userId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new trip' })
  @ApiResponse({ status: 201, description: 'Trip created' })
  @ApiResponse({ status: 400, description: 'TRIP_002 Invalid trip date range' })
  createTrip(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: CreateTripDto,
  ) {
    return this.tripsService.createTrip(user.userId, dto);
  }

  @Get(':id')
  @UseGuards(TripOwnerGuard)
  @ApiOperation({ summary: 'Get trip detail with ordered 4-slot itinerary' })
  @ApiResponse({ status: 403, description: 'AUTH_004 Not trip owner' })
  @ApiResponse({ status: 404, description: 'TRIP_001 Trip not found' })
  getTripDetail(
    @CurrentUser() user: AuthUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tripsService.getTripDetail(user.userId, String(id));
  }

  @Patch(':id')
  @UseGuards(TripOwnerGuard)
  @ApiOperation({ summary: 'Update trip metadata or dates' })
  updateTrip(
    @CurrentUser() user: AuthUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTripDto,
  ) {
    return this.tripsService.updateTrip(user.userId, String(id), dto);
  }

  @Delete(':id')
  @UseGuards(TripOwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete trip and its itinerary items' })
  deleteTrip(
    @CurrentUser() user: AuthUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tripsService.deleteTrip(user.userId, String(id));
  }

  @Post(':id/items')
  @UseGuards(TripOwnerGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a place or stay to a trip timeline slot' })
  addItem(
    @CurrentUser() user: AuthUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddItineraryItemDto,
  ) {
    return this.tripsService.addItem(user.userId, String(id), dto);
  }

  @Patch(':id/items/reorder')
  @UseGuards(TripOwnerGuard)
  @ApiOperation({
    summary:
      'Atomically reorder timeline items and recalculate route detour & centroid',
  })
  reorderItems(
    @CurrentUser() user: AuthUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReorderItineraryDto,
  ) {
    return this.timelineService.reorderItems(user.userId, String(id), dto);
  }

  @Patch(':id/items/:itemId')
  @UseGuards(TripOwnerGuard)
  @ApiOperation({ summary: 'Update itinerary item note or place/stay' })
  updateItem(
    @CurrentUser() user: AuthUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateItineraryItemDto,
  ) {
    return this.tripsService.updateItem(
      user.userId,
      String(id),
      String(itemId),
      dto,
    );
  }

  @Delete(':id/items/:itemId')
  @UseGuards(TripOwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an item from the trip timeline' })
  deleteItem(
    @CurrentUser() user: AuthUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.tripsService.deleteItem(
      user.userId,
      String(id),
      String(itemId),
    );
  }
}
