import type { Metadata } from 'next';
import { DiscoveryExplorer } from '@/features/discovery';

const CITY_SLUG_MAP: Record<string, string> = {
  'da-lat': 'Da Lat',
  'da-nang': 'Da Nang',
};

function resolveCityName(slug: string): string {
  const normalized = decodeURIComponent(slug).toLowerCase();
  return CITY_SLUG_MAP[normalized] ?? decodeURIComponent(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const cityName = resolveCityName(city);
  return {
    title: `Khám phá ${cityName} | SkyRoute Radar`,
    description: `Quét Radar lân cận 1km–5km các điểm tham quan, ẩm thực và cà phê tại ${cityName}.`,
  };
}

export default async function ExploreCityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  return <DiscoveryExplorer initialCity={resolveCityName(city)} />;
}
