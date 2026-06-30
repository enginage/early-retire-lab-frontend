import { getStocksRestApiUrl, API_ENDPOINTS } from '../../utils/api';

const KR_STOCKS_URL = getStocksRestApiUrl(API_ENDPOINTS.KR_STOCKS);
const DOMESTIC_ETFS_URL = getStocksRestApiUrl(API_ENDPOINTS.DOMESTIC_ETFS);
const ASSET_MANAGEMENT_INST_URL = getStocksRestApiUrl(
  API_ENDPOINTS.ASSET_MANAGEMENT_INSTITUTIONS
);

const KR_STOCKS_PAGE_SIZE = 1000;
const DOMESTIC_ETFS_PAGE_SIZE = 1000;
const KR_STOCKS_MAX_PAGES = 5;
const DOMESTIC_ETFS_MAX_PAGES = 3;

let krStocksIndicatorsCache = null;
let krStocksIndicatorsPromise = null;

let domesticEtfsIndicatorsCache = null;
let domesticEtfsIndicatorsPromise = null;

let assetManagementInstCache = null;
let assetManagementInstPromise = null;

async function fetchJsonArray(url, errorLabel) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${errorLabel}: ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Supabase는 요청당 최대 1000건 — 첫 페이지 후 남은 skip을 병렬 fetch.
 * (순차 3 RTT → 1 + 병렬 2 RTT)
 */
async function fetchAllPagesParallel(baseUrl, baseParams, errorLabel, options = {}) {
  const pageSize = options.pageSize ?? 1000;
  const maxPages = options.maxPages ?? 5;

  const buildUrl = (skip) => {
    const params = new URLSearchParams(baseParams);
    params.set('skip', String(skip));
    params.set('limit', String(pageSize));
    return `${baseUrl}?${params.toString()}`;
  };

  const first = await fetchJsonArray(buildUrl(0), errorLabel);
  if (first.length < pageSize || maxPages <= 1) {
    return first;
  }

  const extraSkips = [];
  for (let p = 1; p < maxPages; p += 1) {
    extraSkips.push(p * pageSize);
  }

  const extraBatches = await Promise.all(
    extraSkips.map((skip) => fetchJsonArray(buildUrl(skip), errorLabel))
  );

  const merged = [...first];
  for (const batch of extraBatches) {
    if (batch.length === 0) break;
    merged.push(...batch);
    if (batch.length < pageSize) break;
  }
  return merged;
}

/** 국내 상장 기업 기술 지표 — RestAPI 경량 /indicators, 병렬 페이지 + 모듈 캐시 */
export async function fetchKrStocksIndicatorsCached() {
  if (krStocksIndicatorsCache) {
    return krStocksIndicatorsCache;
  }
  if (krStocksIndicatorsPromise) {
    return krStocksIndicatorsPromise;
  }

  krStocksIndicatorsPromise = (async () => {
    const baseParams = new URLSearchParams();
    baseParams.set('use_yn', 'true');

    let data;
    try {
      data = await fetchAllPagesParallel(
        `${KR_STOCKS_URL}/indicators`,
        baseParams,
        '국내 상장 기업 기술 지표 조회 실패',
        { pageSize: KR_STOCKS_PAGE_SIZE, maxPages: KR_STOCKS_MAX_PAGES }
      );
    } catch {
      data = await fetchAllPagesParallel(
        KR_STOCKS_URL,
        baseParams,
        '국내 상장 기업 기술 지표 조회 실패',
        { pageSize: KR_STOCKS_PAGE_SIZE, maxPages: KR_STOCKS_MAX_PAGES }
      );
    }

    krStocksIndicatorsCache = data;
    krStocksIndicatorsPromise = null;
    return data;
  })().catch((err) => {
    krStocksIndicatorsPromise = null;
    throw err;
  });

  return krStocksIndicatorsPromise;
}

/** 국내 상장 ETF 기술 지표 — 병렬 페이지 + 모듈 캐시 */
export async function fetchDomesticEtfsIndicatorsCached() {
  if (domesticEtfsIndicatorsCache) {
    return domesticEtfsIndicatorsCache;
  }
  if (domesticEtfsIndicatorsPromise) {
    return domesticEtfsIndicatorsPromise;
  }

  domesticEtfsIndicatorsPromise = (async () => {
    const data = await fetchAllPagesParallel(
      DOMESTIC_ETFS_URL,
      new URLSearchParams(),
      '국내 ETF 조회 실패',
      { pageSize: DOMESTIC_ETFS_PAGE_SIZE, maxPages: DOMESTIC_ETFS_MAX_PAGES }
    );
    domesticEtfsIndicatorsCache = data;
    domesticEtfsIndicatorsPromise = null;
    return data;
  })().catch((err) => {
    domesticEtfsIndicatorsPromise = null;
    throw err;
  });

  return domesticEtfsIndicatorsPromise;
}

/** domestic_etfs.asset_manager 필터용 자산운용사 목록 */
export async function fetchAssetManagementInstCached() {
  if (assetManagementInstCache) {
    return assetManagementInstCache;
  }
  if (assetManagementInstPromise) {
    return assetManagementInstPromise;
  }

  assetManagementInstPromise = (async () => {
    const data = await fetchJsonArray(
      `${ASSET_MANAGEMENT_INST_URL}?skip=0&limit=10000`,
      '자산운용사 목록 조회 실패'
    );
    assetManagementInstCache = data;
    assetManagementInstPromise = null;
    return data;
  })().catch((err) => {
    assetManagementInstPromise = null;
    throw err;
  });

  return assetManagementInstPromise;
}

/** 국내 상장 기업 기술 지표 화면 전용 preload (kr-stocks + comparison 공통코드) */
export function preloadKrMarketIndicatorsData() {
  return Promise.allSettled([fetchKrStocksIndicatorsCached()]);
}

/** 국내 상장 ETF 기술 지표 화면 전용 preload */
export function preloadDomesticEtfIndicatorsData() {
  return Promise.allSettled([
    fetchDomesticEtfsIndicatorsCached(),
    fetchAssetManagementInstCached(),
  ]);
}
