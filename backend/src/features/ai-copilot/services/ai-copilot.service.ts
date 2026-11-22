import { HttpStatus, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LlmTimeoutError,
  LlmToolClient,
} from '../../../core/integrations/llm-tool.client';
import { DomainException } from '../../../shared/exceptions/domain.exception';
import {
  normalizeCitySlug,
  resolveCityCoordinates,
} from '../../../shared/utils/time-slot.util';
import { AuthService } from '../../auth/auth.service';
import { DiscoveryService } from '../../discovery/services/discovery.service';
import { FoodDiscoveryService } from '../../discovery/services/food-discovery.service';
import { PlaceResponseItem } from '../../discovery/types/discovery.types';
import { TripsService } from '../../trips/services/trips.service';
import { TIME_SLOTS, TimeSlotType } from '../../trips/types/trip.types';
import { WeatherService } from '../../weather/services/weather.service';
import { GenerateItineraryDto } from '../dto/generate-itinerary.dto';
import {
  sanitizeFoodToolArgs,
  sanitizeRadarToolArgs,
  sanitizeWeatherToolArgs,
} from '../tools/travel-tools.definition';
import {
  GeneratedItineraryResponse,
  GeneratedItinerarySlotItem,
  GeneratedSlotWeatherSummary,
} from '../types/ai-copilot.types';

const DEFAULT_RAIN_THRESHOLD_PCT = 60;
const MAX_GENERATED_DAYS = 7;

const SLOT_ORDER: Record<TimeSlotType, number> = {
  morning: 0,
  lunch: 1,
  afternoon: 2,
  dinner: 3,
};

interface PromptPreferences {
  wantsNature: boolean;
  wantsIndoor: boolean;
  wantsHotpotBbq: boolean;
  wantsCafe: boolean;
  preferredPriceLevel: 1 | 2 | 3 | null;
}

function addDaysIso(baseDate: string, offsetDays: number): string {
  const ms = Date.parse(`${baseDate}T00:00:00Z`) + offsetDays * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function parsePromptPreferences(prompt: string): PromptPreferences {
  const normalized = normalizeCitySlug(prompt);
  const wantsNature =
    /san may|doi che|thien nhien|nature|ho |thac|nui|ngoai troi/.test(
      normalized,
    );
  const wantsIndoor = /trong nha|indoor|bao tang|museum|workshop|tranh mua/.test(
    normalized,
  );
  const wantsHotpotBbq = /lau|nuong|hotpot|bbq|am thuc/.test(normalized);
  const wantsCafe = /ca phe|cafe|coffee|chill|song ao/.test(normalized);

  let preferredPriceLevel: 1 | 2 | 3 | null = null;
  if (/re|tiet kiem|binh dan|budget/.test(normalized)) {
    preferredPriceLevel = 1;
  } else if (/cao|sang|luxury|resort/.test(normalized)) {
    preferredPriceLevel = 3;
  } else if (/vua|trung binh|medium/.test(normalized)) {
    preferredPriceLevel = 2;
  }

  return {
    wantsNature,
    wantsIndoor,
    wantsHotpotBbq,
    wantsCafe,
    preferredPriceLevel,
  };
}

export function mergePromptAndUserPreferences(
  prompt: string,
  userPreferences?: Record<string, unknown>,
): PromptPreferences {
  const base = parsePromptPreferences(prompt);
  if (!userPreferences) {
    return base;
  }

  const interests = Array.isArray(userPreferences.interests)
    ? userPreferences.interests
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim().toLowerCase())
    : [];

  const wantsNature = base.wantsNature || interests.includes('nature');
  const wantsHotpotBbq =
    base.wantsHotpotBbq ||
    interests.includes('hotpot') ||
    interests.includes('bbq');
  const wantsCafe = base.wantsCafe || interests.includes('cafe');
  const wantsIndoor =
    base.wantsIndoor ||
    userPreferences.preferIndoor === true ||
    interests.includes('museum') ||
    interests.includes('indoor');

  let preferredPriceLevel = base.preferredPriceLevel;
  if (
    preferredPriceLevel === null &&
    typeof userPreferences.budget === 'string'
  ) {
    const budget = userPreferences.budget.toLowerCase();
    if (budget === 'low') preferredPriceLevel = 1;
    else if (budget === 'medium') preferredPriceLevel = 2;
    else if (budget === 'high') preferredPriceLevel = 3;
  }

  return {
    wantsNature,
    wantsIndoor,
    wantsHotpotBbq,
    wantsCafe,
    preferredPriceLevel,
  };
}

