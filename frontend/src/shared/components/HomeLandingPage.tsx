'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import { useAuthStore, useLogout } from '@/features/auth';
import { useCityWeatherBatch } from '@/features/weather-fallback';
import { SKYROUTE_CITIES, type CityPreset } from '@/shared/lib/cities';
import { ROUTES } from '@/shared/lib/routes';

interface FeaturedDestinationMeta {
  slug: string;
  imageSrc: string;
  imageAlt: string;
  fallbackWeather: string;
  radarTagline: string;
}

const CONDITION_VI: Record<string, string> = {
  rainy: 'Có mưa',
  cloudy: 'Nhiều mây',
  sunny: 'Nắng ráo',
  cold: 'Se lạnh',
  hot: 'Nắng ấm',
  clear: 'Quang đãng',
};

const FEATURED_DESTINATIONS: FeaturedDestinationMeta[] = [
  {
    slug: 'da-lat',
    imageSrc: '/images/destinations/da-lat.jpg',
    imageAlt: 'Đồi thông Đà Lạt trong sương sớm',
    fallbackWeather: '19°C • Sương mù',
    radarTagline: '24 điểm Indoor/Outdoor',
  },
  {
    slug: 'ha-noi',
    imageSrc: '/images/destinations/ha-noi.jpg',
    imageAlt: 'Hồ Hoàn Kiếm và phố cổ Hà Nội buổi sáng',
    fallbackWeather: '26°C • Quang đãng',
    radarTagline: 'Radar Phố Cổ & Ẩm thực',
  },
  {
    slug: 'ninh-binh',
    imageSrc: '/images/destinations/ninh-binh.jpg',
    imageAlt: 'Sông núi đá vôi Tràng An Ninh Bình',
    fallbackWeather: '25°C • Nắng nhẹ',
    radarTagline: 'Tuyến cảnh quan 1–5 km',
  },
  {
    slug: 'ha-long',
    imageSrc: '/images/destinations/ha-long.jpg',
    imageAlt: 'Vịnh Hạ Long với các đảo đá vôi trên mặt nước xanh ngọc',
    fallbackWeather: '24°C • Có gió',
    radarTagline: 'Lưu trú tâm vịnh Centroid',
  },
];

const ARCHITECTURE_DIAGRAM_SPEC = JSON.stringify({
  layout: 'lanes',
  alt: 'Quy trình SkyRoute: đọc Open-Meteo và PostGIS rồi xử lý song song Radar 1-5 km, Plan B khi mưa và Lưu trú tâm Centroid',
  ground: 'dots',
  motion: { cycle: 3.2 },
  input: { label: 'Open-Meteo + PostGIS', meta: 'SRID 4326' },
  core: { label: 'SkyRoute Engine', meta: '4 khung giờ' },
  lanes: [
    { label: 'Radar 1–5 km', meta: 'ST_DWithin' },
    { label: 'Plan B ≤ 3 km', meta: 'Mưa ≥ 60%' },
    { label: 'Tâm Centroid', meta: 'Lệch ≤ 8 km' },
  ],
});

const TASTE_MODULE_SCRIPTS = [
  '/assets/system.js',
  '/assets/motion/motion.js',
  '/assets/layout/layout.js',
  '/assets/diagrams/mount.js',
  '/assets/moments/moments.js',
];

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();
}

