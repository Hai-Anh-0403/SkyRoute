import { apiClient } from '@/shared/lib/axios';
import type { ApiResponse } from '@/shared/types/api.types';
import type {
  GeneratedItineraryResponse,
  GenerateItineraryRequest,
} from '../types/ai-copilot.types';

export const aiCopilotService = {
  async generateItinerary(
    payload: GenerateItineraryRequest,
  ): Promise<GeneratedItineraryResponse> {
    const res = await apiClient.post<ApiResponse<GeneratedItineraryResponse>>(
      '/ai/generate-itinerary',
      payload,
    );
    return res.data.data;
  },
};
