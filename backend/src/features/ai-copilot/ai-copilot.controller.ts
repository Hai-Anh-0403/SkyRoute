import {
  Body,
  Controller,
  Get,
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
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  AuthUserPayload,
  CurrentUser,
} from '../../shared/decorators/current-user.decorator';
import { TripOwnerGuard } from '../trips/guards/trip-owner.guard';
import { SwapPlanBDto } from './dto/plan-b.dto';
import { PlanBService } from './services/plan-b.service';

@ApiTags('AI Copilot')
@ApiBearerAuth()
@Controller('trips')
@UseGuards(ThrottlerGuard)
export class AiCopilotController {
  constructor(private readonly planBService: PlanBService) {}

  @Get(':id/plan-b-history')
  @UseGuards(TripOwnerGuard)
  @ApiOperation({
    summary: 'List Plan B weather fallback swap history for an owned trip',
  })
  @ApiResponse({ status: 200, description: 'Plan B swap audit history' })
  getPlanBHistory(
    @CurrentUser() user: AuthUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.planBService.getPlanBHistory(user.userId, String(id));
  }

  @Get(':id/items/:itemId/plan-b-candidates')
  @UseGuards(TripOwnerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Get 2-3 grounded indoor Plan B alternatives within 3km for a weather-conflicted slot',
  })
  @ApiResponse({ status: 200, description: 'Ranked indoor candidates' })
  @ApiResponse({ status: 422, description: 'AI_001 No indoor candidate within 3km' })
  getPlanBCandidates(
    @CurrentUser() user: AuthUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.planBService.getPlanBCandidates(
      user.userId,
      String(id),
      String(itemId),
    );
  }

  @Post(':id/items/:itemId/swap-plan-b')
  @UseGuards(TripOwnerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Atomically swap a conflicted outdoor item to a grounded indoor Plan B place',
  })
  @ApiResponse({ status: 200, description: 'Plan B swap completed' })
  @ApiResponse({ status: 422, description: 'AI_001 Replacement invalid or outside 3km' })
  swapPlanB(
    @CurrentUser() user: AuthUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: SwapPlanBDto,
  ) {
    return this.planBService.swapPlanB(
      user.userId,
      String(id),
      String(itemId),
      dto,
    );
  }
}
