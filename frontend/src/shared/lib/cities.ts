import type { Coordinates } from '@/shared/types/geo.types';

export interface CityPreset {
  slug: string;
  canonicalName: string;
  displayName: string;
  region: 'Tây Nguyên' | 'Miền Bắc';
  center: Coordinates;
}

export const SKYROUTE_CITIES: CityPreset[] = [
  {
    slug: 'da-lat',
    canonicalName: 'Da Lat',
    displayName: 'Đà Lạt',
    region: 'Tây Nguyên',
    center: { lat: 11.9404, lng: 108.4583 },
  },
  {
    slug: 'ha-noi',
    canonicalName: 'Ha Noi',
    displayName: 'Hà Nội',
    region: 'Miền Bắc',
    center: { lat: 21.0285, lng: 105.8542 },
  },
  {
    slug: 'ninh-binh',
    canonicalName: 'Ninh Binh',
    displayName: 'Ninh Bình',
    region: 'Miền Bắc',
    center: { lat: 20.2506, lng: 105.9745 },
  },
  {
    slug: 'ha-long',
    canonicalName: 'Ha Long',
    displayName: 'Hạ Long (Quảng Ninh)',
    region: 'Miền Bắc',
    center: { lat: 20.9599, lng: 107.0425 },
  },
  {
    slug: 'tam-dao',
    canonicalName: 'Tam Dao',
    displayName: 'Tam Đảo (Vĩnh Phúc)',
    region: 'Miền Bắc',
    center: { lat: 21.4569, lng: 105.6431 },
  },
  {
    slug: 'sapa',
    canonicalName: 'Sapa',
    displayName: 'Sa Pa (Lào Cai)',
    region: 'Miền Bắc',
    center: { lat: 22.3364, lng: 103.8438 },
  },
  {
    slug: 'mai-chau',
    canonicalName: 'Mai Chau',
    displayName: 'Mai Châu (Hòa Bình)',
    region: 'Miền Bắc',
    center: { lat: 20.6594, lng: 105.0725 },
  },
  {
    slug: 'moc-chau',
    canonicalName: 'Moc Chau',
    displayName: 'Mộc Châu (Sơn La)',
    region: 'Miền Bắc',
    center: { lat: 20.8469, lng: 104.6417 },
  },
];

function normalizeCityKey(value: string): string {
  return decodeURIComponent(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function resolveCityPreset(cityOrSlug?: string | null): CityPreset {
  if (!cityOrSlug) {
    return SKYROUTE_CITIES[0];
  }
  const key = normalizeCityKey(cityOrSlug);
  const found = SKYROUTE_CITIES.find(
    (c) =>
      normalizeCityKey(c.slug) === key ||
      normalizeCityKey(c.canonicalName) === key ||
      normalizeCityKey(c.displayName).startsWith(key),
  );
  return found ?? SKYROUTE_CITIES[0];
}
