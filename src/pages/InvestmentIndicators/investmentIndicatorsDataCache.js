import { getStocksRestApiUrl, API_ENDPOINTS } from '../../utils/api';

const KR_STOCKS_URL = getStocksRestApiUrl(API_ENDPOINTS.KR_STOCKS);
const USA_STOCKS_URL = getStocksRestApiUrl(API_ENDPOINTS.USA_STOCKS);
const DOMESTIC_ETFS_URL = getStocksRestApiUrl(API_ENDPOINTS.DOMESTIC_ETFS);
const DOMESTIC_ETFS_DAILY_CHART_URL = getStocksRestApiUrl(
  API_ENDPOINTS.DOMESTIC_ETFS_DAILY_CHART
);
const ASSET_MANAGEMENT_INST_URL = getStocksRestApiUrl(
  API_ENDPOINTS.ASSET_MANAGEMENT_INSTITUTIONS
);

/** RestAPI domestic_etfs_daily_chart.HIGH_DIVIDEND_SIM_REFERENCE_ETF_ID */
const DOMESTIC_ETF_REFERENCE_ETF_ID = 634;

const KR_STOCKS_PAGE_SIZE = 1000;
const USA_STOCKS_PAGE_SIZE = 1000;
const DOMESTIC_ETFS_PAGE_SIZE = 1000;
const KR_STOCKS_MAX_PAGES = 5;
const USA_STOCKS_MAX_PAGES = 10;
const DOMESTIC_ETFS_MAX_PAGES = 3;
const KR_STOCKS_INDICATORS_PAGE_SIZE = 30;
const USA_STOCKS_INDICATORS_PAGE_SIZE = 30;

let domesticEtfsIndicatorsCache = null;
let domesticEtfsIndicatorsPromise = null;

let domesticEtfReferenceDateCache = null;
let domesticEtfReferenceDatePromise = null;

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

/** 국내 상장 기업 기술 지표 — RestAPI /indicators 서버 페이징 */
export async function fetchKrStocksIndicatorsPage(params = {}) {
  const searchParams = new URLSearchParams();
  searchParams.set('use_yn', 'true');
  searchParams.set('exclude_zero_volume', 'true');
  searchParams.set('skip', String(params.skip ?? 0));
  searchParams.set('limit', String(params.limit ?? KR_STOCKS_INDICATORS_PAGE_SIZE));
  searchParams.set('sort_by', params.sortBy ?? 'market_cap');
  searchParams.set('sort_dir', params.sortDir ?? 'desc');

  if (params.market) {
    searchParams.set('market', params.market);
  }
  if (params.search) {
    searchParams.set('search', params.search);
  }
  if (params.rsi18Op && params.rsi18Val != null && params.rsi18Val !== '') {
    searchParams.set('rsi18_op', params.rsi18Op);
    searchParams.set('rsi18_val', String(params.rsi18Val));
  }
  if (params.rsi30Op && params.rsi30Val != null && params.rsi30Val !== '') {
    searchParams.set('rsi30_op', params.rsi30Op);
    searchParams.set('rsi30_val', String(params.rsi30Val));
  }
  if (params.bbWidthOp && params.bbWidthVal != null && params.bbWidthVal !== '') {
    searchParams.set('bb_width_op', params.bbWidthOp);
    searchParams.set('bb_width_val', String(params.bbWidthVal));
  }
  if (params.bbPercentBOp && params.bbPercentBVal != null && params.bbPercentBVal !== '') {
    searchParams.set('bb_percent_b_op', params.bbPercentBOp);
    searchParams.set('bb_percent_b_val', String(params.bbPercentBVal));
  }
  if (params.macdLineSign) {
    searchParams.set('macd_line_sign', params.macdLineSign);
  }
  if (params.macdSignalSign) {
    searchParams.set('macd_signal_sign', params.macdSignalSign);
  }
  if (params.macdHistSign) {
    searchParams.set('macd_hist_sign', params.macdHistSign);
  }

  const res = await fetch(`${KR_STOCKS_URL}/indicators?${searchParams.toString()}`);
  if (!res.ok) {
    throw new Error(`국내 상장 기업 기술 지표 조회 실패: ${res.status}`);
  }
  const data = await res.json();
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    total: Number(data?.total) || 0,
    skip: Number(data?.skip) || 0,
    limit: Number(data?.limit) || KR_STOCKS_INDICATORS_PAGE_SIZE,
  };
}

/** @deprecated fetchKrStocksIndicatorsPage 사용 */
export async function fetchKrStocksIndicatorsCached() {
  const page = await fetchKrStocksIndicatorsPage();
  return page.items;
}

