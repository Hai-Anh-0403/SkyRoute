import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LlmToolClient } from '../../core/integrations/llm-tool.client';
import { AuthModule } from '../auth/auth.module';
import { DiscoveryModule } from '../discovery/discovery.module';
import { TripsModule } from '../trips/trips.module';
import { WeatherModule } from '../weather/weather.module';
import { AiCopilotController } from './ai-copilot.controller';
import { AiGenerateController } from './ai-generate.controller';
import { PlanBSwap } from './entities/plan-b-swap.entity';
import { PlanBSwapRepository } from './repositories/plan-b-swap.repository';
import { AiCopilotService } from './services/ai-copilot.service';
import { ContextualRankingService } from './services/contextual-ranking.service';
import { PlanBService } from './services/plan-b.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlanBSwap]),
    AuthModule,
    DiscoveryModule,
    TripsModule,
    WeatherModule,
  ],
  controllers: [AiCopilotController, AiGenerateController],
  providers: [
    LlmToolClient,
    PlanBSwapRepository,
    ContextualRankingService,
    PlanBService,
    AiCopilotService,
  ],
  exports: [PlanBService, ContextualRankingService, AiCopilotService],
})
export class AiCopilotModule {}
