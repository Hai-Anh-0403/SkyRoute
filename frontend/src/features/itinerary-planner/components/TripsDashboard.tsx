'use client';

import {
  ArrowRight,
  Calendar,
  CloudSun,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ProfilePreferencesModal,
  useAuthStore,
  type BudgetPreference,
} from '@/features/auth';
import { AppHeader } from '@/shared/components/AppHeader';
import { resolveCityPreset } from '@/shared/lib/cities';
import {
  CURATED_TRIP_TEMPLATES,
  getCityCoverImage,
  type CuratedTripTemplate,
} from '@/shared/lib/destination-media';
import { ROUTES } from '@/shared/lib/routes';
import { useDeleteTrip, useTripsList } from '../hooks/useTripQueries';
import type { TripStatusType, TripSummary } from '../types/trip.types';
import {
  CreateTripModal,
  type CreateTripPrefill,
} from './CreateTripModal';
import { TripEditModal } from './TripEditModal';

type FilterTab = 'all' | TripStatusType;

const STATUS_LABEL: Record<TripStatusType, string> = {
  draft: 'Nháp',
  active: 'Đang lên lịch',
  completed: 'Hoàn thành',
  archived: 'Lưu trữ',
};

const STATUS_STYLE: Record<TripStatusType, string> = {
  active: 'bg-emerald-100/95 text-emerald-800',
  draft: 'bg-stone-100/95 text-slate-700',
  completed: 'bg-sky-100/95 text-sky-800',
  archived: 'bg-slate-200/95 text-slate-600',
};

const BUDGET_LABEL: Record<BudgetPreference, string> = {
  low: 'Tiết kiệm',
  medium: 'Ngân sách vừa',
  high: 'Cao cấp',
};

const INTEREST_LABEL: Record<string, string> = {
  nature: 'Thiên nhiên',
  hotpot: 'Lẩu & Đồ nóng',
  cafe: 'Cà phê',
  food: 'Ẩm thực',
  culture: 'Văn hóa',
  checkin: 'Check-in',
  relax: 'Nghỉ dưỡng',
};

