import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <span className="inline-block rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
            SkyRoute
          </span>
          <p className="mt-2 text-xs text-slate-500">
            Smart Travel Companion
          </p>
        </div>
        {children}
      </section>
    </main>
  );
}
