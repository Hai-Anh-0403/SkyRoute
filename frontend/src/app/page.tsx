import Link from 'next/link';
import { SKYROUTE_CITIES } from '@/shared/lib/cities';
import { ROUTES } from '@/shared/lib/routes';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-12 text-center">
      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
        SkyRoute — Smart Travel Companion
      </span>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        Lịch trình du lịch thích ứng thời tiết & không gian
      </h1>
      <p className="mt-4 max-w-2xl text-base text-slate-600">
        Khám phá điểm đến bằng Radar PostGIS, kéo-thả lịch trình 4 khung giờ,
        tự động hoán đổi Kế hoạch B khi trời mưa và tìm phòng tại Tâm chuyến đi.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          href={ROUTES.EXPLORE_CITY('ha-noi')}
          className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
        >
          Khám phá Miền Bắc & Hà Nội
        </Link>
        <Link
          href={ROUTES.EXPLORE_CITY('da-lat')}
          className="rounded-lg border border-sky-200 bg-sky-50 px-5 py-2.5 text-sm font-medium text-sky-700 hover:bg-sky-100"
        >
          Khám phá Radar Đà Lạt
        </Link>
        <Link
          href={ROUTES.TRIPS}
          className="rounded-lg border border-sky-200 bg-white px-5 py-2.5 text-sm font-medium text-sky-700 hover:bg-sky-50"
        >
          Lập lịch trình
        </Link>
        <Link
          href={ROUTES.LOGIN}
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Đăng nhập
        </Link>
      </div>

      <div className="mt-10 w-full max-w-3xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Điểm đến sẵn sàng dữ liệu
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {SKYROUTE_CITIES.map((city) => (
            <Link
              key={city.slug}
              href={ROUTES.EXPLORE_CITY(city.slug)}
              className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
            >
              {city.displayName}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