function buildTemplateDates(days: number): {
  startDate: string;
  endDate: string;
} {
  const start = new Date();
  start.setDate(start.getDate() + 10);
  const end = new Date(start);
  end.setDate(start.getDate() + Math.max(1, days - 1));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export function TripsDashboard() {
  const user = useAuthStore((s) => s.user);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createPrefill, setCreatePrefill] =
    useState<CreateTripPrefill | null>(null);
  const [editingTrip, setEditingTrip] = useState<TripSummary | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const tripsQuery = useTripsList();
  const deleteMutation = useDeleteTrip();

  const trips = useMemo(() => tripsQuery.data ?? [], [tripsQuery.data]);

  const spotlightTrip = useMemo<TripSummary | null>(() => {
    if (trips.length === 0) return null;
    return trips.find((t) => t.status === 'active') ?? trips[0];
  }, [trips]);

  const statusCounts = useMemo(() => {
    const counts = { all: trips.length, active: 0, draft: 0, completed: 0 };
    for (const trip of trips) {
      if (trip.status === 'active') counts.active += 1;
      else if (trip.status === 'draft') counts.draft += 1;
      else if (trip.status === 'completed') counts.completed += 1;
    }
    return counts;
  }, [trips]);

  const gridTrips = useMemo(() => {
    if (activeTab === 'all') {
      return spotlightTrip
        ? trips.filter((t) => t.id !== spotlightTrip.id)
        : trips;
    }
    return trips.filter((t) => t.status === activeTab);
  }, [trips, activeTab, spotlightTrip]);

  const openCreateModal = (template?: CuratedTripTemplate) => {
    if (template) {
      const dates = buildTemplateDates(template.days);
      setCreatePrefill({
        title: template.title,
        destinationCity: template.destinationCity,
        startDate: dates.startDate,
        endDate: dates.endDate,
      });
    } else {
      setCreatePrefill(null);
    }
    setIsCreateOpen(true);
  };

  const displayName = user?.fullName?.trim() || 'Traveler';
  const budgetText = user?.preferences?.budget
    ? BUDGET_LABEL[user.preferences.budget]
    : null;
  const interestChips = (user?.preferences?.interests ?? []).slice(0, 4);

  const renderEditDeleteActions = (trip: TripSummary) => (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label={`Sửa chuyến đi ${trip.title}`}
        onClick={() => setEditingTrip(trip)}
        className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-stone-300 hover:bg-stone-50 hover:text-slate-900"
      >
        <Pencil className="h-3 w-3" aria-hidden="true" />
        Sửa
      </button>
      {confirmDeleteId === trip.id ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() =>
              deleteMutation.mutate(trip.id, {
                onSuccess: () => setConfirmDeleteId(null),
              })
            }
            className="rounded-full bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-rose-700"
          >
            Xác nhận xóa
          </button>
          <button
            type="button"
            onClick={() => setConfirmDeleteId(null)}
            className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs text-slate-600 transition hover:bg-stone-50"
          >
            Hủy
          </button>
        </div>
      ) : (
        <button
          type="button"
          aria-label={`Xóa chuyến đi ${trip.title}`}
          onClick={() => setConfirmDeleteId(trip.id)}
          className="inline-flex items-center gap-1 rounded-full border border-rose-200/80 bg-white px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
        >
          <Trash2 className="h-3 w-3" aria-hidden="true" />
          Xóa
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-slate-900">
      <AppHeader
        assistantHref={
          spotlightTrip
            ? ROUTES.TRIP_WORKSPACE(spotlightTrip.id)
            : ROUTES.EXPLORE_CITY('ha-noi')
        }
        onOpenProfile={() => setIsProfileOpen(true)}
        onCreateTrip={() => openCreateModal()}
      />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {/* Tier 2: Welcome Header & Preferences Chips */}
        <section aria-labelledby="hub-welcome-heading">
          <h1
            id="hub-welcome-heading"
            className="font-editorial text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            Chào mừng trở lại, {displayName}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {budgetText ? (
              <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                {budgetText}
              </span>
            ) : null}
            {interestChips.map((interest) => (
              <span
                key={interest}
                className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
              >
                {INTEREST_LABEL[interest] ?? interest}
              </span>
            ))}
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Chỉnh sở thích
            </button>
          </div>
        </section>

        {/* Loading / Auth Error States */}
        {tripsQuery.isLoading ? (
          <div className="mt-6 space-y-6">
            <div className="h-52 animate-pulse rounded-2xl border border-stone-200 bg-white" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="h-60 animate-pulse rounded-2xl border border-stone-200 bg-white" />
              <div className="h-60 animate-pulse rounded-2xl border border-stone-200 bg-white" />
              <div className="h-60 animate-pulse rounded-2xl border border-stone-200 bg-white" />
            </div>
          </div>
        ) : null}

        {tripsQuery.isError ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/90 p-6 text-sm text-amber-900">
            Hãy{' '}
            <Link
              href={ROUTES.LOGIN}
              className="font-semibold text-amber-950 underline"
            >
              đăng nhập
            </Link>{' '}
            để xem và lưu danh sách chuyến đi của bạn.
          </div>
        ) : null}

        {/* Active Trip Spotlight Card */}
        {!tripsQuery.isLoading && !tripsQuery.isError && spotlightTrip ? (
          <section
            aria-label="Chuyến đi nổi bật"
            className="mt-6 overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs"
          >
            <div className="grid grid-cols-1 md:grid-cols-12">
              <div className="relative min-h-[200px] bg-stone-200 md:col-span-5">
                <Image
                  src={getCityCoverImage(spotlightTrip.destinationCity)}
                  alt={spotlightTrip.destinationCity}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover"
                />
              </div>

              <div className="flex flex-col justify-between p-5 sm:p-6 md:col-span-7">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[spotlightTrip.status]}`}
                      >
                        {STATUS_LABEL[spotlightTrip.status]} •{' '}
                        {spotlightTrip.totalDays} ngày
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                        <CloudSun
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        Đồng bộ thời tiết
                      </span>
                    </div>
                    {renderEditDeleteActions(spotlightTrip)}
                  </div>

                  <h2 className="font-editorial mt-3.5 text-2xl font-bold text-slate-900 sm:text-3xl">
                    {spotlightTrip.title}
                  </h2>

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 sm:text-sm">
                    <span className="inline-flex items-center gap-1">
                      <MapPin
                        className="h-3.5 w-3.5 text-slate-400"
                        aria-hidden="true"
                      />
                      {resolveCityPreset(spotlightTrip.destinationCity)
                        .displayName}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar
                        className="h-3.5 w-3.5 text-slate-400"
                        aria-hidden="true"
                      />
                      {spotlightTrip.startDate} → {spotlightTrip.endDate}
                    </span>
                    <span className="text-slate-500">
                      • Lịch trình 4 khung giờ sẵn sàng
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href={ROUTES.TRIP_WORKSPACE(spotlightTrip.id)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700 sm:text-sm"
                  >
                    Tiếp tục lập lịch trình
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href={ROUTES.EXPLORE_CITY(
                      resolveCityPreset(spotlightTrip.destinationCity).slug,
                    )}
                    className="inline-flex items-center rounded-full border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-stone-100 sm:text-sm"
                  >
                    Mở bản đồ Radar
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* Empty State when 0 trips */}
        {!tripsQuery.isLoading && !tripsQuery.isError && trips.length === 0 ? (
          <section className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
            <h2 className="font-editorial text-xl font-bold text-slate-900">
              Bạn chưa có chuyến đi nào
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              Bắt đầu tạo hành trình đầu tiên hoặc chọn nhanh một mẫu gợi ý bên
              dưới để trải nghiệm Radar PostGIS và Kế hoạch dự phòng thời tiết.
            </p>
            <button
              type="button"
              onClick={() => openCreateModal()}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tạo chuyến đi đầu tiên
            </button>
          </section>
        ) : null}

        {/* Tier 3: Your Trips Visual Grid + Filter Tabs */}
        {!tripsQuery.isLoading && !tripsQuery.isError && trips.length > 0 ? (
          <section
            aria-labelledby="your-trips-heading"
            className="mt-10"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2
                id="your-trips-heading"
                className="font-editorial text-2xl font-bold text-slate-900"
              >
                Chuyến đi của bạn
              </h2>

              <div
                role="tablist"
                aria-label="Lọc chuyến đi theo trạng thái"
                className="inline-flex flex-wrap items-center gap-1 rounded-full border border-stone-200 bg-white p-1"
              >
                {(
                  [
                    { key: 'all', label: `Tất cả (${statusCounts.all})` },
                    { key: 'active', label: `Đang lên lịch (${statusCounts.active})` },
                    { key: 'draft', label: `Nháp (${statusCounts.draft})` },
                    {
                      key: 'completed',
                      label: `Hoàn thành (${statusCounts.completed})`,
                    },
                  ] as const
                ).map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveTab(tab.key)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                        isActive
                          ? 'bg-stone-100 text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {gridTrips.length > 0 ? (
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {gridTrips.map((trip) => (
                  <article
                    key={trip.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-3 shadow-xs transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-stone-200">
                      <Image
                        src={getCityCoverImage(trip.destinationCity)}
                        alt={trip.destinationCity}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                      <span
                        className={`absolute right-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-xs backdrop-blur-xs ${STATUS_STYLE[trip.status]}`}
                      >
                        {STATUS_LABEL[trip.status]}
                      </span>
                    </div>

                    <div className="mt-3.5 flex flex-1 flex-col px-1">
                      <Link
                        href={ROUTES.TRIP_WORKSPACE(trip.id)}
                        className="text-base font-bold text-slate-900 transition hover:text-sky-700"
                      >
                        {trip.title}
                      </Link>

                      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-600">
                        <span>
                          {trip.totalDays} ngày • {trip.startDate}
                        </span>
                        <Link
                          href={ROUTES.TRIP_WORKSPACE(trip.id)}
                          className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:text-sky-800"
                        >
                          Mở Workspace
                          <ArrowRight
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </Link>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2.5">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          {resolveCityPreset(trip.destinationCity).displayName}
                        </span>
                        {renderEditDeleteActions(trip)}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-stone-200/80 bg-white/70 px-5 py-6 text-center text-xs text-slate-500">
                {activeTab === 'all'
                  ? 'Chuyến đi hiện tại của bạn đang được hiển thị nổi bật ở trên. Tạo thêm chuyến đi mới hoặc chọn mẫu gợi ý bên dưới.'
                  : 'Chưa có chuyến đi nào thuộc trạng thái này.'}
              </div>
            )}
          </section>
        ) : null}

        {/* Tier 4: Quick-Start Curated Templates Strip */}
        <section
          aria-labelledby="templates-heading"
          className="mt-12 border-t border-stone-200/80 pt-7"
        >
          <h2
            id="templates-heading"
            className="text-sm font-semibold text-slate-700"
          >
            Bắt đầu nhanh với mẫu gợi ý
          </h2>
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-3">
            {CURATED_TRIP_TEMPLATES.map((tpl) => (
              <div
                key={tpl.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200/90 bg-white p-2.5 pr-3.5 shadow-2xs transition hover:border-sky-200 hover:shadow-xs"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-stone-200">
                    <Image
                      src={tpl.imageSrc}
                      alt={tpl.title}
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900 sm:text-sm">
                      {tpl.title}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {tpl.days} ngày • Sẵn lịch trình mẫu
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openCreateModal(tpl)}
                  className="shrink-0 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                >
                  + Dùng mẫu
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      <CreateTripModal
        isOpen={isCreateOpen}
        prefill={createPrefill}
        onClose={() => setIsCreateOpen(false)}
      />
      <ProfilePreferencesModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
      <TripEditModal
        trip={editingTrip}
        onClose={() => setEditingTrip(null)}
      />
    </div>
  );
}
