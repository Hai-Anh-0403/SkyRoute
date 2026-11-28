'use client';

import {
  Compass,
  LogOut,
  Menu,
  Plus,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuthStore, useLogout } from '@/features/auth';
import { ROUTES } from '@/shared/lib/routes';

interface AppHeaderProps {
  leftSlot?: ReactNode;
  assistantHref?: string;
  onOpenProfile?: () => void;
  onCreateTrip?: () => void;
}

export function AppHeader({
  leftSlot,
  assistantHref,
  onOpenProfile,
  onCreateTrip,
}: AppHeaderProps) {
  const pathname = usePathname() ?? '/';
  const user = useAuthStore((s) => s.user);
  const isBootstrapped = useAuthStore((s) => s.isBootstrapped);
  const logoutMutation = useLogout();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const isHome = pathname === '/';
  const isExplore = pathname.startsWith('/explore');
  const isTrips = pathname.startsWith('/trips');
  const isAdmin = pathname.startsWith('/admin');

  const displayName = user?.fullName?.trim() || 'Traveler';
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const navItems = [
    { href: ROUTES.HOME, label: 'Trang chủ', active: isHome },
    {
      href: ROUTES.EXPLORE_CITY('da-lat'),
      label: 'Khám phá Radar',
      active: isExplore,
    },
    { href: ROUTES.TRIPS, label: 'Chuyến đi của tôi', active: isTrips },
    {
      href: assistantHref ?? ROUTES.TRIPS,
      label: 'Trợ lý du lịch',
      active: false,
    },
    ...(user?.role === 'admin'
      ? [{ href: ROUTES.ADMIN, label: 'Quản trị', active: isAdmin }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-30 w-full border-b border-stone-200/80 bg-[#FAFAF9]/95 backdrop-blur-md">
      <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <header className="sticky top-0 z-30 w-full border-b border-[#0a0a0a]/12 bg-[#f8f8f8]">
          <div className="flex h-[72px] w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
            {/* Left: Brand + optional context slot (e.g. City selector on /explore) */}
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href={ROUTES.HOME}
                className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6b3a]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-600">
                  <Compass className="h-4.5 w-4.5" aria-hidden="true" />
                  <span
                    aria-hidden="true"
                    className="grid h-7 w-7 grid-cols-2 place-items-center gap-0.5 rounded-md border border-[#0a0a0a]/12 bg-white p-1.5"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0a0a0a]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0a0a0a]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0a0a0a]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1f6b3a]" />
                  </span>
                  <span className="text-lg font-bold tracking-tight text-slate-900">
                    <span className="text-lg font-medium tracking-[-0.03em] text-[#0a0a0a]">
                      SkyRoute
                    </span>
                  </Link>
                  {leftSlot ? (
                    <div className="hidden items-center gap-2 border-l border-stone-200 pl-3 sm:flex">
                      <div className="hidden items-center gap-2 border-l border-[#0a0a0a]/12 pl-3 sm:flex">
                        {leftSlot}
                      </div>
          ) : null}
                    </div>

        {/* Center: Unified Desktop Navigation */}
                  <nav
                    aria-label="Điều hướng chính"
                    className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex"
                    className="hidden items-center gap-7 text-[15px] font-medium text-[#6a6a6a] md:flex"
                  >
                    {navItems.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        aria-current={item.active ? 'page' : undefined}
                        className={`py-5 transition ${className = {`py-6 transition ${item.active
                              ? 'border-b-2 border-sky-600 font-semibold text-sky-700'
                              : 'hover:text-slate-900'
                                ? 'border-b-2 border-[#1f6b3a] text-[#0a0a0a]'
                                : 'hover:text-[#0a0a0a]'
                            }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right: Auth State, Primary CTA & Mobile Menu Toggle */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {!isBootstrapped && !user ? (
            <div
              aria-hidden="true"
              className="h-8 w-24 animate-pulse rounded-full bg-stone-200/70 sm:w-28"
              className="h-9 w-24 animate-pulse rounded-lg bg-[#eeeeee] sm:w-28"
            />
          ) : user ? (
            <>
              <Link
                href={ROUTES.TRIPS}
                className="hidden items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 transition hover:border-sky-300 hover:bg-sky-50 sm:inline-flex"
                className="hidden items-center gap-2 rounded-lg border border-[#0a0a0a]/12 bg-white px-3 py-1.5 text-sm font-medium text-[#0a0a0a] transition hover:border-[#0a0a0a]/25 sm:inline-flex"
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700"
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-[#e6f2ea] text-xs font-semibold text-[#1f6b3a]"
                >
                  {avatarInitial}
                </span>
                <span className="max-w-[130px] truncate">{displayName}</span>
              </Link>

              {onOpenProfile ? (
                <button
                  type="button"
                  onClick={onOpenProfile}
                  title="Hồ sơ & Sở thích"
                  aria-label="Hồ sơ & Sở thích"
                  className="hidden rounded-full p-2 text-slate-600 transition hover:bg-stone-200/70 hover:text-slate-900 sm:inline-flex"
                  className="hidden h-9 w-9 items-center justify-center rounded-lg border border-[#0a0a0a]/12 bg-white text-[#6a6a6a] transition hover:border-[#0a0a0a]/25 hover:text-[#0a0a0a] sm:inline-flex"
                >
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                title="Đăng xuất"
                aria-label="Đăng xuất"
                className="hidden rounded-full p-2 text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 sm:inline-flex"
                className="hidden h-9 w-9 items-center justify-center rounded-lg border border-[#0a0a0a]/12 bg-white text-[#6a6a6a] transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 sm:inline-flex"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>

              {onCreateTrip ? (
                <button
                  type="button"
                  onClick={onCreateTrip}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 sm:px-4 sm:text-sm"
                  className="sr-btn-primary inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-medium"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Tạo chuyến đi</span>
                </button>
              ) : (
                <Link
                  href={ROUTES.TRIPS}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 sm:px-4 sm:text-sm"
                  className="sr-btn-primary inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-medium"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Tạo chuyến đi</span>
                </Link>
              )}
            </>
          ) : (
            <>
              <Link
                href={ROUTES.LOGIN}
                className="rounded-full px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-stone-200/60 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 sm:px-3.5 sm:text-sm"
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-[#0a0a0a] transition hover:bg-[#eeeeee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6b3a]"
              >
                Đăng nhập
              </Link>
              <Link
                href={ROUTES.TRIPS}
                className="rounded-full bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 sm:px-4.5 sm:text-sm"
                className="sr-btn-primary inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6b3a]"
              >
                Tạo chuyến đi
              </Link>
            </>
          )}

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={
              isMobileMenuOpen
                ? 'Đóng menu điều hướng'
                : 'Mở menu điều hướng'
            }
            className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white p-2 text-slate-700 transition hover:bg-stone-100 md:hidden"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#0a0a0a]/12 bg-white text-[#0a0a0a] transition hover:bg-[#eeeeee] md:hidden"
          >
            {isMobileMenuOpen ? (
              <X className="h-4.5 w-4.5" aria-hidden="true" />
            ) : (
              <Menu className="h-4.5 w-4.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen ? (
        <div
          id="mobile-nav-drawer"
          className="border-t border-stone-200/80 bg-[#FAFAF9] px-4 pb-5 pt-3 shadow-md md:hidden"
          className="border-t border-[#0a0a0a]/12 bg-[#f8f8f8] px-4 pb-5 pt-3 md:hidden"
        >
          {leftSlot ? (
            <div className="mb-3 border-b border-stone-200/80 pb-3 sm:hidden">
            <div className="mb-3 border-b border-[#0a0a0a]/12 pb-3 sm:hidden">
              {leftSlot}
            </div>
          ) : null}

          <nav aria-label="Điều hướng di động" className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`rounded-xl px-3 py-2.5 text - sm font - medium transition ${
                      className={`rounded-lg px-3 py-3 text-base font-medium transition ${item.active
                          ? 'bg-sky-50 font-semibold text-sky-700'
                          : 'text-slate-700 hover:bg-stone-200/60 hover:text-slate-900'
                            ? 'bg-[#e6f2ea] text-[#1f6b3a]'
                            : 'text-[#0a0a0a] hover:bg-[#eeeeee]'
                        }`
                    }
                    >
                    { item.label }
              </Link>
            ))}
                </nav>

                {user ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/80 pt-3 sm:hidden">
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#0a0a0a]/12 pt-3 sm:hidden">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700"
                          className="flex h-7 w-7 items-center justify-center rounded-md bg-[#e6f2ea] text-xs font-semibold text-[#1f6b3a]"
                        >
                          {avatarInitial}
                        </span>
                        <span className="text-sm font-medium text-slate-800">
                          <span className="text-sm font-medium text-[#0a0a0a]">
                            {displayName}
                          </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {onOpenProfile ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              onOpenProfile();
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                            className="sr-btn-tonal inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                            Sở thích
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            logoutMutation.mutate();
                          }}
                          disabled={logoutMutation.isPending}
                          className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700"
                        >
                          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                          Đăng xuất
                        </button>
                      </div>
                    </div>
          ) : null}
                  </div>
                ) : null}
              </header>
              );
}
