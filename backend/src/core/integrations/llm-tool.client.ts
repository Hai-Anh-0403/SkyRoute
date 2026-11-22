import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

export interface PlanBCandidatePromptItem {
  placeId: number;
  name: string;
  subcategory: string | null;
  distanceFromPrevKm: number;
  rating: number;
}

const DEFAULT_AI_MODEL = 'gemini-3.8-flash';
const LLM_TIMEOUT_MS = 8000;

@Injectable()
export class LlmToolClient {
  private readonly logger = new Logger(LlmToolClient.name);
  private readonly apiKey: string | undefined;
  private readonly model: string;

  constructor(config: ConfigService) {
    const rawKey = config.get<string>('GEMINI_API_KEY')?.trim();
    this.apiKey =
      rawKey && rawKey !== 'your_gemini_api_key_here' ? rawKey : undefined;
    this.model = config.get<string>('AI_MODEL_NAME', DEFAULT_AI_MODEL);
  }

  async generatePlanBReasons(input: {
    conflictedPlaceName: string;
    rainProbability: number;
    temperatureC: number | null;
    candidates: PlanBCandidatePromptItem[];
  }): Promise<Record<number, string>> {
    const fallback = this.buildFallbackReasons(input);
    if (!this.apiKey || input.candidates.length === 0) {
      return fallback;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });
      const allowedIds = new Set(input.candidates.map((c) => c.placeId));
      const prompt = [
        'Bạn là trợ lý du lịch SkyRoute. Chỉ viết lý do gợi ý ngắn gọn bằng tiếng Việt (tối đa 25 từ mỗi địa điểm) cho các địa điểm trong nhà CÓ THẬT sau đây để thay thế điểm ngoài trời bị mưa.',
        `Điểm đang xung đột thời tiết: "${input.conflictedPlaceName}" (xác suất mưa ${input.rainProbability}%, nhiệt độ ${input.temperatureC ?? 20}°C).`,
        'Danh sách ứng viên hợp lệ (CHỈ trả về JSON object dạng {"reasons":[{"placeId":number,"reason":string}]} cho đúng các placeId này):',
        JSON.stringify(input.candidates),
      ].join('\n');

      const response = await Promise.race([
        ai.models.generateContent({
          model: this.model,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('LLM timeout')), LLM_TIMEOUT_MS),
        ),
      ]);

      const text = response.text?.trim();
      if (!text) {
        return fallback;
      }

      const parsed = JSON.parse(text) as {
        reasons?: Array<{ placeId?: number; reason?: string }>;
      };

      const merged = { ...fallback };
      for (const entry of parsed.reasons ?? []) {
        if (
          typeof entry.placeId === 'number' &&
          allowedIds.has(entry.placeId) &&
          typeof entry.reason === 'string' &&
          entry.reason.trim().length > 0
        ) {
          merged[entry.placeId] = entry.reason.trim();
        }
      }
      return merged;
    } catch (err) {
      this.logger.warn(
        `[LlmTool] generatePlanBReasons fallback triggered: ${(err as Error).message}`,
      );
      return fallback;
    }
  }

  private buildFallbackReasons(input: {
    rainProbability: number;
    candidates: PlanBCandidatePromptItem[];
  }): Record<number, string> {
    const reasons: Record<number, string> = {};
    for (const c of input.candidates) {
      const subLabel = c.subcategory ? ` (${c.subcategory})` : '';
      reasons[c.placeId] =
        `Điểm trong nhà${subLabel} cách điểm trước ${c.distanceFromPrevKm.toFixed(1)} km, đánh giá ${c.rating.toFixed(1)}★, phù hợp tránh mưa ${input.rainProbability}%.`;
    }
    return reasons;
  }
}