@Injectable()
export class AiCopilotService {
  private readonly logger = new Logger(AiCopilotService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly tripsService: TripsService,
    private readonly discoveryService: DiscoveryService,
    private readonly foodDiscoveryService: FoodDiscoveryService,
    private readonly weatherService: WeatherService,
    private readonly llmClient: LlmToolClient,
    @Optional() private readonly authService?: AuthService,
  ) {}

  async generateItinerary(
    userId: string,
    dto: GenerateItineraryDto,
  ): Promise<GeneratedItineraryResponse> {
    const trip = await this.tripsService.requireOwnedTrip(
      userId,
      String(dto.tripId),
    );
    const plannedDays = Math.min(Math.max(trip.totalDays, 1), MAX_GENERATED_DAYS);
    const cityCenter = resolveCityCoordinates(trip.destinationCity) ?? {
      canonicalCity: trip.destinationCity,
      lat: 11.9404,
      lng: 108.4583,
    };

    const weatherByDay = await this.loadWeatherByDay(
      trip.destinationCity,
      trip.startDate,
      plannedDays,
    );

    const groundedPlaceMap = new Map<number, PlaceResponseItem>();
    const [catalogRes, foodRes] = await Promise.all([
      this.discoveryService.listPlaces({
        city: trip.destinationCity,
        limit: 100,
        sort: 'rating',
        order: 'desc',
      }),
      this.foodDiscoveryService.recommendFood({
        city: trip.destinationCity,
        lat: cityCenter.lat,
        lng: cityCenter.lng,
        limit: 50,
      }),
    ]);

    for (const place of [...catalogRes.data, ...foodRes.data]) {
      groundedPlaceMap.set(place.id, place);
    }

    const profile = this.authService
      ? await this.authService.getProfile(userId).catch(() => null)
      : null;
    const prefs = mergePromptAndUserPreferences(
      dto.prompt,
      profile?.preferences,
    );
    const rainThreshold = this.getRainThresholdPct();

    let llmSummary: string | null = null;
    let llmDraftItems: Array<{
      dayNumber: number;
      timeSlot: string;
      placeId: number;
      reason: string;
    }> = [];
    let providerMode: 'gemini-tools' | 'deterministic-grounded' =
      'deterministic-grounded';

    if (this.llmClient.isConfigured()) {
      const toolExecutor = async (
        name: string,
        rawArgs: Record<string, unknown>,
      ): Promise<Record<string, unknown>> => {
        if (name === 'get_places_by_radius') {
          const args = sanitizeRadarToolArgs(rawArgs, cityCenter);
          const result = await this.discoveryService.scanRadar({
            lat: args.lat,
            lng: args.lng,
            radius_km: args.radiusKm,
            city: trip.destinationCity,
            category: args.category,
            is_outdoor: args.isOutdoor,
            weather_tag: args.weatherTag,
            limit: args.limit,
          });
          for (const p of result.data) {
            groundedPlaceMap.set(p.id, p);
          }
          return {
            places: result.data.map((p) => ({
              placeId: p.id,
              name: p.name,
              category: p.category,
              subcategory: p.subcategory,
              isOutdoor: p.isOutdoor,
              priceLevel: p.priceLevel,
              rating: p.rating,
              suitableWeather: p.suitableWeather,
            })),
          };
        }

        if (name === 'get_food_recommendations') {
          const args = sanitizeFoodToolArgs(
            rawArgs,
            trip.destinationCity,
            cityCenter,
          );
          const result = await this.foodDiscoveryService.recommendFood({
            city: args.city,
            lat: args.lat,
            lng: args.lng,
            temperature_c: args.temperatureC,
            rain_probability: args.rainProbability,
            limit: args.limit,
          });
          for (const p of result.data) {
            groundedPlaceMap.set(p.id, p);
          }
          return {
            weatherProfile: result.meta.weatherProfile,
            places: result.data.map((p) => ({
              placeId: p.id,
              name: p.name,
              category: p.category,
              subcategory: p.subcategory,
              isOutdoor: p.isOutdoor,
              priceLevel: p.priceLevel,
              rating: p.rating,
            })),
          };
        }

        if (name === 'get_weather_forecast') {
          const args = sanitizeWeatherToolArgs(
            rawArgs,
            trip.destinationCity,
            trip.startDate,
          );
          try {
            const forecast = await this.weatherService.getForecast({
              city: args.city,
              date: args.date,
            });
            return {
              city: forecast.city,
              date: forecast.date,
              slots: forecast.slots,
            };
          } catch {
            return {
              city: args.city,
              date: args.date,
              slots: this.defaultSlotForecasts(),
            };
          }
        }

        return { error: `Unsupported tool: ${name}` };
      };

      try {
        const llmResult = await this.llmClient.generateGroundedItinerary(
          {
            destinationCity: trip.destinationCity,
            startDate: trip.startDate,
            endDate: trip.endDate,
            totalDays: plannedDays,
            prompt: dto.prompt,
          },
          toolExecutor,
        );
        if (llmResult && llmResult.items.length > 0) {
          llmSummary = llmResult.summary;
          llmDraftItems = llmResult.items;
          providerMode = 'gemini-tools';
        }
      } catch (err) {
        if (err instanceof LlmTimeoutError) {
          throw new DomainException(
            'AI_002',
            'Function-calling provider timed out',
            HttpStatus.GATEWAY_TIMEOUT,
          );
        }
        this.logger.warn(
          `[AiCopilot] LLM tool orchestration failed, falling back to deterministic grounded planner: ${(err as Error).message}`,
        );
      }
    }

    const usedPlaceIds = new Set<number>();
    const assignedSlots = new Map<string, GeneratedItinerarySlotItem>();
    let weatherWarningsAvoided = 0;

    // 1. Validate and accept strictly grounded, weather-safe items proposed by LLM tools
    for (const draft of llmDraftItems) {
      if (
        !Number.isInteger(draft.dayNumber) ||
        draft.dayNumber < 1 ||
        draft.dayNumber > plannedDays ||
        !TIME_SLOTS.includes(draft.timeSlot as TimeSlotType)
      ) {
        continue;
      }

      const timeSlot = draft.timeSlot as TimeSlotType;
      const slotKey = `${draft.dayNumber}:${timeSlot}`;
      if (assignedSlots.has(slotKey) || usedPlaceIds.has(draft.placeId)) {
        continue;
      }

      const realPlace = groundedPlaceMap.get(draft.placeId);
      if (!realPlace) {
        // Reject hallucinated placeId not present in PostGIS catalog
        continue;
      }

      const slotWeather = this.getSlotWeather(weatherByDay, draft.dayNumber, timeSlot);
      if (slotWeather.rainProbability >= rainThreshold && realPlace.isOutdoor) {
        weatherWarningsAvoided++;
        continue;
      }

      usedPlaceIds.add(realPlace.id);
      assignedSlots.set(
        slotKey,
        this.toGeneratedSlotItem(
          draft.dayNumber,
          timeSlot,
          realPlace,
          slotWeather,
          draft.reason,
        ),
      );
    }

    // 2. Fill remaining slots deterministically from grounded PostGIS catalog
    const allPlaces = Array.from(groundedPlaceMap.values());
    for (let day = 1; day <= plannedDays; day++) {
      for (const slot of TIME_SLOTS) {
        const slotKey = `${day}:${slot}`;
        if (assignedSlots.has(slotKey)) {
          continue;
        }

        const slotWeather = this.getSlotWeather(weatherByDay, day, slot);
        const isRainySlot = slotWeather.rainProbability >= rainThreshold;

        const { selected, avoidedOutdoor } = this.pickBestGroundedPlace(
          allPlaces,
          usedPlaceIds,
          slot,
          slotWeather,
          prefs,
          isRainySlot,
        );

        if (!selected) {
          continue;
        }

        if (avoidedOutdoor) {
          weatherWarningsAvoided++;
        }

        usedPlaceIds.add(selected.id);
        assignedSlots.set(
          slotKey,
          this.toGeneratedSlotItem(
            day,
            slot,
            selected,
            slotWeather,
            this.buildSlotReason(selected, slot, slotWeather, isRainySlot),
          ),
        );
      }
    }

    const items = Array.from(assignedSlots.values()).sort((a, b) => {
      if (a.dayNumber !== b.dayNumber) {
        return a.dayNumber - b.dayNumber;
      }
      return SLOT_ORDER[a.timeSlot] - SLOT_ORDER[b.timeSlot];
    });

    const summary =
      llmSummary ??
      `Lịch trình ${plannedDays} ngày tại ${trip.destinationCity} gồm ${items.length} điểm thực tế từ PostGIS${weatherWarningsAvoided > 0 ? `, tự động tránh ${weatherWarningsAvoided} khung giờ mưa lớn bằng điểm trong nhà` : ''}.`;

    this.logger.log(
      `[AiCopilot] generateItinerary - tripId=${dto.tripId},mode=${providerMode},items=${items.length},avoided=${weatherWarningsAvoided}`,
    );

    return {
      tripId: trip.id,
      destinationCity: trip.destinationCity,
      summary,
      providerMode,
      weatherWarningsAvoided,
      items,
    };
  }