/** 미국 상장 기업 기술 지표 — RestAPI /indicators 서버 페이징 */
export async function fetchUsaStocksIndicatorsPage(params = {}) {
  const searchParams = new URLSearchParams();
  searchParams.set('use_yn', 'true');
  searchParams.set('exclude_zero_volume', 'true');
  searchParams.set('skip', String(params.skip ?? 0));
  searchParams.set('limit', String(params.limit ?? USA_STOCKS_INDICATORS_PAGE_SIZE));
  searchParams.set('sort_by', params.sortBy ?? 'latest_volume');
  searchParams.set('sort_dir', params.sortDir ?? 'desc');

  if (params.market) {
    searchParams.set('market', params.market);
  }
  if (params.search) {
    searchParams.set('search', params.search);
  }
  if (params.rsi18Op && params.rsi18Val != null && params.rsi18Val !== '') {
    searchParams.set('rsi18_op', params.rsi18Op);
    searchParams.set('rsi18_val', String(params.rsi18Val));
  }
  if (params.rsi30Op && params.rsi30Val != null && params.rsi30Val !== '') {
    searchParams.set('rsi30_op', params.rsi30Op);
    searchParams.set('rsi30_val', String(params.rsi30Val));
  }
  if (params.bbWidthOp && params.bbWidthVal != null && params.bbWidthVal !== '') {
    searchParams.set('bb_width_op', params.bbWidthOp);
    searchParams.set('bb_width_val', String(params.bbWidthVal));
  }
  if (params.bbPercentBOp && params.bbPercentBVal != null && params.bbPercentBVal !== '') {
    searchParams.set('bb_percent_b_op', params.bbPercentBOp);
    searchParams.set('bb_percent_b_val', String(params.bbPercentBVal));
  }
  if (params.macdLineSign) {
    searchParams.set('macd_line_sign', params.macdLineSign);
  }
  if (params.macdSignalSign) {
    searchParams.set('macd_signal_sign', params.macdSignalSign);
  }
  if (params.macdHistSign) {
    searchParams.set('macd_hist_sign', params.macdHistSign);
  }

  const res = await fetch(`${USA_STOCKS_URL}/indicators?${searchParams.toString()}`);
  if (!res.ok) {
    throw new Error(`미국 상장 기업 기술 지표 조회 실패: ${res.status}`);
  }
  const data = await res.json();
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    total: Number(data?.total) || 0,
    skip: Number(data?.skip) || 0,
    limit: Number(data?.limit) || USA_STOCKS_INDICATORS_PAGE_SIZE,
  };
}

/** @deprecated fetchUsaStocksIndicatorsPage 사용 */
export async function fetchUsaStocksIndicatorsCached() {
  const page = await fetchUsaStocksIndicatorsPage();
  return page.items;
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

/** 국내 ETF 기술 지표 기준일 — 참조 ETF 최신 일봉 date */
export async function fetchDomesticEtfReferenceDateCached() {
  if (domesticEtfReferenceDateCache) {
    return domesticEtfReferenceDateCache;
  }
  if (domesticEtfReferenceDatePromise) {
    return domesticEtfReferenceDatePromise;
  }

  domesticEtfReferenceDatePromise = (async () => {
    const res = await fetch(
      `${DOMESTIC_ETFS_DAILY_CHART_URL}/etf/${DOMESTIC_ETF_REFERENCE_ETF_ID}/latest`
    );
    if (!res.ok) {
      throw new Error(`기준일 조회 실패: ${res.status}`);
    }
    const data = await res.json();
    domesticEtfReferenceDateCache = data?.date ?? null;
    domesticEtfReferenceDatePromise = null;
    return domesticEtfReferenceDateCache;
  })().catch((err) => {
    domesticEtfReferenceDatePromise = null;
    throw err;
  });

  return domesticEtfReferenceDatePromise;
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

/** 국내 상장 기업 기술 지표 화면 전용 preload (첫 페이지) */
export function preloadKrMarketIndicatorsData() {
  return Promise.allSettled([fetchKrStocksIndicatorsPage()]);
}

/** 미국 상장 기업 기술 지표 화면 전용 preload (첫 페이지) */
export function preloadUsaStockIndicatorsData() {
  return Promise.allSettled([fetchUsaStocksIndicatorsPage()]);
}

/** 국내 상장 ETF 기술 지표 화면 전용 preload */
export function preloadDomesticEtfIndicatorsData() {
  return Promise.allSettled([
    fetchDomesticEtfsIndicatorsCached(),
    fetchAssetManagementInstCached(),
    fetchDomesticEtfReferenceDateCached(),
  ]);
}
