import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Fragment,
} from 'react';
import { getStocksRestApiUrl, API_ENDPOINTS } from '../../utils/api';
import {
  fetchDomesticEtfFilterCommonCodesCached,
  COMPARISON_OPERATORS,
  DEFAULT_COMPARISON_OP,
  shouldApplyComparisonFilter,
  matchesMacdSignFilter,
  matchesRsiValue,
  applyClampedDecimalThresholdInput,
  applyRsiThresholdInput,
} from './investmentIndicatorFilters';
import {
  fetchDomesticEtfsIndicatorsCached,
  fetchAssetManagementInstCached,
  fetchDomesticEtfReferenceDateCached,
} from './investmentIndicatorsDataCache';

const DOMESTIC_ETFS_URL = getStocksRestApiUrl(API_ENDPOINTS.DOMESTIC_ETFS);

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

function fluctuationRateColor(v) {
  if (v === null || v === undefined || v === '') return 'text-wealth-muted';
  const n = Number(v);
  if (Number.isNaN(n)) return 'text-wealth-muted';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-blue-400';
  return 'text-wealth-muted';
}

function formatCompensation(value) {
  if (value === null || value === undefined || value === '') return '-';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  if (n === 0) return '0%';
  // DB 값 그대로 %만 붙임 (×100 없음). 0.0500 → 0.05%, 0.3950 → 0.395%
  let s = n.toFixed(10);
  if (s.includes('.')) {
    s = s.replace(/0+$/, '').replace(/\.$/, '');
  }
  return `${s}%`;
}

function PdfPortfolioIcon({ open }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`w-4 h-4 shrink-0 ${open ? 'text-wealth-gold' : 'text-wealth-muted'}`}
      aria-hidden
    >
      <title>구성 종목</title>
      <path d="M4 6.75A.75.75 0 0 1 4.75 6h14.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 6.75ZM4 12a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 12Zm0 5.25a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1-.75-.75ZM17.25 16.5a.75.75 0 0 0 0 1.5h2.25a.75.75 0 0 0 0-1.5H17.25Z" />
    </svg>
  );
}

function groupEtfsByBaseIndex(etfs) {
  const m = new Map();
  for (const e of etfs) {
    const raw = e.base_index;
    const key =
      raw != null && String(raw).trim() !== ''
        ? String(raw).trim()
        : '(기초지수 없음)';
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(e);
  }
  const entries = [...m.entries()];
  entries.sort((a, b) => {
    if (a[0] === '(기초지수 없음)') return 1;
    if (b[0] === '(기초지수 없음)') return -1;
    return a[0].localeCompare(b[0], 'ko');
  });
  for (const [, list] of entries) {
    list.sort((x, y) => String(x.ticker).localeCompare(String(y.ticker), 'ko'));
  }
  return entries;
}

function filterGroupsByLabel(groups, query) {
  const q = query.trim();
  if (!q) return groups;
  const lower = q.toLowerCase();
  return groups.filter(([label]) =>
    String(label).toLowerCase().includes(lower)
  );
}