  private async loadWeatherByDay(
    city: string,
    startDate: string,
    totalDays: number,
  ): Promise<Map<number, Map<TimeSlotType, GeneratedSlotWeatherSummary>>> {
    const map = new Map<number, Map<TimeSlotType, GeneratedSlotWeatherSummary>>();
    for (let day = 1; day <= totalDays; day++) {
      const targetDate = addDaysIso(startDate, day - 1);
      const slotMap = new Map<TimeSlotType, GeneratedSlotWeatherSummary>();
      try {
        const forecast = await this.weatherService.getForecast({
          city,
          date: targetDate,
        });
        for (const s of forecast.slots) {
          slotMap.set(s.timeSlot, {
            temperatureC: s.temperatureC,
            rainProbability: s.rainProbability,
            conditionTag: s.conditionTag,
          });
        }
      } catch {
        for (const s of this.defaultSlotForecasts()) {
          slotMap.set(s.timeSlot, {
            temperatureC: s.temperatureC,
            rainProbability: s.rainProbability,
            conditionTag: s.conditionTag,
          });
        }
      }
      map.set(day, slotMap);
    }
    return map;
  }

  private defaultSlotForecasts(): Array<{
    timeSlot: TimeSlotType;
    temperatureC: number;
    rainProbability: number;
    conditionTag: string;
  }> {
    return TIME_SLOTS.map((timeSlot) => ({
      timeSlot,
      temperatureC: timeSlot === 'dinner' ? 16 : 20,
      rainProbability: 15,
      conditionTag: 'cloudy',
    }));
  }

