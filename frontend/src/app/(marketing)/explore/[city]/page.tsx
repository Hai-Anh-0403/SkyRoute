import type { Metadata } from 'next';
import { DiscoveryExplorer } from '@/features/discovery';
import { resolveCityPreset } from '@/shared/lib/cities';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const preset = resolveCityPreset(city);
  return {
    title: `Khám phá ${preset.displayName} | SkyRoute Radar`,
    description: `Quét Radar lân cận 1km–5km các điểm tham quan, ẩm thực và cà phê tại ${preset.displayName}.`,
  };
}

export default async function ExploreCityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const preset = resolveCityPreset(city);
  return <DiscoveryExplorer initialCity={preset.canonicalName} />;
}
