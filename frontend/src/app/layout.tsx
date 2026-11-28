import type { Metadata, Viewport } from 'next';
import {
  Be_Vietnam_Pro,
  Host_Grotesk,
  JetBrains_Mono,
} from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

const hostGrotesk = Host_Grotesk({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-host',
  display: 'swap',
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-vietnam',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f8f8f8',
};

export const metadata: Metadata = {
  title: 'SkyRoute: Lập lịch trình du lịch thích ứng thời tiết',
  description:
    'Quét radar địa điểm 1–5 km, sắp xếp 4 khung giờ, tự động đổi kế hoạch trong nhà khi mưa từ 60% và chọn chỗ ở ngay tâm hành trình.',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    title: 'SkyRoute: Lập lịch trình du lịch thích ứng thời tiết',
    description:
      'Quét radar địa điểm 1–5 km, sắp xếp 4 khung giờ và đổi kế hoạch dự phòng khi trời mưa.',
  },
  twitter: {
    card: 'summary_large_image',
  },
  other: {
    'site-kind': 'software',
    'page-type': 'software',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="vi"
      data-type="software"
      data-radius="soft"
      data-ground="sand"
      data-buttons="tonal"
      data-motion=""
      className={`${hostGrotesk.variable} ${beVietnamPro.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-[#f8f8f8] font-sans text-[#0a0a0a] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
