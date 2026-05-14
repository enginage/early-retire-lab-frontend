import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getStocksRestApiUrl, API_ENDPOINTS } from '../../utils/api';
import {
  fetchCommonCodeGroupsCached,
  RSI_OPS,
  opFromComparisonDetail,
  matchesMacdSignFilter,
  matchesRsiValue,
  applyClampedDecimalThresholdInput,
  applyRsiThresholdInput,
} from './investmentIndicatorFilters';

const LIST_URL = getStocksRestApiUrl(API_ENDPOINTS.KR_STOCKS);

const PAGE_SIZE = 1000;

function formatIntKO(v) {
  if (v === null || v === undefined || v === '') return '-';
  const n = Number(v);
  if (Number.isNaN(n)) return '-';
  return n.toLocaleString('ko-KR');
}

function formatTechDecimal(v, fractionDigits = 4) {
  if (v === null || v === undefined || v === '') return '-';
  const n = Number(v);
  if (Number.isNaN(n)) return '-';
  return n.toLocaleString('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  });
}

function sortableMetricValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** 거래량(latest_volume)이 유효한 숫자이면서 0이 아닌 행만 표시 */
function hasNonZeroLatestVolume(row) {
  const n = sortableMetricValue(row.latest_volume);
  return n !== null && n !== 0;
}

function compareMetricRows(a, b, key, dir) {
  const va = sortableMetricValue(a[key]);
  const vb = sortableMetricValue(b[key]);
  if (va === null && vb === null) return 0;
  if (va === null) return 1;
  if (vb === null) return -1;
  const cmp = va - vb;
  if (cmp !== 0) return dir === 'asc' ? cmp : -cmp;
  return String(a.ticker || '').localeCompare(String(b.ticker || ''));
}

function SortableMetricTh({ label, field, sortKey, sortDir, onAsc, onDesc }) {
  const ascOn = sortKey === field && sortDir === 'asc';
  const descOn = sortKey === field && sortDir === 'desc';
  return (
    <th className="py-2 px-3 font-medium text-right whitespace-nowrap align-bottom">
      <div className="inline-flex items-center gap-1.5 justify-end w-full">
        <span>{label}</span>
        <div
          className="flex flex-col rounded border border-gray-600/70 overflow-hidden shrink-0 bg-wealth-card/40"
          role="group"
          aria-label={`${label} 정렬`}
        >
          <button
            type="button"
            onClick={() => onAsc(field)}
            className={`px-1 py-0.5 leading-none text-[10px] hover:bg-white/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-wealth-gold/50 ${
              ascOn ? 'text-wealth-gold bg-wealth-gold/15' : 'text-wealth-muted'
            }`}
            aria-label={`${label} 오름차순`}
            title="오름차순"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={() => onDesc(field)}
            className={`px-1 py-0.5 leading-none text-[10px] border-t border-gray-600/70 hover:bg-white/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-wealth-gold/50 ${
              descOn ? 'text-wealth-gold bg-wealth-gold/15' : 'text-wealth-muted'
            }`}
            aria-label={`${label} 내림차순`}
            title="내림차순"
          >
            ▼
          </button>
        </div>
      </div>
    </th>
  );
}

export default function KrMarketIndicatorsView() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [market, setMarket] = useState('');

  const [comparisonDetails, setComparisonDetails] = useState([]);
  const [comparisonLoadError, setComparisonLoadError] = useState(null);
  const [rsi18SelectedDetailCode, setRsi18SelectedDetailCode] = useState('');
  const [rsi18Threshold, setRsi18Threshold] = useState('');
  const [rsi30SelectedDetailCode, setRsi30SelectedDetailCode] = useState('');
  const [rsi30Threshold, setRsi30Threshold] = useState('');
  const [bbWidthSelectedDetailCode, setBbWidthSelectedDetailCode] = useState('');
  const [bbWidthThreshold, setBbWidthThreshold] = useState('');
  const [bbPercentBSelectedDetailCode, setBbPercentBSelectedDetailCode] =
    useState('');
  const [bbPercentBThreshold, setBbPercentBThreshold] = useState('');
  const [macdLineSignFilter, setMacdLineSignFilter] = useState('');
  const [macdSignalSignFilter, setMacdSignalSignFilter] = useState('');
  const [macdHistSignFilter, setMacdHistSignFilter] = useState('');
  const [techSortKey, setTechSortKey] = useState(null);
  const [techSortDir, setTechSortDir] = useState('desc');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setComparisonLoadError(null);

    const fetchKrStocks = async () => {
      const merged = [];
      let skip = 0;
      const maxSkip = 2_000_000;
      while (skip <= maxSkip) {
        const params = new URLSearchParams();
        params.set('skip', String(skip));
        params.set('limit', String(PAGE_SIZE));
        params.set('use_yn', 'true');
        const res = await fetch(`${LIST_URL}?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`국장 지표 조회 실패: ${res.status}`);
        }
        const data = await res.json();
        const batch = Array.isArray(data) ? data : [];
        merged.push(...batch);
        if (batch.length < PAGE_SIZE) break;
        skip += PAGE_SIZE;
      }
      return merged;
    };

    const [stocksResult, commonResult] = await Promise.allSettled([
      fetchKrStocks(),
      fetchCommonCodeGroupsCached(),
    ]);

    if (stocksResult.status === 'fulfilled') {
      setRows(stocksResult.value);
    } else {
      console.error(stocksResult.reason);
      setRows([]);
      setError(stocksResult.reason?.message || '데이터를 불러오지 못했습니다.');
    }

    if (commonResult.status === 'fulfilled') {
      const { comparisonDetails: compRows } = commonResult.value;
      setComparisonDetails(compRows);
      const withCode = compRows.filter(
        (r) => String(r.detail_code ?? '').trim() !== ''
      );
      const defaultCode = (prev) => {
        const p = String(prev ?? '').trim();
        if (p && withCode.some((r) => String(r.detail_code).trim() === p)) {
          return p;
        }
        return withCode[0] ? String(withCode[0].detail_code).trim() : '';
      };
      setRsi18SelectedDetailCode(defaultCode);
      setRsi30SelectedDetailCode(defaultCode);
      setBbWidthSelectedDetailCode(defaultCode);
      setBbPercentBSelectedDetailCode(defaultCode);
    } else {
      console.error(commonResult.reason);
      setComparisonDetails([]);
      setRsi18SelectedDetailCode('');
      setRsi30SelectedDetailCode('');
      setBbWidthSelectedDetailCode('');
      setBbPercentBSelectedDetailCode('');
      setComparisonLoadError(
        commonResult.reason?.message ||
          '비교 연산자 목록을 불러오지 못했습니다.'
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const rsi18ThresholdNum = useMemo(() => {
    const s = rsi18Threshold.trim();
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }, [rsi18Threshold]);

  const rsi30ThresholdNum = useMemo(() => {
    const s = rsi30Threshold.trim();
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }, [rsi30Threshold]);

  const bbWidthThresholdNum = useMemo(() => {
    const s = bbWidthThreshold.trim();
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }, [bbWidthThreshold]);

  const bbPercentBThresholdNum = useMemo(() => {
    const s = bbPercentBThreshold.trim();
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }, [bbPercentBThreshold]);

  const comparisonSelectRows = useMemo(
    () =>
      comparisonDetails.filter(
        (d) => String(d.detail_code ?? '').trim() !== ''
      ),
    [comparisonDetails]
  );

  const marketFiltered = useMemo(() => {
    const withVolume = rows.filter(hasNonZeroLatestVolume);
    const m = market.trim();
    if (!m) return withVolume;
    return withVolume.filter((r) => String(r.market || '').trim() === m);
  }, [rows, market]);

  const indicatorFiltered = useMemo(() => {
    let list = marketFiltered;

    const applyRsi18 =
      rsi18ThresholdNum !== null &&
      !Number.isNaN(rsi18ThresholdNum) &&
      comparisonDetails.length > 0 &&
      String(rsi18SelectedDetailCode ?? '').trim() !== '';
    if (applyRsi18) {
      const detail = comparisonDetails.find(
        (d) =>
          String(d.detail_code ?? '').trim() ===
          String(rsi18SelectedDetailCode).trim()
      );
      const op = detail ? opFromComparisonDetail(detail) : '';
      if (op && RSI_OPS.includes(op)) {
        list = list.filter((e) =>
          matchesRsiValue(e.rsi18, op, rsi18ThresholdNum)
        );
      }
    }
    const applyRsi30 =
      rsi30ThresholdNum !== null &&
      !Number.isNaN(rsi30ThresholdNum) &&
      comparisonDetails.length > 0 &&
      String(rsi30SelectedDetailCode ?? '').trim() !== '';
    if (applyRsi30) {
      const detail = comparisonDetails.find(
        (d) =>
          String(d.detail_code ?? '').trim() ===
          String(rsi30SelectedDetailCode).trim()
      );
      const op = detail ? opFromComparisonDetail(detail) : '';
      if (op && RSI_OPS.includes(op)) {
        list = list.filter((e) =>
          matchesRsiValue(e.rsi30, op, rsi30ThresholdNum)
        );
      }
    }
    const applyBbWidth =
      bbWidthThresholdNum !== null &&
      !Number.isNaN(bbWidthThresholdNum) &&
      comparisonDetails.length > 0 &&
      String(bbWidthSelectedDetailCode ?? '').trim() !== '';
    if (applyBbWidth) {
      const detail = comparisonDetails.find(
        (d) =>
          String(d.detail_code ?? '').trim() ===
          String(bbWidthSelectedDetailCode).trim()
      );
      const op = detail ? opFromComparisonDetail(detail) : '';
      if (op && RSI_OPS.includes(op)) {
        list = list.filter((e) =>
          matchesRsiValue(e.bb_width, op, bbWidthThresholdNum)
        );
      }
    }
    const applyBbPercentB =
      bbPercentBThresholdNum !== null &&
      !Number.isNaN(bbPercentBThresholdNum) &&
      comparisonDetails.length > 0 &&
      String(bbPercentBSelectedDetailCode ?? '').trim() !== '';
    if (applyBbPercentB) {
      const detail = comparisonDetails.find(
        (d) =>
          String(d.detail_code ?? '').trim() ===
          String(bbPercentBSelectedDetailCode).trim()
      );
      const op = detail ? opFromComparisonDetail(detail) : '';
      if (op && RSI_OPS.includes(op)) {
        list = list.filter((e) =>
          matchesRsiValue(e.bb_percent_b, op, bbPercentBThresholdNum)
        );
      }
    }
    if (macdLineSignFilter) {
      list = list.filter((e) =>
        matchesMacdSignFilter(e.macd_12_26, macdLineSignFilter)
      );
    }
    if (macdSignalSignFilter) {
      list = list.filter((e) =>
        matchesMacdSignFilter(e.macd_signal_9, macdSignalSignFilter)
      );
    }
    if (macdHistSignFilter) {
      list = list.filter((e) =>
        matchesMacdSignFilter(e.macd_histogram, macdHistSignFilter)
      );
    }
    return list;
  }, [
    marketFiltered,
    rsi18ThresholdNum,
    rsi30ThresholdNum,
    bbWidthThresholdNum,
    bbPercentBThresholdNum,
    comparisonDetails,
    rsi18SelectedDetailCode,
    rsi30SelectedDetailCode,
    bbWidthSelectedDetailCode,
    bbPercentBSelectedDetailCode,
    macdLineSignFilter,
    macdSignalSignFilter,
    macdHistSignFilter,
  ]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return indicatorFiltered;
    return indicatorFiltered.filter(
      (r) =>
        String(r.ticker || '')
          .toLowerCase()
          .includes(q) ||
        String(r.name || '')
          .toLowerCase()
          .includes(q)
    );
  }, [indicatorFiltered, search]);

  const sortedRows = useMemo(() => {
    if (!techSortKey) return filtered;
    const next = [...filtered];
    next.sort((a, b) => compareMetricRows(a, b, techSortKey, techSortDir));
    return next;
  }, [filtered, techSortKey, techSortDir]);

  const handleTechSortAsc = useCallback((field) => {
    setTechSortKey(field);
    setTechSortDir('asc');
  }, []);

  const handleTechSortDesc = useCallback((field) => {
    setTechSortKey(field);
    setTechSortDir('desc');
  }, []);

  const handleRsi18ThresholdChange = (e) => {
    applyRsiThresholdInput(e.target.value, setRsi18Threshold);
  };
  const handleRsi30ThresholdChange = (e) => {
    applyRsiThresholdInput(e.target.value, setRsi30Threshold);
  };
  const handleBbWidthThresholdChange = (e) => {
    applyClampedDecimalThresholdInput(
      e.target.value,
      setBbWidthThreshold,
      0,
      100
    );
  };
  const handleBbPercentBThresholdChange = (e) => {
    applyClampedDecimalThresholdInput(
      e.target.value,
      setBbPercentBThreshold,
      0,
      150
    );
  };

  return (
    <div className="max-w-[95%] mx-auto px-6 py-8">
      <h2 className="text-xl font-semibold text-white mb-2">국장 지표</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}
      {comparisonLoadError && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/40 rounded-lg text-amber-300 text-sm">
          {comparisonLoadError}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-wealth-muted">로딩 중…</div>
      ) : (
        <>
      {comparisonSelectRows.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap mb-4">
          <div className="w-full sm:w-[220px] shrink-0 border border-gray-700 rounded-lg overflow-hidden flex flex-col">
            <div className="px-3 py-2 bg-wealth-card/30 border-b border-gray-700 text-xs font-medium text-wealth-muted">
              RSI(18)
            </div>
            <div className="p-3 flex flex-col gap-2">
              <select
                value={rsi18SelectedDetailCode}
                onChange={(e) => setRsi18SelectedDetailCode(e.target.value)}
                className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
              >
                {comparisonSelectRows.map((d) => {
                  const code = String(d.detail_code).trim();
                  return (
                    <option key={d.id} value={code}>
                      {code}
                    </option>
                  );
                })}
              </select>
              <input
                type="text"
                inputMode="decimal"
                value={rsi18Threshold}
                onChange={handleRsi18ThresholdChange}
                placeholder="0 ~ 100"
                autoComplete="off"
                className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2 px-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
              />
              <p className="text-[10px] text-wealth-muted leading-snug">
                기준값(0~100)과 비교 연산으로 필터합니다.
              </p>
            </div>
          </div>
          <div className="w-full sm:w-[220px] shrink-0 border border-gray-700 rounded-lg overflow-hidden flex flex-col">
            <div className="px-3 py-2 bg-wealth-card/30 border-b border-gray-700 text-xs font-medium text-wealth-muted">
              RSI(30)
            </div>
            <div className="p-3 flex flex-col gap-2">
              <select
                value={rsi30SelectedDetailCode}
                onChange={(e) => setRsi30SelectedDetailCode(e.target.value)}
                className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
              >
                {comparisonSelectRows.map((d) => (
                  <option key={`30-${d.id}`} value={String(d.detail_code).trim()}>
                    {String(d.detail_code).trim()}
                  </option>
                ))}
              </select>
              <input
                type="text"
                inputMode="decimal"
                value={rsi30Threshold}
                onChange={handleRsi30ThresholdChange}
                placeholder="0 ~ 100"
                autoComplete="off"
                className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2 px-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
              />
              <p className="text-[10px] text-wealth-muted leading-snug">
                기준값(0~100)과 비교 연산으로 필터합니다.
              </p>
            </div>
          </div>
          <div className="w-full sm:w-[220px] shrink-0 border border-gray-700 rounded-lg overflow-hidden flex flex-col">
            <div className="px-3 py-2 bg-wealth-card/30 border-b border-gray-700 text-xs font-medium text-wealth-muted">
              BB폭
            </div>
            <div className="p-3 flex flex-col gap-2">
              <select
                value={bbWidthSelectedDetailCode}
                onChange={(e) => setBbWidthSelectedDetailCode(e.target.value)}
                className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
              >
                {comparisonSelectRows.map((d) => (
                  <option key={`bbw-${d.id}`} value={String(d.detail_code).trim()}>
                    {String(d.detail_code).trim()}
                  </option>
                ))}
              </select>
              <input
                type="text"
                inputMode="decimal"
                value={bbWidthThreshold}
                onChange={handleBbWidthThresholdChange}
                placeholder="0 ~ 100"
                autoComplete="off"
                className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2 px-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
              />
              <p className="text-[10px] text-wealth-muted leading-snug">
                기준값(0~100)과 비교 연산으로 필터합니다.
              </p>
            </div>
          </div>
          <div className="w-full sm:w-[220px] shrink-0 border border-gray-700 rounded-lg overflow-hidden flex flex-col">
            <div className="px-3 py-2 bg-wealth-card/30 border-b border-gray-700 text-xs font-medium text-wealth-muted">
              BB%B
            </div>
            <div className="p-3 flex flex-col gap-2">
              <select
                value={bbPercentBSelectedDetailCode}
                onChange={(e) => setBbPercentBSelectedDetailCode(e.target.value)}
                className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
              >
                {comparisonSelectRows.map((d) => (
                  <option key={`bbp-${d.id}`} value={String(d.detail_code).trim()}>
                    {String(d.detail_code).trim()}
                  </option>
                ))}
              </select>
              <input
                type="text"
                inputMode="decimal"
                value={bbPercentBThreshold}
                onChange={handleBbPercentBThresholdChange}
                placeholder="0 ~ 150"
                autoComplete="off"
                className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2 px-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
              />
              <p className="text-[10px] text-wealth-muted leading-snug">
                기준값(0~150)과 비교 연산으로 필터합니다.
              </p>
            </div>
          </div>
          <div className="w-full sm:w-auto sm:min-w-[26rem] sm:max-w-[min(100%,32rem)] shrink-0 border border-gray-700 rounded-lg overflow-hidden flex flex-col">
            <div className="px-2 py-1.5 bg-wealth-card/30 border-b border-gray-700 text-[11px] font-medium text-wealth-muted">
              MACD 부호
            </div>
            <div className="p-2.5 flex flex-row flex-nowrap gap-2 items-stretch min-w-0">
              <div className="flex flex-col gap-0.5 flex-1 basis-0 min-w-[7.5rem]">
                <span className="text-[9px] font-medium text-wealth-muted">MACD</span>
                <select
                  value={macdLineSignFilter}
                  onChange={(e) => setMacdLineSignFilter(e.target.value)}
                  className="w-full min-w-0 bg-wealth-card text-wealth-text border border-gray-700/50 rounded-md py-1.5 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
                >
                  <option value="">전체</option>
                  <option value="nonnegative">양수</option>
                  <option value="negative">음수</option>
                </select>
              </div>
              <div className="flex flex-col gap-0.5 flex-1 basis-0 min-w-[7.5rem]">
                <span className="text-[9px] font-medium text-wealth-muted">Signal</span>
                <select
                  value={macdSignalSignFilter}
                  onChange={(e) => setMacdSignalSignFilter(e.target.value)}
                  className="w-full min-w-0 bg-wealth-card text-wealth-text border border-gray-700/50 rounded-md py-1.5 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
                >
                  <option value="">전체</option>
                  <option value="nonnegative">양수</option>
                  <option value="negative">음수</option>
                </select>
              </div>
              <div className="flex flex-col gap-0.5 flex-1 basis-0 min-w-[7.5rem]">
                <span className="text-[9px] font-medium text-wealth-muted">Oscillator</span>
                <select
                  value={macdHistSignFilter}
                  onChange={(e) => setMacdHistSignFilter(e.target.value)}
                  className="w-full min-w-0 bg-wealth-card text-wealth-text border border-gray-700/50 rounded-md py-1.5 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
                >
                  <option value="">전체</option>
                  <option value="nonnegative">양수</option>
                  <option value="negative">음수</option>
                </select>
              </div>
            </div>
            <p className="px-2 pb-2 text-[9px] text-wealth-muted leading-snug">
              0 기준 양·음. 값 없음은 조건 적용 시 제외.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="kr-mkt-search" className="block text-xs text-wealth-muted mb-1">
            티커·종목명 검색
          </label>
          <input
            id="kr-mkt-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="예: 삼성전자, 005930"
            autoComplete="off"
            className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2.5 px-3 text-sm placeholder:text-wealth-muted/70 focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
          />
        </div>
        <div>
          <label htmlFor="kr-mkt-market" className="block text-xs text-wealth-muted mb-1">
            시장
          </label>
          <select
            id="kr-mkt-market"
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            className="bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
          >
            <option value="">전체</option>
            <option value="KOSPI">KOSPI</option>
            <option value="KOSDAQ">KOSDAQ</option>
          </select>
        </div>
      </div>

        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-4 max-h-[calc(100vh-220px)] min-h-0 flex flex-col">
          <p className="text-xs text-wealth-muted shrink-0 mb-2">
            표시{' '}
            <span className="text-wealth-gold tabular-nums">{sortedRows.length}</span>
            건
          </p>
          <div className="overflow-auto flex-1 min-h-0 rounded-lg border border-gray-700/50">
            <table className="w-full text-sm border-collapse min-w-[1000px]">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-gray-700 text-left text-wealth-muted bg-wealth-card/95 backdrop-blur">
                  <th className="py-2 px-3 font-medium whitespace-nowrap">티커</th>
                  <th className="py-2 px-3 font-medium">종목명</th>
                  <th className="py-2 px-3 font-medium whitespace-nowrap">시장</th>
                  <th className="py-2 px-3 font-medium text-right whitespace-nowrap">종가</th>
                  <th className="py-2 px-3 font-medium text-right whitespace-nowrap">거래량</th>
                  <SortableMetricTh
                    label="RSI(18)"
                    field="rsi18"
                    sortKey={techSortKey}
                    sortDir={techSortDir}
                    onAsc={handleTechSortAsc}
                    onDesc={handleTechSortDesc}
                  />
                  <SortableMetricTh
                    label="RSI(30)"
                    field="rsi30"
                    sortKey={techSortKey}
                    sortDir={techSortDir}
                    onAsc={handleTechSortAsc}
                    onDesc={handleTechSortDesc}
                  />
                  <SortableMetricTh
                    label="MACD"
                    field="macd_12_26"
                    sortKey={techSortKey}
                    sortDir={techSortDir}
                    onAsc={handleTechSortAsc}
                    onDesc={handleTechSortDesc}
                  />
                  <SortableMetricTh
                    label="MACD Signal"
                    field="macd_signal_9"
                    sortKey={techSortKey}
                    sortDir={techSortDir}
                    onAsc={handleTechSortAsc}
                    onDesc={handleTechSortDesc}
                  />
                  <SortableMetricTh
                    label="MACD Oscillator"
                    field="macd_histogram"
                    sortKey={techSortKey}
                    sortDir={techSortDir}
                    onAsc={handleTechSortAsc}
                    onDesc={handleTechSortDesc}
                  />
                  <SortableMetricTh
                    label="BB폭"
                    field="bb_width"
                    sortKey={techSortKey}
                    sortDir={techSortDir}
                    onAsc={handleTechSortAsc}
                    onDesc={handleTechSortDesc}
                  />
                  <SortableMetricTh
                    label="BB%B"
                    field="bb_percent_b"
                    sortKey={techSortKey}
                    sortDir={techSortDir}
                    onAsc={handleTechSortAsc}
                    onDesc={handleTechSortDesc}
                  />
                </tr>
              </thead>
              <tbody>
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-wealth-muted">
                      표시할 종목이 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-700/40 hover:bg-wealth-card/40"
                    >
                      <td className="py-2 px-3 text-wealth-gold font-mono whitespace-nowrap">
                        {row.ticker}
                      </td>
                      <td className="py-2 px-3 text-white break-words max-w-[220px]">{row.name}</td>
                      <td className="py-2 px-3 text-wealth-muted whitespace-nowrap">{row.market || '-'}</td>
                      <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap tabular-nums">
                        {formatIntKO(row.latest_close)}
                      </td>
                      <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap tabular-nums">
                        {formatIntKO(row.latest_volume)}
                      </td>
                      <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap tabular-nums">
                        {formatTechDecimal(row.rsi18, 2)}
                      </td>
                      <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap tabular-nums">
                        {formatTechDecimal(row.rsi30, 2)}
                      </td>
                      <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap tabular-nums">
                        {formatTechDecimal(row.macd_12_26, 4)}
                      </td>
                      <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap tabular-nums">
                        {formatTechDecimal(row.macd_signal_9, 4)}
                      </td>
                      <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap tabular-nums">
                        {formatTechDecimal(row.macd_histogram, 4)}
                      </td>
                      <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap tabular-nums">
                        {formatTechDecimal(row.bb_width, 4)}
                      </td>
                      <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap tabular-nums">
                        {formatTechDecimal(row.bb_percent_b, 4)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
