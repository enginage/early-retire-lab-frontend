import { getStocksRestApiUrl, API_ENDPOINTS } from '../../utils/api';

const COMMON_CODE_MASTERS_URL = getStocksRestApiUrl(API_ENDPOINTS.COMMON_CODE_MASTERS);
const COMMON_CODE_DETAILS_URL = getStocksRestApiUrl(API_ENDPOINTS.COMMON_CODE_DETAILS);

/** RSI·BB 임계값 비교 연산자 — 프론트 고정 (공통코드 DB 미사용) */
export const COMPARISON_OPERATORS = ['>', '<', '>=', '<='];

export const DEFAULT_COMPARISON_OP = COMPARISON_OPERATORS[0];

/** @deprecated COMPARISON_OPERATORS 와 동일 */
export const RSI_OPS = COMPARISON_OPERATORS;

let commonCodeMastersCache = null;
let commonCodeMastersPromise = null;

let etfMarketClassDetailsCache = null;
let etfMarketClassDetailsPromise = null;

let etfTaxTypeDetailsCache = null;
let etfTaxTypeDetailsPromise = null;

let usaIndustryDetailsCache = null;
let usaIndustryDetailsPromise = null;

async function fetchCommonCodeMastersCached() {
  if (commonCodeMastersCache) {
    return commonCodeMastersCache;
  }
  if (commonCodeMastersPromise) {
    return commonCodeMastersPromise;
  }

  commonCodeMastersPromise = (async () => {
    const mRes = await fetch(`${COMMON_CODE_MASTERS_URL}?skip=0&limit=1000`);
    if (!mRes.ok) {
      throw new Error(`공통코드 마스터 조회 실패: ${mRes.status}`);
    }
    const masters = await mRes.json();
    const list = Array.isArray(masters) ? masters : [];
    commonCodeMastersCache = list;
    commonCodeMastersPromise = null;
    return list;
  })().catch((err) => {
    commonCodeMastersPromise = null;
    throw err;
  });

  return commonCodeMastersPromise;
}

function findMasterByCode(masters, code) {
  const key = String(code ?? '').toLowerCase();
  return masters.find((m) => String(m.code ?? '').toLowerCase() === key);
}

async function fetchDetailByMasterCode(masterCode, label) {
  const masters = await fetchCommonCodeMastersCached();
  const master = findMasterByCode(masters, masterCode);
  if (!master) return [];
  const res = await fetch(
    `${COMMON_CODE_DETAILS_URL}?master_id=${master.id}&skip=0&limit=500`
  );
  if (!res.ok) {
    throw new Error(`${label} 상세코드 조회 실패: ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function fetchEtfMarketClassDetailsCached() {
  if (etfMarketClassDetailsCache) {
    return etfMarketClassDetailsCache;
  }
  if (etfMarketClassDetailsPromise) {
    return etfMarketClassDetailsPromise;
  }

  etfMarketClassDetailsPromise = (async () => {
    const rows = await fetchDetailByMasterCode(
      'kr_etf_market_classification',
      'kr_etf_market_classification'
    );
    etfMarketClassDetailsCache = rows;
    etfMarketClassDetailsPromise = null;
    return rows;
  })().catch((err) => {
    etfMarketClassDetailsPromise = null;
    throw err;
  });

  return etfMarketClassDetailsPromise;
}

async function fetchEtfTaxTypeDetailsCached() {
  if (etfTaxTypeDetailsCache) {
    return etfTaxTypeDetailsCache;
  }
  if (etfTaxTypeDetailsPromise) {
    return etfTaxTypeDetailsPromise;
  }

  etfTaxTypeDetailsPromise = (async () => {
    const rows = await fetchDetailByMasterCode('etf_tax_type', 'etf_tax_type');
    etfTaxTypeDetailsCache = rows;
    etfTaxTypeDetailsPromise = null;
    return rows;
  })().catch((err) => {
    etfTaxTypeDetailsPromise = null;
    throw err;
  });

  return etfTaxTypeDetailsPromise;
}

async function fetchUsaIndustryDetailsCached() {
  if (usaIndustryDetailsCache) {
    return usaIndustryDetailsCache;
  }
  if (usaIndustryDetailsPromise) {
    return usaIndustryDetailsPromise;
  }

  usaIndustryDetailsPromise = (async () => {
    const rows = await fetchDetailByMasterCode(
      'usa_industry_type',
      'usa_industry_type'
    );
    usaIndustryDetailsCache = rows;
    usaIndustryDetailsPromise = null;
    return rows;
  })().catch((err) => {
    usaIndustryDetailsPromise = null;
    throw err;
  });

  return usaIndustryDetailsPromise;
}

/** 국내 상장 ETF — 시장분류·과세유형 공통코드만 (비교 연산자 제외) */
export async function fetchDomesticEtfFilterCommonCodesCached() {
  const [marketClassDetails, etfTaxTypeDetails] = await Promise.all([
    fetchEtfMarketClassDetailsCached(),
    fetchEtfTaxTypeDetailsCached(),
  ]);
  return { marketClassDetails, etfTaxTypeDetails };
}

/** 미국 상장 기업 — 업종코드(usa_industry_type) 공통상세코드 */
export async function fetchUsaIndustryCommonCodesCached() {
  return fetchUsaIndustryDetailsCached();
}

export function shouldApplyComparisonFilter(thresholdNum, op) {
  return (
    thresholdNum !== null &&
    !Number.isNaN(thresholdNum) &&
    op &&
    COMPARISON_OPERATORS.includes(op)
  );
}

export function matchesMacdSignFilter(value, mode) {
  if (!mode) return true;
  if (value === null || value === undefined || value === '') return false;
  const v = Number(value);
  if (Number.isNaN(v)) return false;
  if (mode === 'nonnegative') return v >= 0;
  if (mode === 'negative') return v < 0;
  return true;
}

export function matchesRsiValue(value, op, threshold) {
  if (value === null || value === undefined || value === '') return false;
  const v = Number(value);
  if (Number.isNaN(v)) return false;
  switch (op) {
    case '>':
      return v > threshold;
    case '<':
      return v < threshold;
    case '>=':
      return v >= threshold;
    case '<=':
      return v <= threshold;
    default:
      return true;
  }
}

export function applyClampedDecimalThresholdInput(raw, setThreshold, min, max) {
  let v = raw;
  if (v === '') {
    setThreshold('');
    return;
  }
  v = v.replace(/[^0-9.]/g, '');
  const dot = v.indexOf('.');
  if (dot !== -1) {
    v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '');
  }
  if (v === '.') {
    setThreshold(min <= 0 ? '0.' : '');
    return;
  }
  if (/^\d+\.$/.test(v)) {
    setThreshold(v);
    return;
  }
  const n = parseFloat(v);
  if (Number.isNaN(n)) {
    setThreshold('');
    return;
  }
  const clamped = Math.min(max, Math.max(min, n));
  if (clamped !== n) {
    setThreshold(String(clamped));
    return;
  }
  setThreshold(v);
}

export function applyRsiThresholdInput(raw, setThreshold) {
  applyClampedDecimalThresholdInput(raw, setThreshold, 0, 100);
}

/** ETF 편입 구성 빈 목록 안내 문구 (시장분류 표시명 기준) */
export function getPdfPortfolioEmptyMessage(marketClassName) {
  const name = String(marketClassName ?? '').trim();
  if (name === '해외' || name === '국내&해외') {
    return '보유 종목 중 미국 상장된 주식만 제공합니다.';
  }
  return '보유 종목이 없습니다.';
}
