import React, { useState, useEffect, useMemo } from 'react';
import { getStocksRestApiUrl, API_ENDPOINTS } from '../../utils/api';

// backend-fastapi가 아닌 Stocks RestAPI (VITE_STOCKS_REST_API_URL / 기본 :8080)
const API_BASE_URL = getStocksRestApiUrl(API_ENDPOINTS.DOMESTIC_ETFS);
const CHART_API_BASE_URL = getStocksRestApiUrl(API_ENDPOINTS.DOMESTIC_ETFS_DAILY_CHART);
const DIVIDEND_API_BASE_URL = getStocksRestApiUrl(API_ENDPOINTS.DOMESTIC_ETFS_DIVIDEND);

/** 시뮬레이션 기간 (일 단위) */
const PERIOD_OPTIONS = [
  { daysAgo: 365, label: '1Y' },
  { daysAgo: 183, label: '6M' },
  { daysAgo: 61, label: '3M' },
];

/** 초기 fetch start_date — 1Y(365일) 구간 */
const FETCH_DAYS_AGO = PERIOD_OPTIONS[0].daysAgo;

/** React 18 Strict Mode(dev) 이중 마운트·동시 오픈 탭 대비: 초기 부트스트랩 네트워크 1회만 */
let highDividendBootstrapCache = null;
let highDividendBootstrapPromise = null;

async function fetchHighDividendBootstrap() {
  if (highDividendBootstrapCache) {
    return highDividendBootstrapCache;
  }
  highDividendBootstrapCache = null;
  if (highDividendBootstrapPromise) {
    return highDividendBootstrapPromise;
  }
  highDividendBootstrapPromise = (async () => {
    const etfRes = await fetch(
      `${API_BASE_URL}/high-dividend-simulation?etf_type=high_dividend`
    );

    if (!etfRes.ok) {
      highDividendBootstrapPromise = null;
      const errText = await etfRes.text().catch(() => '');
      throw new Error(errText || `ETF 목록 ${etfRes.status}`);
    }
    const data = await etfRes.json();
    const payload = {
      etfs: Array.isArray(data?.etfs) ? data.etfs : [],
      marketClassification: Array.isArray(data?.market_classification)
        ? data.market_classification
        : [],
      referenceDate: data?.date ?? null,
    };
    highDividendBootstrapCache = payload;
    highDividendBootstrapPromise = null;
    return payload;
  })().catch((err) => {
    highDividendBootstrapPromise = null;
    throw err;
  });

  return highDividendBootstrapPromise;
}

function startOfDayFromIso(iso) {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d;
}

