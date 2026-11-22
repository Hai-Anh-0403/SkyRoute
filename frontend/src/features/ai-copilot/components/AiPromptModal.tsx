'use client';

import { CloudRain, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import {
  useApplyGeneratedItinerary,
  useGenerateItinerary,
} from '../hooks/useGenerateItinerary';
import type { GeneratedItinerarySlotItem } from '../types/ai-copilot.types';

interface AiPromptModalProps {
  tripId: number;
  destinationCity: string;
  isOpen: boolean;
  onClose: () => void;
}

const PROMPT_SCHEMA = z.object({
  prompt: z
    .string()
    .trim()
    .min(5, 'Vui lòng mô tả mong muốn tối thiểu 5 ký tự.')
    .max(600, 'Mô tả tối đa 600 ký tự.'),
});

const PRESET_PROMPTS = [
  'Đà Lạt 3N2Đ thích săn mây, lẩu nướng, cà phê chill, ngân sách vừa',
  'Lịch trình ưu tiên điểm trong nhà ấm áp, tránh mưa chiều và ăn lẩu tối',
  'Tham quan bảo tàng, vườn hoa và quán ăn đặc sản tiết kiệm',
];

const SLOT_LABELS: Record<GeneratedItinerarySlotItem['timeSlot'], string> = {
  morning: 'Sáng',
  lunch: 'Trưa',
  afternoon: 'Chiều',
  dinner: 'Tối',
};

export function AiPromptModal({
  tripId,
  destinationCity,
  isOpen,
  onClose,
}: AiPromptModalProps) {
  const [prompt, setPrompt] = useState(PRESET_PROMPTS[0]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const generateMutation = useGenerateItinerary();
  const applyMutation = useApplyGeneratedItinerary(tripId);

  useEffect(() => {
    if (!isOpen) return;
    textareaRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const slotKey = (item: GeneratedItinerarySlotItem) =>
    `${item.dayNumber}-${item.timeSlot}-${item.placeId}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = PROMPT_SCHEMA.safeParse({ prompt });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Prompt không hợp lệ');
      return;
    }
    setValidationError(null);
    generateMutation.mutate(
      { tripId, prompt: parsed.data.prompt },
      {
        onSuccess: (res) => {
          setSelectedKeys(new Set(res.items.map(slotKey)));
        },
      },
    );
  };

  const toggleItem = (item: GeneratedItinerarySlotItem) => {
    const key = slotKey(item);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const generated = generateMutation.data;
  const selectedItems =
    generated?.items.filter((item) => selectedKeys.has(slotKey(item))) ?? [];

  const handleApply = () => {
    if (selectedItems.length === 0) return;
    applyMutation.mutate(selectedItems, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Copilot Tạo Lịch Trình"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700">
              <Sparkles className="h-3.5 w-3.5" />
              AI Copilot Grounded ({destinationCity})
            </span>
            <h2 className="mt-0.5 text-base font-bold text-slate-900">
              Gợi ý lịch trình thích ứng thời tiết từ dữ liệu PostGIS
            </h2>
          </div>
          <button
            type="button"
            aria-label="Đóng hộp thoại AI"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {PRESET_PROMPTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPrompt(preset)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-left text-[11px] text-slate-600 hover:border-sky-300 hover:bg-sky-50"
                >
                  {preset}
                </button>
              ))}
            </div>

            <div>
              <label
                htmlFor="ai-itinerary-prompt"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Mô tả sở thích, món ăn và ngân sách của bạn
              </label>
              <textarea
                id="ai-itinerary-prompt"
                ref={textareaRef}
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ví dụ: Đà Lạt 3N2Đ thích săn mây, lẩu nướng, ngân sách vừa..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
              />
              {validationError && (
                <p className="mt-1 text-xs text-rose-600">{validationError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={generateMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {generateMutation.isPending
                ? 'Đang truy vấn PostGIS & Open-Meteo...'
                : 'Tạo lịch trình thực tế'}
            </button>
          </form>

          {generated && (
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">
                  {generated.summary}
                </p>
                {generated.weatherWarningsAvoided > 0 && (
                  <p className="mt-1 inline-flex items-center gap-1 text-emerald-700">
                    <CloudRain className="h-3.5 w-3.5" />
                    Đã tự động ưu tiên điểm trong nhà cho{' '}
                    {generated.weatherWarningsAvoided} khung giờ có nguy cơ mưa.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                {generated.items.map((item) => {
                  const checked = selectedKeys.has(slotKey(item));
                  return (
                    <label
                      key={slotKey(item)}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-sky-300"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleItem(item)}
                        className="mt-1 h-4 w-4 accent-sky-600"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700">
                            Ngày {item.dayNumber} • {SLOT_LABELS[item.timeSlot]}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 font-medium ${
                              item.place.isOutdoor
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-sky-100 text-sky-700'
                            }`}
                          >
                            {item.place.isOutdoor ? 'Ngoài trời' : 'Trong nhà'}
                          </span>
                          <span className="text-slate-500">
                            {item.weather.temperatureC}°C • Mưa{' '}
                            {item.weather.rainProbability}%
                          </span>
                        </div>
                        <div className="mt-1 text-sm font-bold text-slate-900">
                          {item.place.name}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {item.reason}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {generated && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
            <span className="text-xs text-slate-600">
              Đã chọn <strong>{selectedItems.length}</strong> /{' '}
              {generated.items.length} địa điểm
            </span>
            <button
              type="button"
              disabled={selectedItems.length === 0 || applyMutation.isPending}
              onClick={handleApply}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {applyMutation.isPending
                ? 'Đang lưu vào lịch trình...'
                : 'Áp dụng vào lịch trình'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
