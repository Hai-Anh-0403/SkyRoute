export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  EXPLORE_CITY: (city: string) => `/explore/${encodeURIComponent(city)}`,
  TRIPS: '/trips',
  TRIP_WORKSPACE: (tripId: number | string) => `/trips/${tripId}`,
  ADMIN: '/admin',
} as const;
