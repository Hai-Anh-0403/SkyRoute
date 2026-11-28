import { resolveCityPreset } from './cities';

const CITY_COVER_MAP: Record<string, string> = {
  'da-lat': '/images/destinations/da-lat.jpg',
  'ha-noi': '/images/destinations/ha-noi.jpg',
  'ninh-binh': '/images/destinations/ninh-binh.jpg',
  'ha-long': '/images/destinations/ha-long.jpg',
  sapa: '/images/destinations/sapa.jpg',
  'tam-dao': '/images/destinations/da-lat.jpg',
  'mai-chau': '/images/destinations/sapa.jpg',
  'moc-chau': '/images/destinations/sapa.jpg',
};

export function getCityCoverImage(cityOrSlug?: string | null): string {
  const preset = resolveCityPreset(cityOrSlug);
  return CITY_COVER_MAP[preset.slug] ?? '/images/destinations/da-lat.jpg';
}

export interface CuratedTripTemplate {
  id: string;
  title: string;
  destinationCity: string;
  citySlug: string;
  days: number;
  imageSrc: string;
}

export const CURATED_TRIP_TEMPLATES: CuratedTripTemplate[] = [
  {
    id: 'dalat-healing',
    title: 'Đà Lạt 3N2Đ Chữa lành',
    destinationCity: 'Da Lat',
    citySlug: 'da-lat',
    days: 3,
    imageSrc: '/images/destinations/da-lat.jpg',
  },
  {
    id: 'hanoi-food',
    title: 'Hà Nội 2N1Đ Ẩm thực Phố Cổ',
    destinationCity: 'Ha Noi',
    citySlug: 'ha-noi',
    days: 2,
    imageSrc: '/images/destinations/ha-noi.jpg',
  },
  {
    id: 'sapa-clouds',
    title: 'Sa Pa 3N2Đ Săn mây',
    destinationCity: 'Sapa',
    citySlug: 'sapa',
    days: 3,
    imageSrc: '/images/destinations/sapa.jpg',
  },
];