  private getSlotWeather(
    weatherByDay: Map<number, Map<TimeSlotType, GeneratedSlotWeatherSummary>>,
    dayNumber: number,
    timeSlot: TimeSlotType,
  ): GeneratedSlotWeatherSummary {
    return (
      weatherByDay.get(dayNumber)?.get(timeSlot) ?? {
        temperatureC: 20,
        rainProbability: 15,
        conditionTag: 'cloudy',
      }
    );
  }

  private pickBestGroundedPlace(
    pool: PlaceResponseItem[],
    usedIds: Set<number>,
    slot: TimeSlotType,
    weather: GeneratedSlotWeatherSummary,
    prefs: PromptPreferences,
    isRainySlot: boolean,
  ): { selected: PlaceResponseItem | null; avoidedOutdoor: boolean } {
    const unused = pool.filter((p) => !usedIds.has(p.id));
    if (unused.length === 0) {
      return { selected: null, avoidedOutdoor: false };
    }

    const indoorOnly = unused.filter((p) => !p.isOutdoor);
    const eligible = isRainySlot && indoorOnly.length > 0 ? indoorOnly : unused;
    const avoidedOutdoor =
      isRainySlot &&
      indoorOnly.length > 0 &&
      unused.some((p) => p.isOutdoor);

    const isFoodSlot = slot === 'lunch' || slot === 'dinner';
    const isColdOrRainy = isRainySlot || weather.temperatureC <= 20;
    const isHot = weather.temperatureC >= 30 && !isRainySlot;

    let best: PlaceResponseItem | null = null;
    let bestScore = -Infinity;

    for (const p of eligible) {
      let score = p.rating;

      if (isFoodSlot) {
        if (p.category === 'restaurant') score += 4.0;
        else if (p.category === 'cafe') score += 1.0;
        else score -= 3.0;

        if (
          (isColdOrRainy || prefs.wantsHotpotBbq) &&
          (p.subcategory === 'hotpot' || p.subcategory === 'bbq')
        ) {
          score += 2.5;
        }
        if (isHot && p.hasAc) {
          score += 2.0;
        }
      } else {
        if (p.category === 'attraction') score += 3.0;
        else if (p.category === 'cafe') score += prefs.wantsCafe ? 3.2 : 1.5;
        else score -= 2.0;

        if (
          prefs.wantsNature &&
          !isRainySlot &&
          p.subcategory === 'nature'
        ) {
          score += 2.0;
        }
        if (
          (prefs.wantsIndoor || isRainySlot) &&
          !p.isOutdoor
        ) {
          score += 2.2;
        }
      }

      if (
        prefs.preferredPriceLevel !== null &&
        p.priceLevel === prefs.preferredPriceLevel
      ) {
        score += 1.0;
      }

      if (p.suitableWeather.includes(weather.conditionTag)) {
        score += 1.0;
      }

      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }

    return { selected: best, avoidedOutdoor };
  }

