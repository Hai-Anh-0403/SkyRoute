'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useProfileQuery, useUpdateProfile } from '../hooks/useAuthMutations';
import { useAuthStore } from '../stores/auth.store';
import type { BudgetPreference } from '../types/auth.types';

interface ProfilePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROFILE_SCHEMA = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Họ tên tối thiểu 2 ký tự')
    .max(150, 'Họ tên tối đa 150 ký tự'),
});

const BUDGET_OPTIONS: Array<{ value: BudgetPreference; label: string }> = [
  { value: 'low', label: 'Tiết kiệm' },
  { value: 'medium', label: 'Vừa phải' },
  { value: 'high', label: 'Cao cấp' },
];

const INTEREST_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'nature', label: 'Thiên nhiên / Săn mây' },
  { value: 'hotpot', label: 'Lẩu / Đồ nướng' },
  { value: 'cafe', label: 'Cà phê chill' },
  { value: 'museum', label: 'Bảo tàng / Trong nhà' },
];

export function ProfilePreferencesModal({
  isOpen,
  onClose,
}: ProfilePreferencesModalProps) {
  const storedUser = useAuthStore((s) => s.user);
  const profileQuery = useProfileQuery(isOpen);
  const updateMutation = useUpdateProfile();

  const activeUser = profileQuery.data ?? storedUser;
  const [budget, setBudget] = useState<BudgetPreference>('medium');
  const [interests, setInterests] = useState<string[]>([]);
  const [preferIndoor, setPreferIndoor] = useState(false);
  const hasInteractedRef = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ fullName: string }>({
    resolver: zodResolver(PROFILE_SCHEMA),
    defaultValues: { fullName: activeUser?.fullName ?? '' },
  });

  useEffect(() => {
    if (!isOpen) {
      hasInteractedRef.current = false;
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !activeUser || hasInteractedRef.current) return;
    reset({ fullName: activeUser.fullName });
    const prefs = activeUser.preferences ?? {};
    setBudget(
      prefs.budget === 'low' ||
        prefs.budget === 'medium' ||
        prefs.budget === 'high'
        ? prefs.budget
        : 'medium',
    );
    setInterests(
      Array.isArray(prefs.interests)
        ? prefs.interests.filter((v): v is string => typeof v === 'string')
        : [],
    );
    setPreferIndoor(prefs.preferIndoor === true);
  }, [isOpen, activeUser, reset]);

  if (!isOpen) {
    return null;
  }

  const toggleInterest = (value: string) => {
    hasInteractedRef.current = true;
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const onSubmit = (values: { fullName: string }) => {
    updateMutation.mutate(
      {
        fullName: values.fullName,
        preferences: {
          budget,
          interests,
          preferIndoor,
        },
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hồ sơ & Sở thích du lịch"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">
              Hồ sơ & Sở thích du lịch
            </h2>
          </div>
          <button
            type="button"
            aria-label="Đóng hồ sơ"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 p-5">
          <div>
            <label
              htmlFor="profile-fullname"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Họ và tên
            </label>
            <input
              id="profile-fullname"
              type="text"
              {...register('fullName', {
                onChange: () => {
                  hasInteractedRef.current = true;
                },
              })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">
              Ngân sách ưu tiên
            </span>
            <div className="grid grid-cols-3 gap-2">
              {BUDGET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={budget === opt.value}
                  onClick={() => {
                    hasInteractedRef.current = true;
                    setBudget(opt.value);
                  }}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                    budget === opt.value
                      ? 'border-sky-600 bg-sky-50 text-sky-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">
              Sở thích (AI Copilot sẽ ưu tiên khi tạo lịch trình)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {INTEREST_OPTIONS.map((opt) => {
                const active = interests.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleInterest(opt.value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      active
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={preferIndoor}
              onChange={(e) => {
                hasInteractedRef.current = true;
                setPreferIndoor(e.target.checked);
              }}
              className="h-4 w-4 accent-sky-600"
            />
            Ưu tiên địa điểm trong nhà (Indoor)
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {updateMutation.isPending ? 'Đang lưu...' : 'Lưu sở thích'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
