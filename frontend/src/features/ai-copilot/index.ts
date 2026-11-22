export { AiPromptModal } from './components/AiPromptModal';
export {
  useApplyGeneratedItinerary,
  useGenerateItinerary,
} from './hooks/useGenerateItinerary';
export { aiCopilotService } from './services/ai-copilot.service';
export type {
  GeneratedItineraryResponse,
  GeneratedItinerarySlotItem,
  GeneratedSlotPlaceSummary,
  GeneratedSlotWeatherSummary,
  GenerateItineraryRequest,
} from './types/ai-copilot.types';