function referenceBaseDate(referenceDateIso) {
  if (referenceDateIso) {
    return startOfDayFromIso(referenceDateIso);
  }
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 기준일(referenceDate)에서 daysAgo일 전 */
function cutoffDateForDaysAgo(daysAgo, referenceDateIso) {
  const d = new Date(referenceBaseDate(referenceDateIso));
  d.setDate(d.getDate() - daysAgo);
  return d;
}

/** bootstrap 기준일(referenceDate)에서 FETCH_DAYS_AGO일 전 — API start_date (YYYY-MM-DD) */
function computeStartDateFromReference(referenceDateIso) {
  const start = new Date(referenceBaseDate(referenceDateIso));
  start.setDate(start.getDate() - FETCH_DAYS_AGO);
  return start.toISOString().slice(0, 10);
}

function filterDividendsByDaysAgo(dividendsRaw, daysAgo, referenceDateIso) {
  const cutoff = cutoffDateForDaysAgo(daysAgo, referenceDateIso);
  return dividendsRaw.filter(
    (row) => startOfDayFromIso(row.payment_date) >= cutoff
  );
}

function sortDividendsByRecordDateDesc(rows) {
  return [...rows].sort(
    (a, b) =>
      new Date(b.record_date).getTime() - new Date(a.record_date).getTime()
  );
}

/** chart/period 와 동일: 기준일에서 daysAgo일 전 날짜에 가장 가까운 종가 */
function getPurchaseCloseForDaysAgo(chartRows, daysAgo, referenceDateIso) {
  if (!chartRows?.length) return null;

  const target = cutoffDateForDaysAgo(daysAgo, referenceDateIso);
  const windowStart = new Date(target);
  windowStart.setDate(windowStart.getDate() - 30);
  const windowEnd = new Date(target);
  windowEnd.setDate(windowEnd.getDate() + 30);

  const targetMs = target.getTime();
  let closest = null;
  let minDiff = Infinity;

  for (const row of chartRows) {
    const rowDate = startOfDayFromIso(row.date);
    if (rowDate < windowStart || rowDate > windowEnd) continue;
    const diff = Math.abs(rowDate.getTime() - targetMs);
    if (diff < minDiff) {
      minDiff = diff;
      closest = row;
    }
  }

  if (closest?.close == null) return null;
  const close = Number(closest.close);
  return close > 0 ? close : null;
}

/** range 일봉 중 가장 오래된 거래일 종가 (chart/first 대체) */
function getOldestCloseFromChartRows(chartRows) {
  if (!chartRows?.length) return null;
  let oldest = chartRows[0];
  for (const row of chartRows) {
    if (startOfDayFromIso(row.date) < startOfDayFromIso(oldest.date)) {
      oldest = row;
    }
  }
  if (oldest?.close == null) return null;
  const close = Number(oldest.close);
  return close > 0 ? close : null;
}

/** record_date 당일 종가, 없으면 직전 거래일 종가 */
function getCloseOnRecordDate(chartRows, recordDateIso) {
  if (!chartRows?.length || !recordDateIso) return null;
  const target = startOfDayFromIso(recordDateIso).getTime();
  let close = null;
  for (const row of chartRows) {
    const rowDate = startOfDayFromIso(row.date).getTime();
    if (rowDate > target) break;
    if (row.close != null) {
      close = Number(row.close);
    }
  }
  return close != null && close > 0 ? close : null;
}

/** 주당분배금 ÷ 지급기준일 종가 × 100 */
function formatDividendYieldVsRecordClose(dividendAmtPerShare, recordDate, chartRows) {
  const recordClose = getCloseOnRecordDate(chartRows, recordDate);
  if (recordClose == null || dividendAmtPerShare == null) {
    return '-';
  }
  const pct = (Number(dividendAmtPerShare) / recordClose) * 100;
  if (Number.isNaN(pct)) return '-';
  return `${pct.toFixed(2)}%`;
}

/** 시장분류 표시명 '국내' 우선, 없으면 첫 detail_code */
function resolveDefaultMarketClassCode(marketClassification) {
  const list = marketClassification || [];
  const domestic = list.find(
    (o) => String(o.detail_code_name || '').trim() === '국내'
  );
  return String(domestic?.detail_code ?? list[0]?.detail_code ?? '').trim();
}

function DomesticHighDividendSimulation() {
  const [allEtfOptions, setAllEtfOptions] = useState([]);
  const [marketClassification, setMarketClassification] = useState([]);
  const [referenceDate, setReferenceDate] = useState(null);
  /** kr_etf_market_classification detail_code (기본: 표시명 '국내') */
  const [selectedMarketClassCode, setSelectedMarketClassCode] = useState('');
  const [selectedEtf, setSelectedEtf] = useState(null);
  /** 365=1Y, 183=6M, 61=3M (PERIOD_OPTIONS) */
  const [selectedDaysAgo, setSelectedDaysAgo] = useState(PERIOD_OPTIONS[0].daysAgo);
  const [purchaseAmount, setPurchaseAmount] = useState(20000000); // 기본 20,000,000원
  const [purchasePrice, setPurchasePrice] = useState(null); // 매입단가
  const [currentPrice, setCurrentPrice] = useState(null); // 현재가
  const [quantity, setQuantity] = useState(0); // 수량
  const [evaluationAmount, setEvaluationAmount] = useState(0); // 평가금액
  const [unrealizedProfit, setUnrealizedProfit] = useState(0); // 미실현손익
  const [dividendData, setDividendData] = useState([]); // 배당입금내역
  /** 동일 종목: 1년 배당·일봉 원본 — 기간 변경 시 chartRows로 매입단가 계산, API 재호출 없음 */
  const [etfDataCache, setEtfDataCache] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);

  // ETF + 기간 마스터/상세 한 번에 로드 (Strict Mode 중복 호출 시에도 네트워크 1회)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setInitialLoading(true);
        setError(null);
        const { etfs, marketClassification: mcList, referenceDate: refDate } =
          await fetchHighDividendBootstrap();
        if (cancelled) return;
        setAllEtfOptions(etfs);
        setMarketClassification(mcList);
        setReferenceDate(refDate);
        setSelectedMarketClassCode(resolveDefaultMarketClassCode(mcList));
      } catch (err) {
        if (!cancelled) {
          setError('초기 데이터를 불러오는데 실패했습니다.');
          console.error(err);
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEtfOptions = useMemo(() => {
    if (!selectedMarketClassCode) return [];
    return allEtfOptions.filter(
      (e) =>
        (e.kr_etf_market_classification || '') === selectedMarketClassCode
    );
  }, [allEtfOptions, selectedMarketClassCode]);

  useEffect(() => {
    setSelectedEtf((prev) => {
      if (!prev) return prev;
      const stillValid = filteredEtfOptions.some((e) => e.id === prev.id);
      return stillValid ? prev : null;
    });
  }, [filteredEtfOptions]);

  // 종목 변경 시 1년 배당 + 1년 일봉(range) 일괄 조회 후 캐시
  useEffect(() => {
    if (!selectedEtf) {
      setEtfDataCache(null);
      setPurchasePrice(null);
      setCurrentPrice(null);
      setDividendData([]);
      return;
    }

    let cancelled = false;
    const etfId = selectedEtf.id;

    setEtfDataCache(null);
    setPurchasePrice(null);
    setDividendData([]);
    setCurrentPrice(
      selectedEtf.latest_close != null ? Number(selectedEtf.latest_close) : null
    );

    (async () => {
      setDetailLoading(true);
      setError(null);
      try {
        const startDate = computeStartDateFromReference(referenceDate);
        const [divRes, rangeRes] = await Promise.all([
          fetch(
            `${DIVIDEND_API_BASE_URL}/etf/${etfId}/period?start_date=${startDate}`
          ),
          fetch(
            `${CHART_API_BASE_URL}/etf/${etfId}/range?start_date=${startDate}`
          ),
        ]);

        let dividendsRaw = [];
        if (divRes.ok) {
          const data = await divRes.json();
          dividendsRaw = Array.isArray(data) ? data : [];
        } else if (divRes.status !== 404) {
          throw new Error('배당 조회 실패');
        }

        let chartRows = [];
        if (rangeRes.ok) {
          const data = await rangeRes.json();
          chartRows = Array.isArray(data) ? data : [];
        } else if (rangeRes.status !== 404) {
          throw new Error('일봉 구간 조회 실패');
        }

        if (cancelled) return;

        setEtfDataCache({
          etfId,
          dividendsRaw,
          chartRows,
        });
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError('종목 시세·배당 데이터를 불러오는데 실패했습니다.');
          setEtfDataCache(null);
          setCurrentPrice(null);
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedEtf, referenceDate]);

  // 기간만 바뀌면 캐시에서 매입단가·배당 목록 추출 (DB/ API 재조회 없음)
  useEffect(() => {
    if (!selectedEtf) return;
    if (!etfDataCache || etfDataCache.etfId !== selectedEtf.id) return;

    const periodClose = getPurchaseCloseForDaysAgo(
      etfDataCache.chartRows,
      selectedDaysAgo,
      referenceDate
    );
    setPurchasePrice(
      periodClose != null
        ? periodClose
        : getOldestCloseFromChartRows(etfDataCache.chartRows)
    );

    const filtered = filterDividendsByDaysAgo(
      etfDataCache.dividendsRaw,
      selectedDaysAgo,
      referenceDate
    );
    setDividendData(sortDividendsByRecordDateDesc(filtered));
  }, [selectedEtf, selectedDaysAgo, etfDataCache, referenceDate]);

  // 매입금액, 매입단가, 현재가, selectedEtf가 변경되면 계산
  useEffect(() => {
    calculateValues();
  }, [purchaseAmount, purchasePrice, currentPrice]);

  const calculateValues = () => {
    // 수량 계산: 매입금액 / 매입단가 (절사처리)
    let calculatedQuantity = 0;
    if (purchasePrice && purchasePrice > 0) {
      calculatedQuantity = Math.floor(purchaseAmount / purchasePrice);
      setQuantity(calculatedQuantity);
    } else {
      setQuantity(0);
    }

    // 평가금액 계산: 수량 * 현재가
    if (calculatedQuantity > 0 && currentPrice) {
      const calculatedEvaluation = calculatedQuantity * currentPrice;
      setEvaluationAmount(calculatedEvaluation);

      // 미실현손익 계산: 평가금액 - (매입단가 * 수량)
      if (purchasePrice) {
        const calculatedProfit =
          calculatedEvaluation - purchasePrice * calculatedQuantity;
        setUnrealizedProfit(calculatedProfit);
      } else {
        setUnrealizedProfit(0);
      }
    } else {
      setEvaluationAmount(0);
      setUnrealizedProfit(0);
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '0';
    return Number(value).toLocaleString('ko-KR');
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined) return '0';
    return Number(value).toLocaleString('ko-KR');
  };

  /** 주당분배금 ÷ 매입단가 × 100 */
  const formatDividendYieldVsPurchase = (dividendAmtPerShare) => {
    if (
      purchasePrice == null ||
      purchasePrice <= 0 ||
      dividendAmtPerShare == null
    ) {
      return '-';
    }
    const pct = (Number(dividendAmtPerShare) / Number(purchasePrice)) * 100;
    if (Number.isNaN(pct)) return '-';
    return `${pct.toFixed(2)}%`;
  };

  /** 일반계좌: 행별 과세표준(주당×수량)에 15.4% 적용 후 원 단위 절사 */
  const rowDividendIncomeTax154 = (dividend) =>
    Math.floor((dividend.taxable_amt || 0) * quantity * 0.154);

  const sumRowDividendIncomeTax154 =
    quantity > 0 && dividendData.length > 0
      ? dividendData.reduce(
          (sum, d) => sum + Math.floor((d.taxable_amt || 0) * quantity * 0.154),
          0
        )
      : 0;

  /** 분배금지급내역 표와 동일: 행별 실수령액 합계 */
  const totalNetDividendsReceived =
    quantity > 0 && dividendData.length > 0
      ? dividendData.reduce((sum, d) => {
          const gross = d.dividend_amt * quantity;
          const tax = Math.floor((d.taxable_amt || 0) * quantity * 0.154);
          return sum + (gross - tax);
        }, 0)
      : 0;

  const costBasis =
    purchasePrice > 0 && quantity > 0 ? purchasePrice * quantity : 0;
  const totalReturnWithDividends = unrealizedProfit + totalNetDividendsReceived;
  const totalReturnPctVsCost =
    costBasis > 0 ? (totalReturnWithDividends / costBasis) * 100 : null;

  return (
    <div className="min-h-screen bg-wealth-dark pb-20">
      <div className="max-w-[95%] mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* 헤더 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-wealth-gold to-yellow-200 mb-2 whitespace-nowrap">
              국내 고배당 ETF 시뮬레이션
            </h1>
            <p className="text-wealth-muted text-sm">
              과거 자료를 통해 미래 예상 수익을 확인하세요.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
              {error}
            </div>
          )}

          {initialLoading ? (
            <div className="text-center py-8 text-wealth-muted">로딩 중…</div>
          ) : (
            <>
          {/* 입력 섹션 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-wealth-text">투자 정보 입력</h2>

            <div className="mb-6">
              <p className="text-sm text-wealth-muted mb-2">시장분류</p>
              <div
                className="inline-flex flex-wrap gap-2"
                role="group"
                aria-label="시장분류 필터"
              >
                {marketClassification.map((opt) => {
                  const code = String(opt.detail_code ?? '').trim();
                  const active = selectedMarketClassCode === code;
                  return (
                    <button
                      key={opt.id ?? code}
                      type="button"
                      onClick={() => setSelectedMarketClassCode(code)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-wealth-card/80 border border-blue-500/70 text-blue-300 hover:bg-blue-500/15'
                      }`}
                    >
                      {opt.detail_code_name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              {/* 종목 선택 */}
              <div className="min-w-0">
                <label className="block text-sm font-medium text-wealth-muted mb-2">
                  종목
                </label>
                <select
                  value={selectedEtf?.id || ''}
                  onChange={(e) => {
                    const etf = filteredEtfOptions.find(
                      (row) => row.id === parseInt(e.target.value, 10)
                    );
                    setSelectedEtf(etf);
                  }}
                  className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-wealth-gold/50 focus:border-transparent transition-all disabled:opacity-50"
                  disabled={detailLoading}
                >
                  <option value="">종목을 선택하세요</option>
                  {filteredEtfOptions.map((etf) => (
                    <option key={etf.id} value={etf.id}>
                      {etf.ticker} - {etf.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 기간 선택 */}
              <div className="min-w-0">
                <label className="block text-sm font-medium text-wealth-muted mb-2">
                  기간
                </label>
                <select
                  value={selectedDaysAgo}
                  onChange={(e) => setSelectedDaysAgo(Number(e.target.value))}
                  className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-wealth-gold/50 focus:border-transparent transition-all disabled:opacity-50"
                  disabled={detailLoading}
                >
                  {PERIOD_OPTIONS.map((period) => (
                    <option key={period.daysAgo} value={period.daysAgo}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 매입금액 */}
              <div className="min-w-0">
                <label className="block text-sm font-medium text-wealth-muted mb-2">
                  매입금액
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={purchaseAmount.toLocaleString('ko-KR')}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, '');
                      if (!isNaN(value) && value !== '') {
                        setPurchaseAmount(parseInt(value));
                      } else if (value === '') {
                        setPurchaseAmount(0);
                      }
                    }}
                    className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-wealth-gold/50 focus:border-transparent transition-all text-right"
                    placeholder="20,000,000"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-wealth-muted text-sm pointer-events-none">
                    원
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 결과 섹션 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
              <h2 className="text-xl font-semibold text-wealth-text">잔고 조회</h2>
              {referenceDate ? (
                <span className="text-sm text-wealth-muted tabular-nums">
                  기준일 :{' '}
                  {new Date(referenceDate).toLocaleDateString('ko-KR')}
                </span>
              ) : null}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 매입단가 */}
              <div className="bg-wealth-card/30 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
                <div className="text-sm text-wealth-muted mb-1">매입단가</div>
                <div className="text-2xl font-bold text-wealth-text">
                  {purchasePrice ? `${formatCurrency(purchasePrice)}원` : '-'}
                </div>
              </div>

              {/* 수량 */}
              <div className="bg-wealth-card/30 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
                <div className="text-sm text-wealth-muted mb-1">수량</div>
                <div className="text-2xl font-bold text-wealth-text">
                  {formatNumber(quantity)}주
                </div>
              </div>

              {/* 현재가 */}
              <div className="bg-wealth-card/30 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
                <div className="text-sm text-wealth-muted mb-1">현재가</div>
                <div className="text-2xl font-bold text-wealth-text">
                  {currentPrice ? `${formatCurrency(currentPrice)}원` : '-'}
                </div>
              </div>

              {/* 평가금액 */}
              <div className="bg-wealth-card/30 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
                <div className="text-sm text-wealth-muted mb-1">평가금액</div>
                <div className="text-2xl font-bold text-wealth-text">
                  {formatCurrency(evaluationAmount)}원
                </div>
              </div>

              {/* 미실현손익 */}
              <div className={`bg-wealth-card/30 backdrop-blur-sm rounded-lg border p-4 ${unrealizedProfit >= 0 ? 'border-green-500/50' : 'border-red-500/50'}`}>
                <div className="text-sm text-wealth-muted mb-1">미실현손익</div>
                <div className={`text-2xl font-bold ${unrealizedProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {unrealizedProfit >= 0 ? '+' : ''}{formatCurrency(unrealizedProfit)}원
                </div>
                {unrealizedProfit !== 0 && purchasePrice > 0 && quantity > 0 && (
                  <div className={`text-xs mt-1 ${unrealizedProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {((unrealizedProfit / (purchasePrice * quantity)) * 100).toFixed(2)}%
                  </div>
                )}
              </div>

              {/* 총수익(미실현 + 분배 실수령) 및 총수익률 */}
              <div
                className={`bg-wealth-card/30 backdrop-blur-sm rounded-lg border p-4 ${
                  costBasis <= 0
                    ? 'border-gray-700/50'
                    : totalReturnWithDividends >= 0
                      ? 'border-green-500/50'
                      : 'border-red-500/50'
                }`}
              >
                <div className="text-sm text-wealth-muted mb-1">총수익률(분배금 포함)</div>
                {costBasis > 0 ? (
                  <>
                    <div
                      className={`text-2xl font-bold ${
                        totalReturnWithDividends >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {totalReturnWithDividends >= 0 ? '+' : ''}
                      {formatCurrency(totalReturnWithDividends)}원
                    </div>
                    {totalReturnPctVsCost != null && (
                      <div
                        className={`text-xs mt-1 tabular-nums ${
                          totalReturnWithDividends >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {totalReturnPctVsCost >= 0 ? '+' : ''}
                        {totalReturnPctVsCost.toFixed(2)}%
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-2xl font-bold text-wealth-muted">-</div>
                )}
              </div>
            </div>
          </div>

          {/* 분배금지급내역 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-6 text-wealth-text">분배금지급내역</h2>
              {dividendData.length === 0 ? (
                <div className="text-center py-8 text-wealth-muted">
                   분배금 지급 데이터가 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[1320px]">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-wealth-muted font-medium whitespace-nowrap">지급기준일</th>
                        <th className="text-left py-3 px-4 text-wealth-muted font-medium whitespace-nowrap">실지급일</th>
                        <th className="text-right py-3 px-4 text-wealth-muted font-medium whitespace-nowrap">주당분배금(원)</th>
                        <th className="text-right py-3 px-4 text-wealth-muted font-medium whitespace-nowrap">지급기준일 종가 대비 분배율</th>
                        <th className="text-right py-3 px-4 text-wealth-muted font-medium whitespace-nowrap">매입가 대비 분배율</th>
                        <th className="text-right py-3 px-4 text-wealth-muted font-medium whitespace-nowrap">주당과세표준액(원)</th>
                        <th className="text-right py-3 px-4 text-wealth-muted font-medium whitespace-nowrap">분배금액({quantity}주)</th>
                        <th className="text-right py-3 px-4 text-wealth-muted font-medium whitespace-nowrap">소득세</th>
                        <th className="text-right py-3 px-4 text-wealth-muted font-medium whitespace-nowrap">실수령액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dividendData.map((dividend, index) => {
                        const gross = dividend.dividend_amt * quantity;
                        const incomeTax = rowDividendIncomeTax154(dividend);
                        const netReceived = gross - incomeTax;
                        return (
                        <tr key={dividend.id || index} className="border-b border-gray-700/50 hover:bg-gray-800/30">
                          <td className="py-3 px-4 text-wealth-text whitespace-nowrap">
                            {new Date(dividend.record_date).toLocaleDateString('ko-KR')}
                          </td>
                          <td className="py-3 px-4 text-wealth-text whitespace-nowrap">
                            {new Date(dividend.payment_date).toLocaleDateString('ko-KR')}
                          </td>
                          <td className="py-3 px-4 text-wealth-text text-right whitespace-nowrap">
                            {formatCurrency(dividend.dividend_amt)}
                          </td>
                          <td className="py-3 px-4 text-wealth-text text-right whitespace-nowrap tabular-nums">
                            {formatDividendYieldVsRecordClose(
                              dividend.dividend_amt,
                              dividend.record_date,
                              etfDataCache?.chartRows
                            )}
                          </td>
                          <td className="py-3 px-4 text-wealth-text text-right whitespace-nowrap tabular-nums">
                            {formatDividendYieldVsPurchase(dividend.dividend_amt)}
                          </td>
                          <td className="py-3 px-4 text-wealth-text text-right whitespace-nowrap">
                            {formatCurrency(dividend.taxable_amt || 0)}
                          </td>
                          <td className="py-3 px-4 text-wealth-text text-right font-semibold whitespace-nowrap">
                            {formatCurrency(gross)}
                          </td>
                          <td className="py-3 px-4 text-wealth-text text-right whitespace-nowrap text-amber-200/90">
                            {formatCurrency(incomeTax)}
                          </td>
                          <td className="py-3 px-4 text-wealth-text text-right font-semibold whitespace-nowrap text-emerald-300/90">
                            {formatCurrency(netReceived)}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-600 bg-wealth-card/30">
                        <td colSpan="6" className="py-3 px-4 text-wealth-text font-semibold text-right">
                          합계
                        </td>
                        <td className="py-3 px-4 text-wealth-text text-right font-bold text-lg">
                          {formatCurrency(
                            dividendData.reduce((sum, dividend) => sum + (dividend.dividend_amt * quantity), 0)
                          )}원
                        </td>
                        <td className="py-3 px-4 text-wealth-text text-right font-bold text-lg text-amber-200/90">
                          {formatCurrency(sumRowDividendIncomeTax154)}원
                        </td>
                        <td className="py-3 px-4 text-wealth-text text-right font-bold text-lg text-emerald-300/90">
                          {formatCurrency(
                            dividendData.reduce((sum, dividend) => {
                              const g = dividend.dividend_amt * quantity;
                              return sum + (g - rowDividendIncomeTax154(dividend));
                            }, 0)
                          )}원
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DomesticHighDividendSimulation;

