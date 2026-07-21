import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  COMPARISON_OPERATORS,
  DEFAULT_COMPARISON_OP,
  applyClampedDecimalThresholdInput,
  applyRsiThresholdInput,
  fetchUsaIndustryCommonCodesCached,
} from './investmentIndicatorFilters';
import {
  fetchUsaStocksIndicatorsPage,
  fetchUsaStockIndicatorReferenceDateCached,
} from './investmentIndicatorsDataCache';

const PAGE_SIZE = 30;

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

function formatFluctuationRate(v) {
  if (v === null || v === undefined || v === '') return '-';
  const n = Number(v);
  if (Number.isNaN(n)) return '-';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function formatReferenceDate(isoDate) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function fluctuationRateColor(v) {
  if (v === null || v === undefined || v === '') return 'text-wealth-muted';
  const n = Number(v);
  if (Number.isNaN(n)) return 'text-wealth-muted';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-blue-400';
  return 'text-wealth-muted';
}

function parseThresholdValue(raw) {
  const s = raw.trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
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

function PaginationControls({ page, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  if (total <= PAGE_SIZE) {
    return (
      <div className="text-sm text-wealth-muted shrink-0 mt-2">
        전체 <span className="text-wealth-gold tabular-nums">{total}</span>건
        {total > 0 && (
          <span>
            {' '}
            중 {start}-{end}건 표시
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mt-2 shrink-0 gap-2 flex-wrap">
      <div className="text-sm text-wealth-muted">
        전체 {total}건 중 {start}-{end}건 표시
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1 text-sm bg-wealth-card border border-gray-700 rounded text-white hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          이전
        </button>
        <div className="flex gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            if (totalPages <= 7) {
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    page === p
                      ? 'bg-wealth-gold text-white'
                      : 'bg-wealth-card border border-gray-700 text-white hover:bg-gray-700'
                  }`}
                >
                  {p}
                </button>
              );
            }
            if (
              p === 1 ||
              p === totalPages ||
              (p >= page - 1 && p <= page + 1)
            ) {
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    page === p
                      ? 'bg-wealth-gold text-white'
                      : 'bg-wealth-card border border-gray-700 text-white hover:bg-gray-700'
                  }`}
                >
                  {p}
                </button>
              );
            }
            if (p === page - 2 || p === page + 2) {
              return (
                <span key={p} className="px-2 text-wealth-muted">
                  ...
                </span>
              );
            }
            return null;
          })}
        </div>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1 text-sm bg-wealth-card border border-gray-700 rounded text-white hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          다음
        </button>
      </div>
    </div>
  );
}

