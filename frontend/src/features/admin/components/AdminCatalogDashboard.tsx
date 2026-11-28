'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, MapPin, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuthStore } from '@/features/auth';
import { useRadarPlaces } from '@/features/discovery';
import { usePublicStays } from '@/features/stay-finder';
import { AppHeader } from '@/shared/components/AppHeader';
import { SKYROUTE_CITIES, resolveCityPreset } from '@/shared/lib/cities';
import { ROUTES } from '@/shared/lib/routes';
import { adminService } from '../services/admin.service';

const placeSchema = z.object({
  name: z.string().trim().min(2, 'Tên địa điểm tối thiểu 2 ký tự'),
  category: z.enum(['attraction', 'restaurant', 'cafe']),
  subcategory: z.string().trim().optional(),
  isOutdoor: z.boolean(),
  hasAc: z.boolean(),
  priceLevel: z.coerce.number().int().min(1).max(3),
  address: z.string().trim().optional(),
  lat: z.coerce.number().min(8, 'Vĩ độ VN phải từ 8–24').max(24, 'Vĩ độ VN phải từ 8–24'),
  lng: z.coerce.number().min(102, 'Kinh độ VN phải từ 102–110').max(110, 'Kinh độ VN phải từ 102–110'),
});

const staySchema = z.object({
  name: z.string().trim().min(2, 'Tên chỗ ở tối thiểu 2 ký tự'),
  stayType: z.enum(['hotel', 'homestay', 'resort']),
  pricePerNight: z.coerce.number().min(50_000, 'Giá tối thiểu 50.000 đ'),
  address: z.string().trim().optional(),
  lat: z.coerce.number().min(8, 'Vĩ độ VN phải từ 8–24').max(24, 'Vĩ độ VN phải từ 8–24'),
  lng: z.coerce.number().min(102, 'Kinh độ VN phải từ 102–110').max(110, 'Kinh độ VN phải từ 102–110'),
});

type PlaceFormValues = z.infer<typeof placeSchema>;
type StayFormValues = z.infer<typeof staySchema>;