  private buildSlotReason(
    place: PlaceResponseItem,
    slot: TimeSlotType,
    weather: GeneratedSlotWeatherSummary,
    isRainySlot: boolean,
  ): string {
    if (isRainySlot && !place.isOutdoor) {
      return `Điểm trong nhà phù hợp tránh mưa (${weather.rainProbability}%) vào khung ${slot}, đánh giá ${place.rating.toFixed(1)}★.`;
    }
    if (
      (slot === 'lunch' || slot === 'dinner') &&
      (place.subcategory === 'hotpot' || place.subcategory === 'bbq') &&
      weather.temperatureC <= 20
    ) {
      return `Món ấm nóng phù hợp thời tiết se lạnh ${weather.temperatureC}°C, đánh giá ${place.rating.toFixed(1)}★.`;
    }
    return `Địa điểm thực tế phù hợp khung ${slot} (${weather.temperatureC}°C, mưa ${weather.rainProbability}%), đánh giá ${place.rating.toFixed(1)}★.`;
  }

  private toGeneratedSlotItem(
    dayNumber: number,
    timeSlot: TimeSlotType,
    place: PlaceResponseItem,
    weather: GeneratedSlotWeatherSummary,
    reason: string,
  ): GeneratedItinerarySlotItem {
    return {
      dayNumber,
      timeSlot,
      placeId: place.id,
      place: {
        id: place.id,
        name: place.name,
        category: place.category,
        subcategory: place.subcategory,
        isOutdoor: place.isOutdoor,
        priceLevel: place.priceLevel,
        rating: place.rating,
        address: place.address,
        location: place.location,
      },
      weather,
      reason,
    };
  }

  private getRainThresholdPct(): number {
    const raw = Number(
      this.config.get('RAIN_CONFLICT_THRESHOLD_PCT', DEFAULT_RAIN_THRESHOLD_PCT),
    );
    return Number.isFinite(raw) ? raw : DEFAULT_RAIN_THRESHOLD_PCT;
  }
}
