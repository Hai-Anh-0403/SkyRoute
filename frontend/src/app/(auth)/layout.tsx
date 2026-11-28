import { ArrowLeft, CloudRain, MapPin, Radar } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ROUTES } from '@/shared/lib/routes';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8f8f8] text-[#0a0a0a] lg:grid lg:grid-cols-12">
      {/* Left Visual Column (Desktop) */}
      <aside className="relative hidden overflow-hidden bg-[#0a0a0a] lg:col-span-6 lg:flex lg:flex-col lg:justify-between lg:p-10">
        <Image
          src="/images/destinations/da-lat.jpg"
          alt="Đồi thông Đà Lạt trong sương sớm"
          fill
          priority
          sizes="50vw"
          className="object-cover opacity-80"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/90 via-[#0a0a0a]/45 to-[#0a0a0a]/30"
        />

        <div className="relative z-10">
          <Link
            href={ROUTES.HOME}
            className="inline-flex items-center gap-2.5 rounded-lg border border-white/15 bg-[#0a0a0a]/70 px-3.5 py-2 text-white transition hover:bg-[#0a0a0a]/90"
          >
            <span
              aria-hidden="true"
              className="grid h-6 w-6 grid-cols-2 place-items-center gap-0.5 rounded bg-white p-1"
            >
              <span className="h-1 w-1 rounded-full bg-[#0a0a0a]" />
              <span className="h-1 w-1 rounded-full bg-[#0a0a0a]" />
              <span className="h-1 w-1 rounded-full bg-[#0a0a0a]" />
              <span className="h-1 w-1 rounded-full bg-[#1f6b3a]" />
            </span>
            <span className="text-base font-medium tracking-[-0.03em]">
              SkyRoute
            </span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-3xl font-medium leading-[1.12] tracking-[-0.035em] text-white xl:text-4xl">
            Lịch trình 4 khung giờ, tự đổi kế hoạch khi trời mưa
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[#d4d4d2]">
            Quét điểm đến trong bán kính 1–5 km bằng PostGIS, hoán đổi điểm
            trong nhà khi mưa từ 60% và chọn chỗ ở ngay tâm hành trình.
          </p>

          <ul className="mt-6 space-y-2.5 text-sm text-white/90">
            <li className="flex items-center gap-2.5">
              <Radar className="h-4 w-4 text-[#86c79c]" aria-hidden="true" />
              Radar không gian 1–5 km & ẩm thực theo thời tiết
            </li>
            <li className="flex items-center gap-2.5">
              <CloudRain className="h-4 w-4 text-amber-300" aria-hidden="true" />
              Hoán đổi Kế hoạch dự phòng trong nhà trong 3 km khi mưa ≥ 60%
            </li>
            <li className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 text-[#86c79c]" aria-hidden="true" />
              Gợi ý phòng lưu trú ngay tại trọng tâm chuyến đi
            </li>
          </ul>
        </div>
      </aside>

      {/* Right Auth Form Column */}
      <main className="flex min-h-screen flex-col justify-between px-4 py-8 sm:px-8 lg:col-span-6 lg:px-12">
        <div className="flex items-center justify-between">
          <Link
            href={ROUTES.HOME}
            className="sr-btn-tonal inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Quay lại trang chủ
          </Link>

          <Link
            href={ROUTES.HOME}
            className="flex items-center gap-2 lg:hidden"
          >
            <span
              aria-hidden="true"
              className="grid h-6 w-6 grid-cols-2 place-items-center gap-0.5 rounded border border-[#0a0a0a]/12 bg-white p-1"
            >
              <span className="h-1 w-1 rounded-full bg-[#0a0a0a]" />
              <span className="h-1 w-1 rounded-full bg-[#0a0a0a]" />
              <span className="h-1 w-1 rounded-full bg-[#0a0a0a]" />
              <span className="h-1 w-1 rounded-full bg-[#1f6b3a]" />
            </span>
            <span className="text-base font-medium tracking-[-0.03em] text-[#0a0a0a]">
              SkyRoute
            </span>
          </Link>
        </div>

        <section className="mx-auto my-8 w-full max-w-md rounded-[20px] border border-[#0a0a0a]/12 bg-white p-7 sm:p-8">
          {children}
        </section>

        <p className="text-center text-xs text-[#6a6a6a]">
          SkyRoute · Lập lịch trình du lịch thích ứng thời tiết
        </p>
      </main>
    </div>
  );
}
