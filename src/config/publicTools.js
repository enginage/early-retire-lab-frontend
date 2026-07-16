import { SITEMAP_PAGE_KEYS } from './seoStatic.js';

/** SEO 공개 도구 — 직접 URL 렌더 대상 (workspace 리다이렉트 없음) */
export const PUBLIC_TOOL_KEYS = new Set([
  'early-retirement',
  'domestic-high-dividend',
  'domestic-etf-indicators',
  'kr-market-indicators',
  'usa-stock-indicators',
]);

export const SITE_NAME = '조기은퇴주식연구소';

/** 페이지별 SEO 메타 (2단계 이후 sitemap·허브에서도 재사용) */
export const PAGE_SEO = {
  home: {
    title: '조기은퇴(FIRE) 시뮬레이션 & 주식 스크리너',
    description:
      '조기은퇴(FIRE)를 꿈꾸는 당신을 위한 주식 연구소. 조기은퇴 시뮬레이션, 고배당 ETF 시뮬레이션, 국내·미국 주식 기술지표 스크리너를 무료로 이용하세요.',
    path: '/',
  },
  'experience-lab': {
    title: '실험실 — 조기은퇴·배당 시뮬레이션',
    description:
      '조기은퇴(FIRE) 자금 계획과 국내 고배당 ETF 배당 시뮬레이션 도구 모음. 경제적 자유 달성 경로를 직접 계산해 보세요.',
    path: '/experience-lab',
  },
  'investment-indicators': {
    title: '주식·ETF 기술 지표 스크리너',
    description:
      '국내·미국 상장 ETF·주식의 RSI, MACD, 등락률 등 기술 지표를 조건별로 검색·비교하는 무료 스크리너 허브입니다.',
    path: '/investment-indicators',
  },
  'early-retirement': {
    title: '조기은퇴 시뮬레이션',
    description:
      '현재 자산, 월지출, 은퇴 나이를 입력해 조기은퇴(FIRE) 가능 시점과 필요 자금을 시뮬레이션합니다.',
    path: '/experience-lab?menu=early-retirement',
  },
  'domestic-high-dividend': {
    title: '국내 고배당 ETF 시뮬레이션',
    description:
      '국내 상장 고배당 ETF의 배당금·세금·현금흐름을 시뮬레이션해 월배당 수입 목표 달성 가능성을 확인합니다.',
    path: '/experience-lab?menu=domestic-high-dividend',
  },
  'domestic-etf-indicators': {
    title: '국내 상장 ETF 기술 지표 스크리너',
    description:
      '국내 상장 ETF의 RSI, MACD, 등락률, 배당수익률 등 기술 지표를 필터링·비교하는 무료 스크리너입니다.',
    path: '/domestic-etf-indicators',
  },
  'kr-market-indicators': {
    title: '국내 상장 기업 기술 지표 스크리너',
    description:
      '국내 상장 주식의 RSI, MACD, 거래량 등 기술 지표를 조건별로 검색·필터링합니다.',
    path: '/kr-market-indicators',
  },
  'usa-stock-indicators': {
    title: '미국 상장 기업 기술 지표 스크리너',
    description:
      '미국 상장 주식의 RSI, MACD 등 기술 지표를 조건별로 검색·필터링합니다.',
    path: '/usa-stock-indicators',
  },
};

export const SCREENER_PATHS = new Set([
  '/domestic-etf-indicators',
  '/kr-market-indicators',
  '/usa-stock-indicators',
]);

export function isPublicToolKey(key) {
  return PUBLIC_TOOL_KEYS.has(key);
}

/** pathname + search 기준 서브메뉴 활성 여부 */
export function matchSubmenuActive(location, submenu) {
  const [subPath, subQuery = ''] = submenu.path.split('?');
  if (location.pathname !== subPath) return false;
  if (!subQuery) return true;

  const subParams = new URLSearchParams(subQuery);
  const locParams = new URLSearchParams(location.search);
  for (const [key, value] of subParams.entries()) {
    if (locParams.get(key) !== value) return false;
  }
  return true;
}

/** 스크리너 직접 URL → 부모 메뉴 key */
export function getParentMenuKeyForPath(pathname) {
  if (pathname === '/investment-indicators') return 'investment-indicators';
  if (SCREENER_PATHS.has(pathname)) return 'investment-indicators';
  if (pathname === '/experience-lab') return 'experience-lab';
  return null;
}

/** 배포 도메인 — VITE_SITE_URL 미설정 시 런타임 origin 사용 */
export function getSiteOrigin() {
  const fromEnv = import.meta.env.VITE_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export function getCanonicalUrl(path) {
  const origin = getSiteOrigin();
  return origin ? `${origin}${path}` : path;
}

export function getPageSeo(key) {
  return PAGE_SEO[key] ?? null;
}

/** sitemap에 포함할 공개 페이지 path 목록 */
export function getSitemapPaths() {
  return SITEMAP_PAGE_KEYS.map((key) => PAGE_SEO[key].path);
}