export default function UsaStockIndicatorsView() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [referenceDate, setReferenceDate] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [market, setMarket] = useState('');

  const [rsi18ComparisonOp, setRsi18ComparisonOp] = useState(DEFAULT_COMPARISON_OP);
  const [rsi18Threshold, setRsi18Threshold] = useState('');
  const [appliedRsi18, setAppliedRsi18] = useState(null);

  const [rsi30ComparisonOp, setRsi30ComparisonOp] = useState(DEFAULT_COMPARISON_OP);
  const [rsi30Threshold, setRsi30Threshold] = useState('');
  const [appliedRsi30, setAppliedRsi30] = useState(null);

  const [bbWidthComparisonOp, setBbWidthComparisonOp] = useState(DEFAULT_COMPARISON_OP);
  const [bbWidthThreshold, setBbWidthThreshold] = useState('');
  const [appliedBbWidth, setAppliedBbWidth] = useState(null);

  const [bbPercentBComparisonOp, setBbPercentBComparisonOp] =
    useState(DEFAULT_COMPARISON_OP);
  const [bbPercentBThreshold, setBbPercentBThreshold] = useState('');
  const [appliedBbPercentB, setAppliedBbPercentB] = useState(null);

  const [macdLineSignFilter, setMacdLineSignFilter] = useState('');
  const [macdSignalSignFilter, setMacdSignalSignFilter] = useState('');
  const [macdHistSignFilter, setMacdHistSignFilter] = useState('');
  const [techSortKey, setTechSortKey] = useState('latest_volume');
  const [techSortDir, setTechSortDir] = useState('desc');
  const [industryDetails, setIndustryDetails] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchUsaIndustryCommonCodesCached()
      .then((rows) => {
        if (!cancelled) setIndustryDetails(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setIndustryDetails([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchUsaStockIndicatorReferenceDateCached()
      .then((date) => {
        if (!cancelled) setReferenceDate(date);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setReferenceDate(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const industryNameByCode = useMemo(() => {
    const m = new Map();
    for (const opt of industryDetails) {
      const code = String(opt.detail_code ?? '').trim();
      if (!code) continue;
      m.set(code, String(opt.detail_code_name ?? '').trim() || code);
    }
    return m;
  }, [industryDetails]);

  const resolveIndustryName = useCallback(
    (code) => {
      const key = String(code ?? '').trim();
      if (!key) return '-';
      return industryNameByCode.get(key) || key;
    },
    [industryNameByCode]
  );

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchUsaStocksIndicatorsPage({
        skip: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        sortBy: techSortKey,
        sortDir: techSortDir,
        market: market.trim() || undefined,
        search: appliedSearch || undefined,
        rsi18Op: appliedRsi18?.op,
        rsi18Val: appliedRsi18?.val,
        rsi30Op: appliedRsi30?.op,
        rsi30Val: appliedRsi30?.val,
        bbWidthOp: appliedBbWidth?.op,
        bbWidthVal: appliedBbWidth?.val,
        bbPercentBOp: appliedBbPercentB?.op,
        bbPercentBVal: appliedBbPercentB?.val,
        macdLineSign: macdLineSignFilter || undefined,
        macdSignalSign: macdSignalSignFilter || undefined,
        macdHistSign: macdHistSignFilter || undefined,
      });
      setRows(result.items);
      setTotal(result.total);
    } catch (err) {
      console.error(err);
      setRows([]);
      setTotal(0);
      setError(err?.message || '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [
    page,
    techSortKey,
    techSortDir,
    market,
    appliedSearch,
    appliedRsi18,
    appliedRsi30,
    appliedBbWidth,
    appliedBbPercentB,
    macdLineSignFilter,
    macdSignalSignFilter,
    macdHistSignFilter,
  ]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const handleTechSortAsc = useCallback((field) => {
    setTechSortKey(field);
    setTechSortDir('asc');
    setPage(1);
  }, []);

  const handleTechSortDesc = useCallback((field) => {
    setTechSortKey(field);
    setTechSortDir('desc');
    setPage(1);
  }, []);

  const applyThresholdFilter = useCallback((raw, op, setter) => {
    const parsed = parseThresholdValue(raw);
    if (parsed === null) {
      setter(null);
      return;
    }
    if (parsed === undefined) return;
    setter({ op, val: parsed });
  }, []);

  const handleSearchKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    setAppliedSearch(search.trim());
    setPage(1);
  };

  const handleRsi18KeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    applyThresholdFilter(rsi18Threshold, rsi18ComparisonOp, setAppliedRsi18);
    setPage(1);
  };

  const handleRsi30KeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    applyThresholdFilter(rsi30Threshold, rsi30ComparisonOp, setAppliedRsi30);
    setPage(1);
  };

  const handleBbWidthKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    applyThresholdFilter(bbWidthThreshold, bbWidthComparisonOp, setAppliedBbWidth);
    setPage(1);
  };

  const handleBbPercentBKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    applyThresholdFilter(bbPercentBThreshold, bbPercentBComparisonOp, setAppliedBbPercentB);
    setPage(1);
  };

  const handleRsi18ThresholdChange = (e) => {
    applyRsiThresholdInput(e.target.value, setRsi18Threshold);
  };
  const handleRsi30ThresholdChange = (e) => {
    applyRsiThresholdInput(e.target.value, setRsi30Threshold);
  };
  const handleBbWidthThresholdChange = (e) => {
    applyClampedDecimalThresholdInput(e.target.value, setBbWidthThreshold, 0, 100);
  };
  const handleBbPercentBThresholdChange = (e) => {
    applyClampedDecimalThresholdInput(e.target.value, setBbPercentBThreshold, 0, 150);
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold text-white mb-2">미국 상장 기업 기술 지표</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap mb-4">
        <div className="w-full sm:w-[220px] shrink-0 border border-gray-700 rounded-lg overflow-hidden flex flex-col">
          <div className="px-3 py-2 bg-wealth-card/30 border-b border-gray-700 text-xs font-medium text-wealth-muted">
            RSI(18)
          </div>
          <div className="p-3 flex flex-col gap-2">
            <select
              value={rsi18ComparisonOp}
              onChange={(e) => setRsi18ComparisonOp(e.target.value)}
              className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
            >
              {COMPARISON_OPERATORS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
            <input
              type="text"
              inputMode="decimal"
              value={rsi18Threshold}
              onChange={handleRsi18ThresholdChange}
              onKeyDown={handleRsi18KeyDown}
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
              value={rsi30ComparisonOp}
              onChange={(e) => setRsi30ComparisonOp(e.target.value)}
              className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
            >
              {COMPARISON_OPERATORS.map((op) => (
                <option key={`30-${op}`} value={op}>
                  {op}
                </option>
              ))}
            </select>
            <input
              type="text"
              inputMode="decimal"
              value={rsi30Threshold}
              onChange={handleRsi30ThresholdChange}
              onKeyDown={handleRsi30KeyDown}
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
              value={bbWidthComparisonOp}
              onChange={(e) => setBbWidthComparisonOp(e.target.value)}
              className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
            >
              {COMPARISON_OPERATORS.map((op) => (
                <option key={`bbw-${op}`} value={op}>
                  {op}
                </option>
              ))}
            </select>
            <input
              type="text"
              inputMode="decimal"
              value={bbWidthThreshold}
              onChange={handleBbWidthThresholdChange}
              onKeyDown={handleBbWidthKeyDown}
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
              value={bbPercentBComparisonOp}
              onChange={(e) => setBbPercentBComparisonOp(e.target.value)}
              className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
            >
              {COMPARISON_OPERATORS.map((op) => (
                <option key={`bbp-${op}`} value={op}>
                  {op}
                </option>
              ))}
            </select>
            <input
              type="text"
              inputMode="decimal"
              value={bbPercentBThreshold}
              onChange={handleBbPercentBThresholdChange}
              onKeyDown={handleBbPercentBKeyDown}
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
                onChange={(e) => {
                  setMacdLineSignFilter(e.target.value);
                  setPage(1);
                }}
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
                onChange={(e) => {
                  setMacdSignalSignFilter(e.target.value);
                  setPage(1);
                }}
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
                onChange={(e) => {
                  setMacdHistSignFilter(e.target.value);
                  setPage(1);
                }}
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

      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="usa-mkt-search" className="block text-xs text-wealth-muted mb-1">
            티커·종목명 검색
          </label>
          <input
            id="usa-mkt-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="예: Apple, AAPL"
            autoComplete="off"
            className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2.5 px-3 text-sm placeholder:text-wealth-muted/70 focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
          />
        </div>
        <div>
          <label htmlFor="usa-mkt-market" className="block text-xs text-wealth-muted mb-1">
            시장
          </label>
          <select
            id="usa-mkt-market"
            value={market}
            onChange={(e) => {
              setMarket(e.target.value);
              setPage(1);
            }}
            className="bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
          >
            <option value="">전체</option>
            <option value="NYSE">NYSE</option>
            <option value="NASDAQ">NASDAQ</option>
          </select>
        </div>
      </div>

      <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-4 flex flex-col">
        <div className="flex items-center justify-between shrink-0 mb-2">
          <p className="text-xs text-wealth-muted">
            전체{' '}
            <span className="text-wealth-gold tabular-nums">{total}</span>
            건
          </p>
          {referenceDate ? (
            <span className="text-xs text-wealth-muted tabular-nums">
              기준일: {formatReferenceDate(referenceDate)}
            </span>
          ) : null}
        </div>
        {loading ? (
          <div className="text-center py-8 text-wealth-muted flex-1">로딩 중…</div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-gray-700/50">
              <table className="w-full text-sm border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b border-gray-700 text-left text-wealth-muted bg-wealth-card/95 backdrop-blur">
                    <th className="py-2 px-3 font-medium whitespace-nowrap">티커</th>
                    <th className="py-2 px-3 font-medium">종목명</th>
                    <th className="py-2 px-3 font-medium whitespace-nowrap">업종</th>
                    <th className="py-2 px-3 font-medium whitespace-nowrap">시장</th>
                    <th className="py-2 px-3 font-medium text-right whitespace-nowrap">종가(USD)</th>
                    <SortableMetricTh
                      label="등락률"
                      field="fluctuation_rate"
                      sortKey={techSortKey}
                      sortDir={techSortDir}
                      onAsc={handleTechSortAsc}
                      onDesc={handleTechSortDesc}
                    />
                    <SortableMetricTh
                      label="거래량"
                      field="latest_volume"
                      sortKey={techSortKey}
                      sortDir={techSortDir}
                      onAsc={handleTechSortAsc}
                      onDesc={handleTechSortDesc}
                    />
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
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-8 text-center text-wealth-muted">
                        표시할 종목이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-gray-700/40 hover:bg-wealth-card/40"
                      >
                        <td className="py-2 px-3 text-wealth-gold font-mono whitespace-nowrap">
                          {row.ticker}
                        </td>
                        <td className="py-2 px-3 text-white break-words max-w-[220px]">{row.name}</td>
                        <td className="py-2 px-3 text-wealth-muted whitespace-nowrap">
                          {resolveIndustryName(row.usa_industry_type)}
                        </td>
                        <td className="py-2 px-3 text-wealth-muted whitespace-nowrap">{row.market || '-'}</td>
                        <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap tabular-nums">
                          {formatTechDecimal(row.latest_close, 2)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right whitespace-nowrap tabular-nums ${fluctuationRateColor(row.fluctuation_rate)}`}
                        >
                          {formatFluctuationRate(row.fluctuation_rate)}
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
            <PaginationControls
              page={page}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
