import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
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
import { GenerateItineraryDto } from './dto/generate-itinerary.dto';
import { AiCopilotService } from './services/ai-copilot.service';

@ApiTags('AI Copilot')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(ThrottlerGuard)
export class AiGenerateController {
  constructor(private readonly aiCopilotService: AiCopilotService) {}

  @Post('generate-itinerary')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Generate a weather-adaptive multi-day itinerary grounded 100% in PostGIS places via tool calling',
  })
  @ApiResponse({ status: 200, description: 'Grounded itinerary proposal' })
  @ApiResponse({ status: 403, description: 'AUTH_004 Not trip owner' })
  @ApiResponse({ status: 404, description: 'TRIP_001 Trip not found' })
  @ApiResponse({ status: 504, description: 'AI_002 LLM provider timed out' })
  generateItinerary(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: GenerateItineraryDto,
  ) {
    return this.aiCopilotService.generateItinerary(user.userId, dto);
  }
}