export default function DomesticEtfIndicatorsView() {
  const [etfs, setEtfs] = useState([]);
  const [referenceDate, setReferenceDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [assetInstitutions, setAssetInstitutions] = useState([]);
  const [assetInstError, setAssetInstError] = useState(null);
  const [selectedManagerNames, setSelectedManagerNames] = useState([]);
  const [etfFilterLoadError, setEtfFilterLoadError] = useState(null);
  const [marketClassOptions, setMarketClassOptions] = useState([]);
  const [etfTaxTypeOptions, setEtfTaxTypeOptions] = useState([]);
  /** '' = 전체, 그 외 = common_code_detail.detail_code (kr_etf_market_classification 마스터 하위) */
  const [selectedMarketClassCode, setSelectedMarketClassCode] = useState('');
  const [rsi18ComparisonOp, setRsi18ComparisonOp] = useState(DEFAULT_COMPARISON_OP);
  const [rsi18Threshold, setRsi18Threshold] = useState('');
  const [rsi30ComparisonOp, setRsi30ComparisonOp] = useState(DEFAULT_COMPARISON_OP);
  const [rsi30Threshold, setRsi30Threshold] = useState('');
  const [bbWidthComparisonOp, setBbWidthComparisonOp] = useState(DEFAULT_COMPARISON_OP);
  const [bbWidthThreshold, setBbWidthThreshold] = useState('');
  const [bbPercentBComparisonOp, setBbPercentBComparisonOp] =
    useState(DEFAULT_COMPARISON_OP);
  const [bbPercentBThreshold, setBbPercentBThreshold] = useState('');
  const [macdLineSignFilter, setMacdLineSignFilter] = useState('');
  const [macdSignalSignFilter, setMacdSignalSignFilter] = useState('');
  const [macdHistSignFilter, setMacdHistSignFilter] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());
  const [groupFilter, setGroupFilter] = useState('');
  /** 종목코드(ticker)·종목명(name) 부분 일치 */
  const [etfTickerNameFilter, setEtfTickerNameFilter] = useState('');

  /**
   * 화면에 필요한 3개 API를 병렬로 받고(Promise.allSettled),
   * 모두 완료된 뒤 단일 렌더 사이클에서 setState 를 호출해
   * "빈 목록 → 부분 목록 → 최종 목록" 같은 계단식 플리커를 방지한다.
   */
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAssetInstError(null);
    setEtfFilterLoadError(null);

    const [etfsResult, assetsResult, commonCodeResult, referenceDateResult] =
      await Promise.allSettled([
      fetchDomesticEtfsIndicatorsCached(),
      fetchAssetManagementInstCached(),
      fetchDomesticEtfFilterCommonCodesCached(),
      fetchDomesticEtfReferenceDateCached(),
    ]);

    if (etfsResult.status === 'fulfilled') {
      setEtfs(etfsResult.value);
    } else {
      console.error(etfsResult.reason);
      setEtfs([]);
      setError(
        etfsResult.reason?.message || '데이터를 불러오지 못했습니다.'
      );
    }

    if (assetsResult.status === 'fulfilled') {
      setAssetInstitutions(assetsResult.value);
    } else {
      console.error(assetsResult.reason);
      setAssetInstitutions([]);
      setAssetInstError(
        assetsResult.reason?.message || '자산운용사 목록을 불러오지 못했습니다.'
      );
    }

    if (commonCodeResult.status === 'fulfilled') {
      const { marketClassDetails: mcRows, etfTaxTypeDetails: taxRows } =
        commonCodeResult.value;

      setMarketClassOptions(mcRows);
      setEtfTaxTypeOptions(taxRows ?? []);
    } else {
      console.error(commonCodeResult.reason);
      setMarketClassOptions([]);
      setEtfTaxTypeOptions([]);
      setEtfFilterLoadError(
        commonCodeResult.reason?.message ||
          '시장분류 / 과세유형 목록을 불러오지 못했습니다.'
      );
    }

    if (referenceDateResult.status === 'fulfilled') {
      setReferenceDate(referenceDateResult.value);
    } else {
      console.error(referenceDateResult.reason);
      setReferenceDate(null);
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

  const filteredEtfs = useMemo(() => {
    let list = etfs;
    const symQ = etfTickerNameFilter.trim().toLowerCase();
    if (symQ) {
      list = list.filter(
        (e) =>
          String(e.ticker || '')
            .toLowerCase()
            .includes(symQ) ||
          String(e.name || '')
            .toLowerCase()
            .includes(symQ)
      );
    }
    if (selectedMarketClassCode) {
      list = list.filter(
        (e) =>
          String(e.kr_etf_market_classification ?? '').trim() ===
          selectedMarketClassCode
      );
    }
    if (selectedManagerNames.length > 0) {
      const sel = new Set(selectedManagerNames);
      list = list.filter((e) => {
        const am = e.asset_manager != null ? String(e.asset_manager).trim() : '';
        return am && sel.has(am);
      });
    }
    if (shouldApplyComparisonFilter(rsi18ThresholdNum, rsi18ComparisonOp)) {
      list = list.filter((e) =>
        matchesRsiValue(e.rsi18, rsi18ComparisonOp, rsi18ThresholdNum)
      );
    }
    if (shouldApplyComparisonFilter(rsi30ThresholdNum, rsi30ComparisonOp)) {
      list = list.filter((e) =>
        matchesRsiValue(e.rsi30, rsi30ComparisonOp, rsi30ThresholdNum)
      );
    }
    if (shouldApplyComparisonFilter(bbWidthThresholdNum, bbWidthComparisonOp)) {
      list = list.filter((e) =>
        matchesRsiValue(e.bb_width, bbWidthComparisonOp, bbWidthThresholdNum)
      );
    }
    if (shouldApplyComparisonFilter(bbPercentBThresholdNum, bbPercentBComparisonOp)) {
      list = list.filter((e) =>
        matchesRsiValue(e.bb_percent_b, bbPercentBComparisonOp, bbPercentBThresholdNum)
      );
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
    etfs,
    etfTickerNameFilter,
    selectedManagerNames,
    selectedMarketClassCode,
    rsi18ThresholdNum,
    rsi30ThresholdNum,
    rsi18ComparisonOp,
    rsi30ComparisonOp,
    bbWidthThresholdNum,
    bbPercentBThresholdNum,
    bbWidthComparisonOp,
    bbPercentBComparisonOp,
    macdLineSignFilter,
    macdSignalSignFilter,
    macdHistSignFilter,
  ]);

  /** detail_code → detail_code_name 매핑 (EtfMiniGrid 표시용) */
  const marketClassNameByCode = useMemo(() => {
    const m = new Map();
    for (const opt of marketClassOptions) {
      const code = String(opt.detail_code ?? '').trim();
      if (!code) continue;
      m.set(code, String(opt.detail_code_name ?? '').trim() || code);
    }
    return m;
  }, [marketClassOptions]);

  const etfTaxTypeNameByCode = useMemo(() => {
    const m = new Map();
    for (const opt of etfTaxTypeOptions) {
      const code = String(opt.detail_code ?? '').trim();
      if (!code) continue;
      m.set(code, String(opt.detail_code_name ?? '').trim() || code);
    }
    return m;
  }, [etfTaxTypeOptions]);

  const toggleManagerName = useCallback((name) => {
    const key = String(name ?? '').trim();
    if (!key) return;
    setSelectedManagerNames((prev) =>
      prev.includes(key) ? prev.filter((n) => n !== key) : [...prev, key]
    );
  }, []);

  const handleRsi18ThresholdChange = useCallback((e) => {
    applyRsiThresholdInput(e.target.value, setRsi18Threshold);
  }, []);

  const handleRsi30ThresholdChange = useCallback((e) => {
    applyRsiThresholdInput(e.target.value, setRsi30Threshold);
  }, []);

  const handleBbWidthThresholdChange = useCallback((e) => {
    applyClampedDecimalThresholdInput(
      e.target.value,
      setBbWidthThreshold,
      0,
      100
    );
  }, []);

  const handleBbPercentBThresholdChange = useCallback((e) => {
    applyClampedDecimalThresholdInput(
      e.target.value,
      setBbPercentBThreshold,
      0,
      150
    );
  }, []);

  const groups = useMemo(() => groupEtfsByBaseIndex(filteredEtfs), [filteredEtfs]);

  const filteredGroups = useMemo(
    () => filterGroupsByLabel(groups, groupFilter),
    [groups, groupFilter]
  );

  /** 종목 검색어가 있으면 매칭된 그룹을 자동으로 모두 펼침 */
  const effectiveExpanded = useMemo(() => {
    if (!etfTickerNameFilter.trim()) return expanded;
    const autoOpen = new Set(expanded);
    for (const [label] of filteredGroups) {
      autoOpen.add(label);
    }
    return autoOpen;
  }, [etfTickerNameFilter, filteredGroups, expanded]);

  const toggleGroup = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="max-w-[95%] mx-auto px-6 py-8">
      <h2 className="text-xl font-semibold text-white mb-4">국내 상장 ETF 기술 지표</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-wealth-muted">로딩 중...</div>
      ) : (
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6 flex flex-col max-h-[calc(100vh-180px)] min-h-0">
          <div className="shrink-0 mb-4 space-y-3">
            {assetInstError && (
              <p className="text-xs text-amber-400/90">{assetInstError}</p>
            )}
            {etfFilterLoadError && (
              <p className="text-xs text-amber-400/90">{etfFilterLoadError}</p>
            )}
            {marketClassOptions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-wealth-muted mb-2">
                  시장분류
                </p>
                <div
                  className="inline-flex flex-wrap gap-2"
                  role="group"
                  aria-label="시장분류 필터"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedMarketClassCode('')}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      selectedMarketClassCode === ''
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-wealth-card/80 border border-blue-500/70 text-blue-300 hover:bg-blue-500/15'
                    }`}
                  >
                    전체
                  </button>
                  {marketClassOptions.map((opt) => {
                    const code = String(opt.detail_code ?? '').trim();
                    if (!code) return null;
                    const active = selectedMarketClassCode === code;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedMarketClassCode(code)}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                          active
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-wealth-card/80 border border-blue-500/70 text-blue-300 hover:bg-blue-500/15'
                        }`}
                      >
                        {opt.detail_code_name || code}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex flex-col lg:flex-row gap-3 items-stretch">
              {assetInstitutions.length > 0 && (
                <div className="w-full max-w-[min(100%,17rem)] lg:w-[17rem] lg:flex-none lg:shrink-0 min-w-0 border border-gray-700 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-wealth-card/30 border-b border-gray-700 text-xs font-medium text-wealth-muted">
                    자산운용사
                  </div>
                  <div className="max-h-44 overflow-y-auto divide-y divide-gray-700/80">
                    {assetInstitutions.map((inst) => {
                      const nameKey = String(inst.name ?? '').trim();
                      const checked =
                        nameKey !== '' && selectedManagerNames.includes(nameKey);
                      return (
                        <label
                          key={inst.id}
                          className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-wealth-card/40 text-sm text-white"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleManagerName(inst.name)}
                            className="rounded border-gray-600 bg-wealth-card text-wealth-gold focus:ring-wealth-gold/40 shrink-0"
                          />
                          <span className="min-w-0">
                            {inst.name}({inst.code})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full lg:w-auto flex-wrap">
                    <div className="w-full sm:w-[220px] shrink-0 border border-gray-700 rounded-lg overflow-hidden flex flex-col">
                      <div className="px-3 py-2 bg-wealth-card/30 border-b border-gray-700 text-xs font-medium text-wealth-muted">
                        RSI(18)
                      </div>
                      <div className="p-3 flex flex-col gap-2 flex-1 min-h-0">
                        <label htmlFor="rsi18-comparison-op" className="sr-only">
                          RSI(18) 비교 연산
                        </label>
                        <select
                          id="rsi18-comparison-op"
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
                        <label htmlFor="rsi18-threshold" className="sr-only">
                          RSI(18) 기준값
                        </label>
                        <input
                          id="rsi18-threshold"
                          type="text"
                          inputMode="decimal"
                          value={rsi18Threshold}
                          onChange={handleRsi18ThresholdChange}
                          placeholder="0 ~ 100"
                          autoComplete="off"
                          className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2 px-2 text-sm tabular-nums placeholder:text-wealth-muted/70 focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
                        />
                        <p className="text-[10px] text-wealth-muted leading-snug">
                          기준값(0~100)을 입력하면 RSI(18)이 선택한 조건과 일치하는 종목만 표시합니다.
                        </p>
                      </div>
                    </div>
                    <div className="w-full sm:w-[220px] shrink-0 border border-gray-700 rounded-lg overflow-hidden flex flex-col">
                      <div className="px-3 py-2 bg-wealth-card/30 border-b border-gray-700 text-xs font-medium text-wealth-muted">
                        RSI(30)
                      </div>
                      <div className="p-3 flex flex-col gap-2 flex-1 min-h-0">
                        <label htmlFor="rsi30-comparison-op" className="sr-only">
                          RSI(30) 비교 연산
                        </label>
                        <select
                          id="rsi30-comparison-op"
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
                        <label htmlFor="rsi30-threshold" className="sr-only">
                          RSI(30) 기준값
                        </label>
                        <input
                          id="rsi30-threshold"
                          type="text"
                          inputMode="decimal"
                          value={rsi30Threshold}
                          onChange={handleRsi30ThresholdChange}
                          placeholder="0 ~ 100"
                          autoComplete="off"
                          className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2 px-2 text-sm tabular-nums placeholder:text-wealth-muted/70 focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
                        />
                        <p className="text-[10px] text-wealth-muted leading-snug">
                          기준값(0~100)을 입력하면 RSI(30)이 선택한 조건과 일치하는 종목만 표시합니다.
                        </p>
                      </div>
                    </div>
                    <div className="w-full sm:w-[220px] shrink-0 border border-gray-700 rounded-lg overflow-hidden flex flex-col">
                      <div className="px-3 py-2 bg-wealth-card/30 border-b border-gray-700 text-xs font-medium text-wealth-muted">
                        BB폭
                      </div>
                      <div className="p-3 flex flex-col gap-2 flex-1 min-h-0">
                        <label htmlFor="bb-width-comparison-op" className="sr-only">
                          BB폭 비교 연산
                        </label>
                        <select
                          id="bb-width-comparison-op"
                          value={bbWidthComparisonOp}
                          onChange={(e) =>
                            setBbWidthComparisonOp(e.target.value)
                          }
                          className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
                        >
                          {COMPARISON_OPERATORS.map((op) => (
                            <option key={`bbw-${op}`} value={op}>
                              {op}
                            </option>
                          ))}
                        </select>
                        <label htmlFor="bb-width-threshold" className="sr-only">
                          BB폭 기준값
                        </label>
                        <input
                          id="bb-width-threshold"
                          type="text"
                          inputMode="decimal"
                          value={bbWidthThreshold}
                          onChange={handleBbWidthThresholdChange}
                          placeholder="0 ~ 100"
                          autoComplete="off"
                          className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2 px-2 text-sm tabular-nums placeholder:text-wealth-muted/70 focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
                        />
                        <p className="text-[10px] text-wealth-muted leading-snug">
                          기준값(0~100)을 입력하면 BB폭이 선택한 조건과 일치하는 종목만 표시합니다.
                        </p>
                      </div>
                    </div>
                    <div className="w-full sm:w-[220px] shrink-0 border border-gray-700 rounded-lg overflow-hidden flex flex-col">
                      <div className="px-3 py-2 bg-wealth-card/30 border-b border-gray-700 text-xs font-medium text-wealth-muted">
                        BB%B
                      </div>
                      <div className="p-3 flex flex-col gap-2 flex-1 min-h-0">
                        <label htmlFor="bb-pctb-comparison-op" className="sr-only">
                          BB%B 비교 연산
                        </label>
                        <select
                          id="bb-pctb-comparison-op"
                          value={bbPercentBComparisonOp}
                          onChange={(e) =>
                            setBbPercentBComparisonOp(e.target.value)
                          }
                          className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
                        >
                          {COMPARISON_OPERATORS.map((op) => (
                            <option key={`bbpct-${op}`} value={op}>
                              {op}
                            </option>
                          ))}
                        </select>
                        <label htmlFor="bb-pctb-threshold" className="sr-only">
                          BB%B 기준값
                        </label>
                        <input
                          id="bb-pctb-threshold"
                          type="text"
                          inputMode="decimal"
                          value={bbPercentBThreshold}
                          onChange={handleBbPercentBThresholdChange}
                          placeholder="0 ~ 150"
                          autoComplete="off"
                          className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2 px-2 text-sm tabular-nums placeholder:text-wealth-muted/70 focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
                        />
                        <p className="text-[10px] text-wealth-muted leading-snug">
                          기준값(0~150)을 입력하면 BB%B가 선택한 조건과 일치하는 종목만 표시합니다.
                        </p>
                      </div>
                    </div>
                <div className="w-full sm:w-auto sm:min-w-[26rem] sm:max-w-[min(100%,32rem)] shrink-0 border border-gray-700 rounded-lg overflow-hidden flex flex-col">
                  <div className="px-2 py-1.5 bg-wealth-card/30 border-b border-gray-700 text-[11px] font-medium text-wealth-muted">
                    MACD 부호
                  </div>
                  <div className="p-2.5 flex flex-row flex-nowrap gap-2 items-stretch min-w-0">
                    <div className="flex flex-col gap-0.5 flex-1 basis-0 min-w-[7.5rem]">
                      <label
                        htmlFor="macd-line-sign"
                        className="text-[9px] font-medium text-wealth-muted leading-tight truncate"
                        title="MACD"
                      >
                        MACD
                      </label>
                      <select
                        id="macd-line-sign"
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
                      <label
                        htmlFor="macd-signal-sign"
                        className="text-[9px] font-medium text-wealth-muted leading-tight truncate"
                        title="MACD Signal"
                      >
                        Signal
                      </label>
                      <select
                        id="macd-signal-sign"
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
                      <label
                        htmlFor="macd-hist-sign"
                        className="text-[9px] font-medium text-wealth-muted leading-tight truncate"
                        title="MACD Oscillator"
                      >
                        Oscillator
                      </label>
                      <select
                        id="macd-hist-sign"
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
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <div className="flex-1 min-w-0">
                <label
                  htmlFor="domestic-etf-group-filter"
                  className="block text-xs text-wealth-muted mb-1"
                >
                  기초지수 그룹
                </label>
                <input
                  id="domestic-etf-group-filter"
                  type="search"
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  placeholder="기초지수 그룹명 검색…"
                  autoComplete="off"
                  className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2.5 px-3 text-sm placeholder:text-wealth-muted/70 focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
                />
              </div>
              <div className="w-full sm:w-[min(100%,20rem)] shrink-0">
                <label
                  htmlFor="domestic-etf-ticker-name-filter"
                  className="block text-xs text-wealth-muted mb-1"
                >
                  종목
                </label>
                <input
                  id="domestic-etf-ticker-name-filter"
                  type="search"
                  value={etfTickerNameFilter}
                  onChange={(e) => setEtfTickerNameFilter(e.target.value)}
                  placeholder="티커·종목명 (예: 494300, KODEX)"
                  autoComplete="off"
                  className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2.5 px-3 text-sm placeholder:text-wealth-muted/70 focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
                />
              </div>
            </div>
            {(groups.length > 0 || referenceDate) && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                {groups.length > 0 ? (
                  <p className="text-xs text-wealth-muted">
                    그룹{' '}
                    <span className="text-wealth-gold tabular-nums">
                      {filteredGroups.length}
                    </span>
                    {groupFilter.trim() ? (
                      <>
                        {' '}
                        / 전체{' '}
                        <span className="text-wealth-muted tabular-nums">
                          {groups.length}
                        </span>
                      </>
                    ) : null}
                  </p>
                ) : null}
                {referenceDate ? (
                  <span className="text-sm text-wealth-muted tabular-nums ml-auto">
                    기준일 :{' '}
                    {new Date(referenceDate).toLocaleDateString('ko-KR')}
                  </span>
                ) : null}
              </div>
            )}
          </div>
          <div className="space-y-1 flex-1 min-h-0 overflow-y-auto pr-1">
            {groups.length === 0 ? (
              <p className="text-wealth-muted text-sm py-4">표시할 ETF가 없습니다.</p>
            ) : filteredGroups.length === 0 ? (
              <p className="text-wealth-muted text-sm py-4">
                &quot;{groupFilter.trim()}&quot; 에 맞는 기초지수 그룹이 없습니다.
              </p>
            ) : (
              filteredGroups.map(([baseLabel, list]) => {
                const isOpen = effectiveExpanded.has(baseLabel);
                return (
                  <div key={baseLabel} className="select-none">
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer group hover:bg-wealth-card/50">
                      <button
                        type="button"
                        onClick={() => toggleGroup(baseLabel)}
                        className="w-5 h-5 shrink-0 flex items-center justify-center rounded text-wealth-gold hover:text-yellow-300 hover:bg-wealth-gold/15 font-semibold text-[10px] leading-none border border-wealth-gold/40"
                        title={`ETF ${list.length}종목 — 펼치기/접기`}
                        aria-expanded={isOpen}
                        aria-label={isOpen ? '그룹 접기' : '그룹 펼치기'}
                      >
                        {isOpen ? '▼' : '▶'}
                      </button>
                      <span className="flex-1 text-white font-medium text-sm truncate min-w-0">
                        {baseLabel}
                      </span>
                      <span className="text-[10px] font-normal text-wealth-gold/90 whitespace-nowrap shrink-0 px-1.5 py-0.5 rounded bg-wealth-gold/10 border border-wealth-gold/25">
                        {list.length}
                      </span>
                    </div>
                    {isOpen && (
                      <div className="ml-6 mt-2 mb-4 border-l border-gray-700 pl-3">
                        <EtfMiniGrid
                          rows={list}
                          marketClassNameByCode={marketClassNameByCode}
                          etfTaxTypeNameByCode={etfTaxTypeNameByCode}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EtfMiniGrid({ rows, marketClassNameByCode, etfTaxTypeNameByCode }) {
  const [openPdfEtfId, setOpenPdfEtfId] = useState(null);
  const [pdfState, setPdfState] = useState({
    status: 'idle',
    items: [],
    error: null,
  });
  const fetchGenRef = useRef(0);

  const pdfItemsWithName = useMemo(
    () =>
      pdfState.items.filter(
        (p) => String(p.stock_name ?? '').trim() !== ''
      ),
    [pdfState.items]
  );

  /** 해외 ETF: usa_stocks.krx_isu_cd 매핑된 편입종목만 (정렬은 API) */
  const pdfItemsUsaMapped = useMemo(
    () =>
      pdfState.items.filter(
        (p) => String(p.display_ticker ?? '').trim() !== ''
      ),
    [pdfState.items]
  );

  const togglePdfPanel = useCallback(
    async (etfId) => {
      if (openPdfEtfId === etfId) {
        setOpenPdfEtfId(null);
        return;
      }
      const gen = ++fetchGenRef.current;
      setOpenPdfEtfId(etfId);
      setPdfState({ status: 'loading', items: [], error: null });
      try {
        const res = await fetch(
          `${DOMESTIC_ETFS_URL}/${etfId}/pdf-portfolio`
        );
        if (!res.ok) {
          const raw = await res.text();
          let msg = raw;
          try {
            const j = JSON.parse(raw);
            msg = j.detail ?? raw;
          } catch {
            /* use raw */
          }
          throw new Error(
            res.status === 404 ? 'ETF를 찾을 수 없습니다.' : msg || res.statusText
          );
        }
        const data = await res.json();
        if (gen !== fetchGenRef.current) return;
        setPdfState({
          status: 'done',
          items: Array.isArray(data) ? data : [],
          error: null,
        });
      } catch (e) {
        if (gen !== fetchGenRef.current) return;
        setPdfState({
          status: 'error',
          items: [],
          error: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [openPdfEtfId]
  );

  if (!rows.length) {
    return <p className="text-wealth-muted text-sm p-4">종목이 없습니다.</p>;
  }
  const resolveMarketClass = (code) => {
    const c = String(code ?? '').trim();
    if (!c) return '-';
    if (marketClassNameByCode && marketClassNameByCode.has(c)) {
      return marketClassNameByCode.get(c);
    }
    return c;
  };
  const resolveTaxType = (code) => {
    const c = String(code ?? '').trim();
    if (!c) return '-';
    if (etfTaxTypeNameByCode && etfTaxTypeNameByCode.has(c)) {
      return etfTaxTypeNameByCode.get(c);
    }
    return c;
  };
  /** 티커 열 폭 — 종목명 sticky left 와 맞춤 */
  const tickerColW = 'w-20 min-w-20 max-w-20';
  const stickyTickerTh =
    `py-2 pl-3 pr-2 font-medium whitespace-nowrap sticky left-0 z-30 ${tickerColW} box-border bg-wealth-card text-wealth-muted shadow-[4px_0_8px_-4px_rgba(0,0,0,0.4)]`;
  const stickyNameTh =
    'py-2 px-3 font-medium sticky left-20 z-30 min-w-[12rem] max-w-[13rem] w-[13rem] box-border bg-wealth-card text-wealth-muted shadow-[4px_0_8px_-4px_rgba(0,0,0,0.4)]';
  const stickyTickerTd =
    `py-2 pl-3 pr-2 text-wealth-gold font-mono whitespace-nowrap sticky left-0 z-10 ${tickerColW} box-border bg-wealth-card group-hover:bg-gray-800/90 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.35)]`;
  const stickyNameTd =
    'py-2 px-3 text-white sticky left-20 z-10 min-w-[12rem] max-w-[13rem] w-[13rem] box-border bg-wealth-card group-hover:bg-gray-800/90 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.35)]';
  const colCount = 14;
  /** 편입 7열 테이블 — 본문 폭에 맞춤(상위는 w-fit 로 테이블에 맞춤) */
  const pdfPortfolioTableClass =
    'text-xs sm:text-sm border-collapse min-w-[760px] max-w-full';
  const pdfPortfolioTableClassOverseas =
    'text-xs sm:text-sm border-collapse min-w-[900px] max-w-full';
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700/50 bg-wealth-card/30">
      <table className="w-full text-sm border-collapse min-w-[1340px]">
        <thead>
          <tr className="border-b border-gray-700 text-left bg-wealth-card/40">
            <th className={stickyTickerTh}>티커</th>
            <th className={stickyNameTh}>종목명</th>
            <th className="py-2 px-3 font-medium whitespace-nowrap text-wealth-muted">시장분류</th>
            <th className="py-2 px-3 font-medium whitespace-nowrap text-wealth-muted">과세유형</th>
            <th className="py-2 px-3 font-medium text-right whitespace-nowrap text-wealth-muted">총보수</th>
            <th className="py-2 px-3 font-medium text-right whitespace-nowrap text-wealth-muted">종가</th>
            <th className="py-2 px-3 font-medium text-right whitespace-nowrap text-wealth-muted">거래량</th>
            <th className="py-2 px-3 font-medium text-right whitespace-nowrap text-wealth-muted">RSI(18)</th>
            <th className="py-2 px-3 font-medium text-right whitespace-nowrap text-wealth-muted">RSI(30)</th>
            <th className="py-2 px-3 font-medium text-right whitespace-nowrap text-wealth-muted">MACD</th>
            <th className="py-2 px-3 font-medium text-right whitespace-nowrap text-wealth-muted">MACD Signal</th>
            <th className="py-2 px-3 font-medium text-right whitespace-nowrap text-wealth-muted">MACD Oscillator</th>
            <th className="py-2 px-3 font-medium text-right whitespace-nowrap text-wealth-muted">BB폭</th>
            <th className="py-2 px-3 font-medium text-right whitespace-nowrap text-wealth-muted">BB%B</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Fragment key={row.id}>
              <tr className="group border-b border-gray-700/40 hover:bg-wealth-card/40">
                <td className={stickyTickerTd}>{row.ticker}</td>
                <td className={stickyNameTd}>
                  <div className="flex items-center gap-1.5 min-w-0 w-full">
                    <span className="truncate min-w-0 flex-1" title={row.name}>
                      {row.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePdfPanel(row.id);
                      }}
                      className="shrink-0 p-0.5 rounded hover:bg-wealth-gold/15 focus:outline-none focus:ring-1 focus:ring-wealth-gold/50"
                      title="편입 구성 stock.domestic_etfs_pdf"
                      aria-expanded={openPdfEtfId === row.id}
                      aria-label="편입 구성 보기/닫기"
                    >
                      <PdfPortfolioIcon open={openPdfEtfId === row.id} />
                    </button>
                  </div>
                </td>
                <td className="py-2 px-3 text-wealth-muted whitespace-nowrap">
                  {resolveMarketClass(row.kr_etf_market_classification)}
                </td>
                <td className="py-2 px-3 text-wealth-muted whitespace-nowrap">
                  {resolveTaxType(row.etf_tax_type)}
                </td>
                <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap">
                  {formatCompensation(row.compensation)}
                </td>
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
              {openPdfEtfId === row.id && (() => {
                const isOverseasEtf =
                  resolveMarketClass(row.kr_etf_market_classification) === '해외';
                const pdfItems = isOverseasEtf ? pdfItemsUsaMapped : pdfItemsWithName;
                return (
                <tr className="bg-wealth-card/25 border-b border-gray-700/40">
                  <td colSpan={colCount} className="px-3 py-3 pl-6 align-top">
                    <div className={`w-fit max-w-full rounded-lg border border-gray-700/50 bg-wealth-dark/40 overflow-hidden ${isOverseasEtf ? 'min-w-[900px]' : 'min-w-[760px]'}`}>
                      {pdfState.status === 'loading' && (
                        <p className="text-sm text-wealth-muted px-3 py-4">불러오는 중…</p>
                      )}
                      {pdfState.status === 'error' && (
                        <p className="text-sm text-red-400/90 px-3 py-4">{pdfState.error}</p>
                      )}
                      {pdfState.status === 'done' && pdfItems.length === 0 && (
                        <p className="text-sm text-wealth-muted px-3 py-4">
                          보유 종목 중 미국 상장된 주식만 제공합니다.
                        </p>
                      )}
                      {pdfState.status === 'done' && pdfItems.length > 0 && (
                        <div className="w-fit max-w-full overflow-x-auto">
                          <table className={isOverseasEtf ? pdfPortfolioTableClassOverseas : pdfPortfolioTableClass}>
                            <thead>
                              <tr className="border-b border-gray-700/60 text-left bg-wealth-card/30">
                                <th className="py-2 px-3 font-medium text-wealth-muted">
                                  티커
                                </th>
                                <th className="py-2 px-3 font-medium text-wealth-muted">
                                  종목명
                                </th>
                                {isOverseasEtf && (
                                  <th className="py-2 px-3 font-medium text-wealth-muted whitespace-nowrap">
                                    업종명
                                  </th>
                                )}
                                <th className="py-2 px-3 font-medium text-right whitespace-nowrap text-wealth-muted">
                                  종가
                                </th>
                                <th className="py-2 px-3 font-medium text-right whitespace-nowrap text-wealth-muted">
                                  등락률
                                </th>
                                <th className="py-2 px-3 font-medium text-right whitespace-nowrap text-wealth-muted">
                                  거래량
                                </th>
                                <th className="py-2 px-3 font-medium text-right whitespace-nowrap text-wealth-muted">
                                  RSI(18)
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {pdfItems.map((p) => (
                                <tr
                                  key={p.id}
                                  className="border-b border-gray-700/30 text-white"
                                >
                                  <td className="py-1.5 px-3 font-mono text-wealth-gold">
                                    {isOverseasEtf ? p.display_ticker : (p.display_ticker ?? p.pdf_ticker)}
                                  </td>
                                  <td
                                    className="py-1.5 px-3 text-wealth-muted min-w-[12rem] truncate"
                                    title={p.stock_name}
                                  >
                                    {p.stock_name || '-'}
                                  </td>
                                  {isOverseasEtf && (
                                    <td
                                      className="py-1.5 px-3 text-wealth-muted min-w-[8rem] max-w-[10rem] truncate"
                                      title={p.stock_industry_name}
                                    >
                                      {p.stock_industry_name || '-'}
                                    </td>
                                  )}
                                  <td
                                    className="py-1.5 px-3 text-right tabular-nums text-wealth-muted whitespace-nowrap"
                                  >
                                    {isOverseasEtf
                                      ? formatTechDecimal(p.stock_latest_close, 2)
                                      : formatIntKO(p.stock_latest_close)}
                                  </td>
                                  <td
                                    className={`py-1.5 px-3 text-right tabular-nums whitespace-nowrap ${fluctuationRateColor(p.stock_fluctuation_rate)}`}
                                  >
                                    {formatFluctuationRate(p.stock_fluctuation_rate)}
                                  </td>
                                  <td className="py-1.5 px-3 text-right tabular-nums text-wealth-muted whitespace-nowrap">
                                    {formatIntKO(p.stock_latest_volume)}
                                  </td>
                                  <td className="py-1.5 px-3 text-right tabular-nums text-wealth-muted whitespace-nowrap">
                                    {formatTechDecimal(p.stock_rsi18, 2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })()}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