export function AdminCatalogDashboard() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'places' | 'stays'>('places');
  const [citySlug, setCitySlug] = useState('da-lat');

  const cityPreset = resolveCityPreset(citySlug);
  const isAdmin = user?.role === 'admin';

  const placesQuery = useRadarPlaces(
    isAdmin && activeTab === 'places'
      ? {
          city: cityPreset.canonicalName,
          lat: cityPreset.center.lat,
          lng: cityPreset.center.lng,
          radiusKm: 5,
          limit: 50,
        }
      : null,
  );

  const staysQuery = usePublicStays(
    isAdmin && activeTab === 'stays'
      ? { city: cityPreset.canonicalName, limit: 50 }
      : null,
  );

  const placeForm = useForm<PlaceFormValues>({
    resolver: zodResolver(placeSchema),
    defaultValues: {
      name: '',
      category: 'attraction',
      subcategory: 'nature',
      isOutdoor: true,
      hasAc: false,
      priceLevel: 2,
      address: '',
      lat: cityPreset.center.lat,
      lng: cityPreset.center.lng,
    },
  });

  const stayForm = useForm<StayFormValues>({
    resolver: zodResolver(staySchema),
    defaultValues: {
      name: '',
      stayType: 'homestay',
      pricePerNight: 650_000,
      address: '',
      lat: cityPreset.center.lat,
      lng: cityPreset.center.lng,
    },
  });

  const handleCityChange = (nextSlug: string) => {
    setCitySlug(nextSlug);
    const nextPreset = resolveCityPreset(nextSlug);
    placeForm.setValue('lat', nextPreset.center.lat);
    placeForm.setValue('lng', nextPreset.center.lng);
    stayForm.setValue('lat', nextPreset.center.lat);
    stayForm.setValue('lng', nextPreset.center.lng);
  };

  const createPlaceMutation = useMutation({
    mutationFn: (values: PlaceFormValues) =>
      adminService.createPlace({
        name: values.name,
        city: cityPreset.canonicalName,
        category: values.category,
        subcategory: values.subcategory || undefined,
        isOutdoor: values.isOutdoor,
        hasAc: values.hasAc,
        suitableWeather: values.isOutdoor
          ? ['sunny', 'cloudy']
          : ['rainy', 'cloudy', 'sunny'],
        priceLevel: values.priceLevel,
        address: values.address || undefined,
        location: { lat: values.lat, lng: values.lng },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discovery', 'radar'] });
      toast.success('Đã thêm địa điểm mới vào Catalog!');
      placeForm.reset({
        ...placeForm.getValues(),
        name: '',
        address: '',
      });
    },
    onError: () => {
      toast.error('Không thể tạo địa điểm. Kiểm tra quyền Admin hoặc dữ liệu.');
    },
  });

  const deletePlaceMutation = useMutation({
    mutationFn: (id: number) => adminService.softDeletePlace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discovery', 'radar'] });
      toast.success('Đã ẩn địa điểm khỏi Catalog.');
    },
  });

  const createStayMutation = useMutation({
    mutationFn: (values: StayFormValues) =>
      adminService.createStay({
        name: values.name,
        city: cityPreset.canonicalName,
        stayType: values.stayType,
        pricePerNight: values.pricePerNight,
        address: values.address || undefined,
        location: { lat: values.lat, lng: values.lng },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-stays'] });
      toast.success('Đã thêm cơ sở lưu trú mới vào Catalog!');
      stayForm.reset({
        ...stayForm.getValues(),
        name: '',
        address: '',
      });
    },
    onError: () => {
      toast.error('Không thể tạo cơ sở lưu trú. Kiểm tra quyền Admin.');
    },
  });

  const deleteStayMutation = useMutation({
    mutationFn: (id: number) => adminService.softDeleteStay(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-stays'] });
      toast.success('Đã ẩn cơ sở lưu trú khỏi Catalog.');
    },
  });

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-slate-900">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {!isAdmin ? (
          <section className="mx-auto mt-10 max-w-lg rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-xs">
            <ShieldAlert
              className="mx-auto h-10 w-10 text-amber-500"
              aria-hidden="true"
            />
            <h1 className="font-editorial mt-4 text-2xl font-bold text-slate-900">
              Yêu cầu quyền Quản trị (Admin)
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Trang quản lý Catalog địa điểm và lưu trú chỉ dành cho tài khoản
              quản trị (<code className="font-semibold">admin@skyroute.vn</code>
              ).
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href={ROUTES.LOGIN}
                className="rounded-full bg-sky-600 px-5 py-2 text-xs font-semibold text-white hover:bg-sky-700"
              >
                Đăng nhập tài khoản Admin
              </Link>
              <Link
                href={ROUTES.TRIPS}
                className="rounded-full border border-stone-300 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-stone-100"
              >
                Quay lại Chuyến đi
              </Link>
            </div>
          </section>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-editorial text-3xl font-bold text-slate-900">
                  Quản trị Catalog SkyRoute
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Thêm hoặc ẩn địa điểm tham quan, quán ăn và cơ sở lưu trú theo
                  tọa độ WGS84 (PostGIS).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  aria-label="Chọn thành phố quản trị"
                  value={citySlug}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 focus:border-sky-500 focus:outline-none"
                >
                  {SKYROUTE_CITIES.map((city) => (
                    <option key={city.slug} value={city.slug}>
                      {city.displayName} ({city.region})
                    </option>
                  ))}
                </select>

                <div
                  role="tablist"
                  className="inline-flex rounded-full border border-stone-200 bg-white p-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'places'}
                    onClick={() => setActiveTab('places')}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      activeTab === 'places'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    Địa điểm
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'stays'}
                    onClick={() => setActiveTab('stays')}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      activeTab === 'stays'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Lưu trú
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left Form */}
              <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs lg:col-span-5">
                {activeTab === 'places' ? (
                  <form
                    onSubmit={placeForm.handleSubmit((v) =>
                      createPlaceMutation.mutate(v),
                    )}
                    noValidate
                    className="space-y-3.5"
                  >
                    <h2 className="flex items-center gap-1.5 text-base font-bold text-slate-900">
                      <Plus className="h-4 w-4 text-sky-600" />
                      Thêm địa điểm tại {cityPreset.displayName}
                    </h2>

                    <div>
                      <label
                        htmlFor="admin-place-name"
                        className="mb-1 block text-xs font-semibold text-slate-700"
                      >
                        Tên địa điểm
                      </label>
                      <input
                        id="admin-place-name"
                        type="text"
                        placeholder="Ví dụ: Tiệm Cà Phê Túi Mơ To"
                        {...placeForm.register('name')}
                        className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                      />
                      {placeForm.formState.errors.name && (
                        <p className="mt-1 text-xs text-rose-600">
                          {placeForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="admin-place-category"
                          className="mb-1 block text-xs font-semibold text-slate-700"
                        >
                          Danh mục
                        </label>
                        <select
                          id="admin-place-category"
                          {...placeForm.register('category')}
                          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                        >
                          <option value="attraction">Tham quan</option>
                          <option value="restaurant">Nhà hàng / Ăn uống</option>
                          <option value="cafe">Cà phê</option>
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="admin-place-price"
                          className="mb-1 block text-xs font-semibold text-slate-700"
                        >
                          Mức giá (1–3)
                        </label>
                        <input
                          id="admin-place-price"
                          type="number"
                          min={1}
                          max={3}
                          {...placeForm.register('priceLevel')}
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-5 pt-1 text-xs font-medium text-slate-700">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          {...placeForm.register('isOutdoor')}
                          className="rounded border-stone-300 text-sky-600"
                        />
                        Ngoài trời (Outdoor)
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          {...placeForm.register('hasAc')}
                          className="rounded border-stone-300 text-sky-600"
                        />
                        Có điều hòa (AC)
                      </label>
                    </div>

                    <div>
                      <label
                        htmlFor="admin-place-address"
                        className="mb-1 block text-xs font-semibold text-slate-700"
                      >
                        Địa chỉ
                      </label>
                      <input
                        id="admin-place-address"
                        type="text"
                        placeholder="Hẻm 31 Sào Nam, Đà Lạt"
                        {...placeForm.register('address')}
                        className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="admin-place-lat"
                          className="mb-1 block text-xs font-semibold text-slate-700"
                        >
                          Vĩ độ (lat)
                        </label>
                        <input
                          id="admin-place-lat"
                          type="number"
                          step="0.0001"
                          {...placeForm.register('lat')}
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="admin-place-lng"
                          className="mb-1 block text-xs font-semibold text-slate-700"
                        >
                          Kinh độ (lng)
                        </label>
                        <input
                          id="admin-place-lng"
                          type="number"
                          step="0.0001"
                          {...placeForm.register('lng')}
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={createPlaceMutation.isPending}
                      className="w-full rounded-full bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
                    >
                      {createPlaceMutation.isPending
                        ? 'Đang lưu...'
                        : 'Lưu địa điểm vào Catalog'}
                    </button>
                  </form>
                ) : (
                  <form
                    onSubmit={stayForm.handleSubmit((v) =>
                      createStayMutation.mutate(v),
                    )}
                    noValidate
                    className="space-y-3.5"
                  >
                    <h2 className="flex items-center gap-1.5 text-base font-bold text-slate-900">
                      <Plus className="h-4 w-4 text-sky-600" />
                      Thêm chỗ ở tại {cityPreset.displayName}
                    </h2>

                    <div>
                      <label
                        htmlFor="admin-stay-name"
                        className="mb-1 block text-xs font-semibold text-slate-700"
                      >
                        Tên cơ sở lưu trú
                      </label>
                      <input
                        id="admin-stay-name"
                        type="text"
                        placeholder="Ví dụ: Pine Crest Homestay"
                        {...stayForm.register('name')}
                        className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="admin-stay-type"
                          className="mb-1 block text-xs font-semibold text-slate-700"
                        >
                          Loại hình
                        </label>
                        <select
                          id="admin-stay-type"
                          {...stayForm.register('stayType')}
                          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                        >
                          <option value="homestay">Homestay</option>
                          <option value="hotel">Khách sạn</option>
                          <option value="resort">Resort</option>
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="admin-stay-price"
                          className="mb-1 block text-xs font-semibold text-slate-700"
                        >
                          Giá / đêm (VNĐ)
                        </label>
                        <input
                          id="admin-stay-price"
                          type="number"
                          step="50000"
                          {...stayForm.register('pricePerNight')}
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="admin-stay-address"
                        className="mb-1 block text-xs font-semibold text-slate-700"
                      >
                        Địa chỉ
                      </label>
                      <input
                        id="admin-stay-address"
                        type="text"
                        placeholder="12 Trần Phú, Đà Lạt"
                        {...stayForm.register('address')}
                        className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="admin-stay-lat"
                          className="mb-1 block text-xs font-semibold text-slate-700"
                        >
                          Vĩ độ (lat)
                        </label>
                        <input
                          id="admin-stay-lat"
                          type="number"
                          step="0.0001"
                          {...stayForm.register('lat')}
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="admin-stay-lng"
                          className="mb-1 block text-xs font-semibold text-slate-700"
                        >
                          Kinh độ (lng)
                        </label>
                        <input
                          id="admin-stay-lng"
                          type="number"
                          step="0.0001"
                          {...stayForm.register('lng')}
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={createStayMutation.isPending}
                      className="w-full rounded-full bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
                    >
                      {createStayMutation.isPending
                        ? 'Đang lưu...'
                        : 'Lưu chỗ ở vào Catalog'}
                    </button>
                  </form>
                )}
              </div>

              {/* Right List */}
              <div className="space-y-3 lg:col-span-7">
                {activeTab === 'places' ? (
                  <>
                    <h2 className="text-sm font-semibold text-slate-700">
                      Danh sách địa điểm trong bán kính 5 km (
                      {placesQuery.data?.data.length ?? 0})
                    </h2>
                    {(placesQuery.data?.data ?? []).map((place) => (
                      <div
                        key={place.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200/90 bg-white px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {place.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {place.category} •{' '}
                            {place.isOutdoor ? 'Ngoài trời' : 'Trong nhà'} • (
                            {place.location.lat.toFixed(4)},{' '}
                            {place.location.lng.toFixed(4)})
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Ẩn địa điểm ${place.name}`}
                          onClick={() => deletePlaceMutation.mutate(place.id)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Ẩn
                        </button>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <h2 className="text-sm font-semibold text-slate-700">
                      Danh sách cơ sở lưu trú (
                      {staysQuery.data?.data.length ?? 0})
                    </h2>
                    {(staysQuery.data?.data ?? []).map((stay) => (
                      <div
                        key={stay.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200/90 bg-white px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {stay.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {stay.stayType} •{' '}
                            {stay.pricePerNight.toLocaleString('vi-VN')} đ/đêm
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Ẩn chỗ ở ${stay.name}`}
                          onClick={() => deleteStayMutation.mutate(stay.id)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Ẩn
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