export function HomeLandingPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogout();

  useEffect(() => {
    const added: HTMLScriptElement[] = [];

    const bgScript = document.createElement('script');
    bgScript.src = '/assets/backgrounds/backgrounds.js';
    document.body.appendChild(bgScript);
    added.push(bgScript);

    for (const src of TASTE_MODULE_SCRIPTS) {
      const mod = document.createElement('script');
      mod.type = 'module';
      mod.src = src;
      document.body.appendChild(mod);
      added.push(mod);
    }

    return () => {
      for (const node of added) {
        node.remove();
      }
    };
  }, []);

  const weatherQueries = useCityWeatherBatch([
    'Da Lat',
    'Ha Noi',
    'Ninh Binh',
    'Ha Long',
  ]);

  const featuredCities = useMemo(() => {
    const map = new Map<string, CityPreset>(
      SKYROUTE_CITIES.map((city) => [city.slug, city]),
    );
    return FEATURED_DESTINATIONS.map((meta, idx) => {
      const preset = map.get(meta.slug);
      const liveForecast = weatherQueries[idx]?.data;
      const primarySlot =
        liveForecast?.slots.find((s) => s.timeSlot === 'afternoon') ??
        liveForecast?.slots[0];
      const weatherPrefix = primarySlot
        ? `${Math.round(primarySlot.temperatureC)}°C • ${CONDITION_VI[primarySlot.conditionTag] ?? primarySlot.conditionTag}${primarySlot.rainProbability >= 50 ? ` (${primarySlot.rainProbability}% mưa)` : ''}`
        : meta.fallbackWeather;
      return {
        ...meta,
        displayName: preset?.displayName ?? meta.slug,
        canonicalName: preset?.canonicalName ?? meta.slug,
        region: preset?.region ?? 'Miền Bắc',
        summary: `${weatherPrefix} • ${meta.radarTagline}`,
      };
    });
  }, [weatherQueries]);

  const secondaryCities = useMemo(() => {
    const featuredSlugs = new Set(FEATURED_DESTINATIONS.map((d) => d.slug));
    return SKYROUTE_CITIES.filter((city) => !featuredSlugs.has(city.slug));
  }, []);

  const normalizedQuery = normalizeSearch(query);

  const filteredFeatured = useMemo(() => {
    if (!normalizedQuery) return featuredCities;
    return featuredCities.filter(
      (city) =>
        normalizeSearch(city.displayName).includes(normalizedQuery) ||
        normalizeSearch(city.canonicalName).includes(normalizedQuery) ||
        normalizeSearch(city.summary).includes(normalizedQuery) ||
        normalizeSearch(city.region).includes(normalizedQuery),
    );
  }, [featuredCities, normalizedQuery]);

  const filteredSecondary = useMemo(() => {
    if (!normalizedQuery) return secondaryCities;
    return secondaryCities.filter(
      (city) =>
        normalizeSearch(city.displayName).includes(normalizedQuery) ||
        normalizeSearch(city.canonicalName).includes(normalizedQuery) ||
        normalizeSearch(city.region).includes(normalizedQuery),
    );
  }, [secondaryCities, normalizedQuery]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const firstMatch = filteredFeatured[0] ?? filteredSecondary[0];
    if (firstMatch) {
      router.push(ROUTES.EXPLORE_CITY(firstMatch.slug));
    }
  };

  const hasAnyResult =
    filteredFeatured.length > 0 || filteredSecondary.length > 0;

  return (
    <div className="sr-landing-root">
      {/* Dealt Nav: nav-cards + dots mark + tonal buttons */}
      <header className="nav">
        <div className="wrap nav__bar">
          <a className="skip-link" href="#top">
            Chuyển tới nội dung
          </a>
          <Link className="nav__logo" href="#top">
            <span className="mark" data-mark="dots" aria-hidden="true" />
            SkyRoute
          </Link>

          <nav className="nav__links" aria-label="Điều hướng chính">
            <div className="nav__item">
              <a className="nav__link" href="#destinations">
                Điểm đến
                <svg className="chev" viewBox="0 0 12 12" aria-hidden="true">
                  <path
                    d="M3 4.5l3 3 3-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
              <div className="nav__menu">
                <div className="wrap grid">
                  {featuredCities.slice(0, 3).map((city) => (
                    <Link
                      key={city.slug}
                      className="menu-card span-4"
                      href={ROUTES.EXPLORE_CITY(city.slug)}
                    >
                      <div className="panel">
                        <Image
                          src={city.imageSrc}
                          alt={city.imageAlt}
                          width={640}
                          height={400}
                          className="frame__img"
                        />
                      </div>
                      <span className="t-card">{city.displayName}</span>
                      <span className="t-small muted">{city.radarTagline}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <div className="nav__item">
              <a className="nav__link" href="#capabilities">
                Tính năng
              </a>
            </div>
            <div className="nav__item">
              <Link className="nav__link" href={ROUTES.EXPLORE_CITY('da-lat')}>
                Radar
              </Link>
            </div>
            <div className="nav__item">
              <Link className="nav__link" href={ROUTES.TRIPS}>
                Lịch trình
              </Link>
            </div>
          </nav>

          <div className="nav__actions">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => logoutMutation.mutate()}
                  className="nav__link"
                >
                  Đăng xuất
                </button>
                <Link className="btn btn--primary" href={ROUTES.TRIPS}>
                  Lập lịch 4 khung giờ
                </Link>
              </>
            ) : (
              <>
                <Link className="nav__link" href={ROUTES.LOGIN}>
                  Đăng nhập
                </Link>
                <Link className="btn btn--primary" href={ROUTES.TRIPS}>
                  Lập lịch 4 khung giờ
                </Link>
              </>
            )}
          </div>

          <button
            className="nav__toggle"
            type="button"
            aria-expanded="false"
            aria-label="Mở menu điều hướng"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                d="M2 5h14M2 13h14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>

      <main id="top">
        {/* Screen 1: Dealt Hero (centred) */}
        <section
          className="hero hero--centred"
          data-enter=""
          aria-labelledby="hero-heading"
        >
          <div className="wrap">
            <div className="hero-text">
              <div className="hero__c">
                <a className="pill" href="#capabilities">
                  <span>Radar PostGIS 1–5&nbsp;km</span>
                  <span className="muted">Open-Meteo 4 khung giờ</span>
                </a>
                <h1 id="hero-heading">
                  <span className="ly-mark" aria-hidden="true" /> Du lịch thông
                  minh trước mọi dự báo thời tiết
                </h1>
                <p className="hero__lead">
                  Sắp xếp lịch trình 4 khung giờ, tự động đổi Kế hoạch dự phòng
                  trong nhà trong bán kính 3&nbsp;km khi mưa từ 60% và gợi ý lưu
                  trú tại trọng tâm hành trình.
                </p>
                <div className="btn-row">
                  <a className="btn btn--primary" href="#destinations">
                    Khám phá điểm đến
                    <svg
                      className="m-arrow"
                      viewBox="0 0 12 12"
                      aria-hidden="true"
                    >
                      <path className="m-arrow__stem" d="M1 6h8" />
                      <path
                        className="m-arrow__head"
                        d="M4.5 2.5 8 6l-3.5 3.5"
                      />
                    </svg>
                  </a>
                  <Link className="btn btn--secondary" href={ROUTES.TRIPS}>
                    Lập lịch 4 khung giờ
                  </Link>
                </div>
              </div>

              {/* Live SkyRoute Software Window */}
              <div
                className="hero__window"
                role="img"
                aria-label="Giao diện SkyRoute hiển thị lịch trình Đà Lạt 4 khung giờ, cảnh báo mưa 70% và gợi ý đổi sang quán cà phê trong nhà"
              >
                <div className="ly-piece sr-win" aria-hidden="true">
                  <div className="sr-win__bar">
                    <span className="sr-win__dots">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span>
                      <b>Đà Lạt · Ngày 1</b> · 4 khung giờ
                    </span>
                    <span className="sp" />
                    <span>Radar 3 km • 18 địa điểm</span>
                  </div>
                  <div className="sr-win__body">
                    <div className="sr-win__rail">
                      <div className="sr-win__slot">
                        <time>08:30</time>
                        <b>Đồi chè Cầu Đất</b>
                        <span>Sáng · 19°C · Ngoài trời</span>
                      </div>
                      <div className="sr-win__slot">
                        <time>12:00</time>
                        <b>Lẩu gà lá é Tao Ngộ</b>
                        <span>Trưa · 21°C · Trong nhà</span>
                      </div>
                      <div className="sr-win__slot is-on">
                        <time>14:30</time>
                        <b>Thác Datanla</b>
                        <span>Chiều · Mưa 70% · Cần Plan B</span>
                      </div>
                      <div className="sr-win__slot">
                        <time>19:00</time>
                        <b>Centroid Stay • Cách tâm 0.5 km</b>
                        <span>Tối · Cụm lưu trú tối ưu</span>
                      </div>
                    </div>
                    <div className="sr-win__pane" data-ly-steps="900">
                      <div className="sr-win__alert">
                        Mưa 70% → Đổi sang Quán cà phê Indoor
                      </div>
                      <div className="sr-win__tool" data-step="">
                        PostGIS ST_DWithin(3 km) · 6 điểm trong nhà phù hợp
                      </div>
                      <div className="sr-win__card" data-step="">
                        Gợi ý thay thế khung Chiều: Tiệm Cà Phê Túi Mơ To (trong
                        nhà, cách 1.4 km). Giữ nguyên tổng quãng đường dưới 8 km
                        và tâm Centroid 0.5 km.
                        <small>Open-Meteo · 14:00–17:00 · Độ tin cậy cao</small>
                      </div>
                      <div className="sr-win__acts" data-step="">
                        <span>Áp dụng Plan B</span>
                        <span>Xem 5 ứng viên khác</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Screen 2: Ready-to-Explore Destinations + Live Search */}
        <section
          className="section"
          id="destinations"
          aria-labelledby="destinations-heading"
          style={{ '--h': 1 } as React.CSSProperties}
        >
          <div className="wrap">
            <div className="sr-dest-head">
              <div>
                <h2 id="destinations-heading">
                  Điểm đến sẵn sàng dữ liệu.{' '}
                  <span className="muted">
                    Mở bản đồ Radar PostGIS và dự báo từng khung giờ.
                  </span>
                </h2>
              </div>

              <form
                role="search"
                onSubmit={handleSearchSubmit}
                className="sr-search-form"
              >
                <label
                  htmlFor="destination-search"
                  className="sr-search-label"
                >
                  Tìm điểm đến Việt Nam
                </label>
                <div className="sr-search-box">
                  <Search
                    className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#595959]"
                    aria-hidden="true"
                  />
                  <input
                    id="destination-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Đà Lạt, Hà Nội, Ninh Bình..."
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Xóa từ khóa tìm kiếm"
                      className="absolute right-2.5 inline-flex h-8 w-8 items-center justify-center rounded-md text-[#595959] hover:bg-[#eeeeee] hover:text-[#0a0a0a]"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </form>
            </div>

            {hasAnyResult ? (
              <>
                {filteredFeatured.length > 0 ? (
                  <div className="sr-dest-grid">
                    {filteredFeatured.map((city) => (
                      <Link
                        key={city.slug}
                        href={ROUTES.EXPLORE_CITY(city.slug)}
                        className="card sr-dest-card"
                      >
                        <div className="sr-dest-card__media m-zoom">
                          <Image
                            src={city.imageSrc}
                            alt={city.imageAlt}
                            width={640}
                            height={400}
                            className="frame__img"
                          />
                        </div>
                        <div className="sr-dest-card__body">
                          <h3>{city.displayName}</h3>
                          <p>{city.summary}</p>
                          <span className="sr-dest-card__cta">
                            Mở bản đồ Radar
                            <ArrowRight
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : null}

                {filteredSecondary.length > 0 ? (
                  <div className="sr-secondary-strip">
                    <span className="t-label muted">Điểm đến khác</span>
                    <div className="sr-secondary-chips">
                      {filteredSecondary.map((city) => (
                        <Link
                          key={city.slug}
                          href={ROUTES.EXPLORE_CITY(city.slug)}
                          className="sr-city-chip"
                        >
                          <span>{city.displayName}</span>
                          <span>{city.region}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div
                className="card"
                style={{ padding: '40px', textAlign: 'center' }}
              >
                <p>
                  Không tìm thấy điểm đến phù hợp với &ldquo;{query.trim()}
                  &rdquo;.
                </p>
                <div style={{ marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="btn btn--primary"
                  >
                    Hiển thị tất cả điểm đến
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Screen 3: Core Architecture & Rules (Diagram + Spec Rows) */}
        <section
          className="section"
          id="capabilities"
          aria-labelledby="capabilities-heading"
          style={{ '--h': 1 } as React.CSSProperties}
        >
          <div className="wrap">
            <div className="section-head">
              <h2 id="capabilities-heading">
                Bốn năng lực cốt lõi trong một công cụ.{' '}
                <span className="muted">
                  Vận hành trên PostGIS và Open-Meteo.
                </span>
              </h2>
            </div>

            <div className="grid">
              <div className="span-6">
                <div className="panel panel--flush">
                  <div
                    className="dg"
                    data-diagram={ARCHITECTURE_DIAGRAM_SPEC}
                  />
                </div>
              </div>

              <dl className="span-6 sr-spec-rows">
                <div className="sr-spec-row">
                  <dt>Radar 1–5&nbsp;km</dt>
                  <dd>
                    Quét điểm tham quan và ẩm thực phù hợp thời tiết quanh tọa
                    độ đã chọn bằng chỉ mục không gian PostGIS.
                  </dd>
                </div>
                <div className="sr-spec-row">
                  <dt>Timeline 4 khung giờ</dt>
                  <dd>
                    Kéo thả Sáng, Trưa, Chiều, Tối theo từng ngày và cảnh báo
                    ngay khi hai điểm liên tiếp cách nhau hơn 8&nbsp;km.
                  </dd>
                </div>
                <div className="sr-spec-row">
                  <dt>Plan B khi mưa ≥ 60%</dt>
                  <dd>
                    Gắn cờ điểm ngoài trời gặp mưa và hoán đổi giao dịch nguyên
                    tử sang điểm trong nhà trong bán kính 3&nbsp;km.
                  </dd>
                </div>
                <div className="sr-spec-row">
                  <dt>Lưu trú tâm Centroid</dt>
                  <dd>
                    Tính trọng tâm hình học của toàn bộ điểm đã chọn để đề xuất
                    khách sạn giúp giảm quãng đường di chuyển.
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {/* Screen 4: Dealt Moment (giant-type-pass) */}
        <section
          className="section statement"
          id="moment"
          data-moment="giant-type-pass"
          data-moment-opts='{"image": "/images/destinations/ha-long.jpg", "travel": 56, "focusY": 55}'
          aria-labelledby="moment-heading"
          style={{ '--h': 1 } as React.CSSProperties}
        >
          <div className="wrap">
            <h2 id="moment-heading" className="mo-gt__type">
              Bốn khung giờ
              <br />
              một lộ trình
            </h2>
            <div className="mo-gt__row">
              <p>
                Mọi thay đổi thời tiết đều có phương án thay thế trong bán kính
                3&nbsp;km, không phá vỡ nhịp độ cả ngày.
              </p>
              <Link className="link" href={ROUTES.TRIPS}>
                Mở không gian lập lịch trình
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Screen 5: Dealt Close (close-word) + Footer (footer-columns) */}
      <footer className="footer closing" id="contact" aria-labelledby="close-h">
        <div className="wrap">
          <div className="closing__cta close--word">
            <div className="section-head--split">
              <div>
                <h2 id="close-h">Bắt đầu chuyến đi tiếp theo</h2>
                <p className="t-lead">
                  Tạo lịch trình 4 khung giờ miễn phí, tự động thích ứng dự báo
                  thời tiết Open-Meteo.
                </p>
              </div>
              <Link className="btn btn--primary" href={ROUTES.TRIPS}>
                Lập lịch 4 khung giờ
                <svg className="m-arrow" viewBox="0 0 12 12" aria-hidden="true">
                  <path className="m-arrow__stem" d="M1 6h8" />
                  <path className="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5" />
                </svg>
              </Link>
            </div>
            <p className="close__word" aria-hidden="true">
              SkyRoute
            </p>
          </div>

          <div className="closing__links">
            <div className="grid">
              <div className="span-4 stack-4">
                <Link className="nav__logo" href="#top">
                  <span className="mark" data-mark="dots" aria-hidden="true" />
                  SkyRoute
                </Link>
                <p className="footer__lede">
                  Nền tảng lập lịch trình du lịch 4 khung giờ thích ứng thời
                  tiết và không gian PostGIS.
                </p>
              </div>
              <div className="span-2 footer__col">
                <h3>Sản phẩm</h3>
                <ul>
                  <li>
                    <a href="#destinations">Điểm đến</a>
                  </li>
                  <li>
                    <a href="#capabilities">Bốn năng lực</a>
                  </li>
                  <li>
                    <Link href={ROUTES.TRIPS}>Lập lịch trình</Link>
                  </li>
                </ul>
              </div>
              <div className="span-2 footer__col">
                <h3>Miền Bắc</h3>
                <ul>
                  <li>
                    <Link href={ROUTES.EXPLORE_CITY('ha-noi')}>Hà Nội</Link>
                  </li>
                  <li>
                    <Link href={ROUTES.EXPLORE_CITY('ninh-binh')}>
                      Ninh Bình
                    </Link>
                  </li>
                  <li>
                    <Link href={ROUTES.EXPLORE_CITY('ha-long')}>Hạ Long</Link>
                  </li>
                </ul>
              </div>
              <div className="span-2 footer__col">
                <h3>Tây Nguyên</h3>
                <ul>
                  <li>
                    <Link href={ROUTES.EXPLORE_CITY('da-lat')}>Đà Lạt</Link>
                  </li>
                  <li>
                    <Link href={ROUTES.EXPLORE_CITY('sapa')}>Sa Pa</Link>
                  </li>
                </ul>
              </div>
              <div className="span-2 footer__col">
                <h3>Tài khoản</h3>
                <ul>
                  <li>
                    <Link href={ROUTES.LOGIN}>Đăng nhập</Link>
                  </li>
                  <li>
                    <Link href={ROUTES.REGISTER}>Đăng ký</Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="footer__legal">
              <span>&copy; 2026 SkyRoute</span>
              <details className="credits">
                <summary>Nguồn ảnh và dữ liệu bản đồ</summary>
                <p>
                  Ảnh điểm đến thuộc thư viện dự án SkyRoute. Dữ liệu bản đồ từ
                  OpenStreetMap và dự báo thời tiết từ Open-Meteo.
                </p>
              </details>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
