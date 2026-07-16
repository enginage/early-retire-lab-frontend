/**
 * sitemap·robots 정적 설정 (Node 빌드 스크립트·앱 공용)
 * PAGE_SEO path와 동기화 유지
 */
export const SITEMAP_PAGE_KEYS = [
  'home',
  'experience-lab',
  'investment-indicators',
  'early-retirement',
  'domestic-high-dividend',
  'domestic-etf-indicators',
  'kr-market-indicators',
  'usa-stock-indicators',
];

/** prerender 대상 (쿼리스트링 없는 공개 URL — Vercel SPA에서 정적 HTML로 서빙 가능) */
export const PRERENDER_PATHS = [
  '/',
  '/experience-lab',
  '/investment-indicators',
  '/domestic-etf-indicators',
  '/kr-market-indicators',
  '/usa-stock-indicators',
];

/** 크롤링 차단 경로 (비공개·인증·내부 워크스페이스) */
export const ROBOTS_DISALLOW_PATHS = [
  '/workspace',
  '/settings',
  '/financial-status',
  '/target-setting',
  '/simulation',
  '/comprehensive-calendar',
  '/tax-saving',
  '/ria-calculator',
  '/investment-info',
  '/opportunity-cost',
  '/kr-stock-summary',
  '/stock-trading-log',
  '/theme-management',
  '/industry-map-management',
  '/market-condition-theme',
  '/follow-up-stocks',
  '/related-stocks',
  '/limitup-surge-analysis',
  '/enterprise-analysis',
  '/stock-news-history',
  '/stock-disclosure-history',
  '/batch-jobs',
  '/usa-high-dividend',
  '/expense',
  '/irp-asset-indicators',
  '/basic',
  '/commoncode',
  '/financial',
  '/kr-stocks',
  '/usa-stocks',
  '/domestic-etf',
  '/usa-etf',
  '/free-living',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
];
