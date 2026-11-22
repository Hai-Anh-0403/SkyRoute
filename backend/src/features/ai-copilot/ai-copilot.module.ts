import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LlmToolClient } from '../../core/integrations/llm-tool.client';
import { DiscoveryModule } from '../discovery/discovery.module';
import { TripsModule } from '../trips/trips.module';
import { AiCopilotController } from './ai-copilot.controller';
import { PlanBSwap } from './entities/plan-b-swap.entity';
import { PlanBSwapRepository } from './repositories/plan-b-swap.repository';
import { ContextualRankingService } from './services/contextual-ranking.service';
import { PlanBService } from './services/plan-b.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlanBSwap]),
    DiscoveryModule,
    TripsModule,
  ],
  controllers: [AiCopilotController],
  providers: [
    LlmToolClient,
    PlanBSwapRepository,
    ContextualRankingService,
    PlanBService,
  ],
  exports: [PlanBService, ContextualRankingService],
})
export class AiCopilotModule {}
