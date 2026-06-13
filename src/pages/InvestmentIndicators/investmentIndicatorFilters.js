import { getStocksRestApiUrl, API_ENDPOINTS } from '../../utils/api';

const COMMON_CODE_MASTERS_URL = getStocksRestApiUrl(API_ENDPOINTS.COMMON_CODE_MASTERS);
const COMMON_CODE_DETAILS_URL = getStocksRestApiUrl(API_ENDPOINTS.COMMON_CODE_DETAILS);

/**
 * comparison + kr_etf_market_classification 상세 (마스터 1회).
 * ETF 지표·국장 지표 등에서 공유 — 탭 전환·Strict Mode에도 네트워크 1회.
 */
let commonCodeGroupsCache = null;
let commonCodeGroupsPromise = null;

export async function fetchCommonCodeGroupsCached() {
  if (commonCodeGroupsCache) {
    return commonCodeGroupsCache;
  }
  if (commonCodeGroupsPromise) {
    return commonCodeGroupsPromise;
  }
  commonCodeGroupsPromise = (async () => {
    const mRes = await fetch(`${COMMON_CODE_MASTERS_URL}?skip=0&limit=1000`);
    if (!mRes.ok) {
      throw new Error(`공통코드 마스터 조회 실패: ${mRes.status}`);
    }
    const masters = await mRes.json();
    const list = Array.isArray(masters) ? masters : [];
    const comp = list.find(
      (m) => String(m.code ?? '').toLowerCase() === 'comparison'
    );
    const mc = list.find(
      (m) =>
        String(m.code ?? '').toLowerCase() === 'kr_etf_market_classification'
    );
    const tax = list.find(
      (m) => String(m.code ?? '').toLowerCase() === 'etf_tax_type'
    );

    const fetchDetail = async (master, label) => {
      if (!master) return [];
      const res = await fetch(
        `${COMMON_CODE_DETAILS_URL}?master_id=${master.id}&skip=0&limit=500`
      );
      if (!res.ok) {
        throw new Error(`${label} 상세코드 조회 실패: ${res.status}`);
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    };

    const [comparisonDetailsVal, marketClassDetailsVal, etfTaxTypeDetailsVal] =
      await Promise.all([
      fetchDetail(comp, 'comparison'),
      fetchDetail(mc, 'kr_etf_market_classification'),
      fetchDetail(tax, 'etf_tax_type'),
    ]);
    const result = {
      comparisonDetails: comparisonDetailsVal,
      marketClassDetails: marketClassDetailsVal,
      etfTaxTypeDetails: etfTaxTypeDetailsVal,
    };
    commonCodeGroupsCache = result;
    commonCodeGroupsPromise = null;
    return result;
  })().catch((err) => {
    commonCodeGroupsPromise = null;
    throw err;
  });

  return commonCodeGroupsPromise;
}

export const RSI_OPS = ['>', '<', '>=', '<='];

export function opFromComparisonDetail(d) {
  const c = String(d?.detail_code ?? '').trim();
  if (RSI_OPS.includes(c)) return c;
  const n = String(d?.detail_code_name ?? '').trim();
  if (RSI_OPS.includes(n)) return n;
  return c || n;
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
