import React, { useState, useEffect } from 'react';
import { getStocksRestApiUrl, API_ENDPOINTS } from '../../utils/api';

// backend-fastapi가 아닌 Stocks RestAPI (VITE_STOCKS_REST_API_URL / 기본 :8080)
const API_BASE_URL = getStocksRestApiUrl(API_ENDPOINTS.DOMESTIC_ETFS);
const CHART_API_BASE_URL = getStocksRestApiUrl(API_ENDPOINTS.DOMESTIC_ETFS_DAILY_CHART);
const DIVIDEND_API_BASE_URL = getStocksRestApiUrl(API_ENDPOINTS.DOMESTIC_ETFS_DIVIDEND);
const MASTER_API_BASE_URL = getStocksRestApiUrl(API_ENDPOINTS.COMMON_CODE_MASTERS);
const DETAIL_API_BASE_URL = getStocksRestApiUrl(API_ENDPOINTS.COMMON_CODE_DETAILS);

/** React 18 Strict Mode(dev) 이중 마운트·동시 오픈 탭 대비: 초기 부트스트랩 네트워크 1회만 */
let highDividendBootstrapCache = null;
let highDividendBootstrapPromise = null;

async function fetchHighDividendBootstrap() {
  if (highDividendBootstrapCache) {
    return highDividendBootstrapCache;
  }
  if (highDividendBootstrapPromise) {
    return highDividendBootstrapPromise;
  }
  highDividendBootstrapPromise = (async () => {
    const [etfRes, masterRes] = await Promise.all([
      fetch(`${API_BASE_URL}?etf_tax_type=F`),
      fetch(MASTER_API_BASE_URL),
    ]);

    if (!etfRes.ok) {
      highDividendBootstrapPromise = null;
      const errText = await etfRes.text().catch(() => '');
      throw new Error(errText || `ETF 목록 ${etfRes.status}`);
    }
    const etfs = await etfRes.json();
    let periodDetails = [];
    let defaultPeriod = null;

    if (masterRes.ok) {
      const masters = await masterRes.json();
      const periodMaster = masters.find(
        (m) =>
          m.code === 'dividend_period'
      );
      if (periodMaster) {
        const detailRes = await fetch(
          `${DETAIL_API_BASE_URL}?master_id=${periodMaster.id}`
        );
        if (detailRes.ok) {
          periodDetails = await detailRes.json();
          defaultPeriod =
            periodDetails.find((d) => d.detail_code === 'one_year') ||
            null;
        }
      }
    }

    const payload = { etfs, periodDetails, defaultPeriod };
    highDividendBootstrapCache = payload;
    highDividendBootstrapPromise = null;
    return payload;
  })().catch((err) => {
    highDividendBootstrapPromise = null;
    throw err;
  });

  return highDividendBootstrapPromise;
}

/** RestAPI domestic_etfs_dividend: payment_date >= 오늘 - months_ago * 30 일 (30일 근사) */
function cutoffDateForMonthsAgo(monthsAgo) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - monthsAgo * 30);
  return d;
}

function startOfDayFromIso(iso) {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d;
}

function filterDividendsByMonthsAgo(dividendsRaw, monthsAgo) {
  const cutoff = cutoffDateForMonthsAgo(monthsAgo);
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

/** UI 기간 → API months_ago (차트 캐시 키와 동일) */
function monthsAgoFromPeriodDetail(selectedPeriod) {
  if (!selectedPeriod) return 12;
  const periodCode = String(
    selectedPeriod.code || selectedPeriod.detail_code || ''
  ).toLowerCase();
  if (periodCode === 'six_month') return 6;
  if (periodCode === 'three_month') return 3;
  const n = String(selectedPeriod.detail_code_name || '').toLowerCase();
  if (n.includes('6개월') || n.includes('6개')) return 6;
  if (n.includes('3개월') || n.includes('3개')) return 3;
  return 12;
}

function DomesticHighDividendSimulation() {
  const [etfOptions, setEtfOptions] = useState([]);
  const [selectedEtf, setSelectedEtf] = useState(null);
  const [periodOptions, setPeriodOptions] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [purchaseAmount, setPurchaseAmount] = useState(20000000); // 기본 20,000,000원
  const [purchasePrice, setPurchasePrice] = useState(null); // 매입단가
  const [currentPrice, setCurrentPrice] = useState(null); // 현재가
  const [quantity, setQuantity] = useState(0); // 수량
  const [evaluationAmount, setEvaluationAmount] = useState(0); // 평가금액
  const [unrealizedProfit, setUnrealizedProfit] = useState(0); // 미실현손익
  const [dividendData, setDividendData] = useState([]); // 배당입금내역
  /** 동일 종목: 1년 배당 원본 + 기간별 매입단가(12·6·3개월) — 기간 변경 시 API 재호출 없음 */
  const [etfDataCache, setEtfDataCache] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ETF + 기간 마스터/상세 한 번에 로드 (Strict Mode 중복 호출 시에도 네트워크 1회)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { etfs, periodDetails, defaultPeriod } =
          await fetchHighDividendBootstrap();
        if (cancelled) return;
        setEtfOptions(etfs);
        setPeriodOptions(periodDetails);
        if (defaultPeriod) {
          setSelectedPeriod(defaultPeriod);
        }
      } catch (err) {
        if (!cancelled) {
          setError('초기 데이터를 불러오는데 실패했습니다.');
          console.error(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 종목 변경 시에만 1년 배당 + 12/6/3개월 매입단가(종가) 일괄 조회 후 캐시
  useEffect(() => {
    if (!selectedEtf) {
      setEtfDataCache(null);
      setPurchasePrice(null);
      setDividendData([]);
      return;
    }

    let cancelled = false;
    const etfId = selectedEtf.id;

    setEtfDataCache(null);
    setPurchasePrice(null);
    setDividendData([]);

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const base = CHART_API_BASE_URL;
        const divUrl = `${DIVIDEND_API_BASE_URL}/etf/${etfId}/period?months_ago=12`;

        const [res12, res6, res3, divRes] = await Promise.all([
          fetch(`${base}/etf/${etfId}/period?months_ago=12`),
          fetch(`${base}/etf/${etfId}/period?months_ago=6`),
          fetch(`${base}/etf/${etfId}/period?months_ago=3`),
          fetch(divUrl),
        ]);

        const parseClose = async (res) => {
          if (res.status === 404) return null;
          if (!res.ok) return null;
          const data = await res.json();
          return data?.close != null ? Number(data.close) : null;
        };

        const [close12, close6, close3] = await Promise.all([
          parseClose(res12),
          parseClose(res6),
          parseClose(res3),
        ]);

        let dividendsRaw = [];
        if (divRes.ok) {
          const data = await divRes.json();
          dividendsRaw = Array.isArray(data) ? data : [];
        } else if (divRes.status !== 404) {
          throw new Error('배당 조회 실패');
        }

        if (cancelled) return;

        setEtfDataCache({
          etfId,
          purchaseCloseByMonths: { 12: close12, 6: close6, 3: close3 },
          dividendsRaw,
        });
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError('종목 시세·배당 데이터를 불러오는데 실패했습니다.');
          setEtfDataCache(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedEtf]);

  // 기간만 바뀌면 캐시에서 매입단가·배당 목록 추출 (DB/ API 재조회 없음)
  useEffect(() => {
    if (!selectedEtf || !selectedPeriod) return;
    if (!etfDataCache || etfDataCache.etfId !== selectedEtf.id) return;

    const m = monthsAgoFromPeriodDetail(selectedPeriod);
    const key = m === 6 || m === 3 ? m : 12;
    setPurchasePrice(etfDataCache.purchaseCloseByMonths[key] ?? null);

    const filtered = filterDividendsByMonthsAgo(etfDataCache.dividendsRaw, m);
    setDividendData(sortDividendsByRecordDateDesc(filtered));
  }, [selectedEtf, selectedPeriod, etfDataCache]);

  // 선택된 ETF가 변경되면 현재가 조회
  useEffect(() => {
    if (selectedEtf) {
      loadCurrentPrice();
    }
  }, [selectedEtf]);

  // 매입금액, 매입단가, 현재가, selectedEtf가 변경되면 계산
  useEffect(() => {
    calculateValues();
  }, [purchaseAmount, purchasePrice, currentPrice]);

  const loadCurrentPrice = async () => {
    if (!selectedEtf) return;

    try {
      setLoading(true);
      const response = await fetch(`${CHART_API_BASE_URL}/etf/${selectedEtf.id}/latest`);
      if (response.ok) {
        const chartData = await response.json();
        if (chartData && chartData.close) {
          setCurrentPrice(chartData.close);
        } else {
          setCurrentPrice(null);
        }
      } else {
        setError('현재가를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('현재가 로드 실패:', err);
      setCurrentPrice(null);
    } finally {
      setLoading(false);
    }
  };

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
        const calculatedProfit = calculatedEvaluation - (purchasePrice * calculatedQuantity);
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

          {/* 입력 섹션 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-6 text-wealth-text">투자 정보 입력</h2>
            
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400 mb-6">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 종목 선택 */}
              <div>
                <label className="block text-sm font-medium text-wealth-muted mb-2">
                  종목
                </label>
                <select
                  value={selectedEtf?.id || ''}
                  onChange={(e) => {
                    const etf = etfOptions.find(etf => etf.id === parseInt(e.target.value));
                    setSelectedEtf(etf);
                  }}
                  className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-wealth-gold/50 focus:border-transparent transition-all"
                  disabled={loading}
                >
                  <option value="">종목을 선택하세요</option>
                  {etfOptions.map(etf => (
                    <option key={etf.id} value={etf.id}>
                      {etf.ticker} - {etf.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 기간 선택 */}
              <div>
                <label className="block text-sm font-medium text-wealth-muted mb-2">
                  기간
                </label>
                <select
                  value={selectedPeriod?.id || ''}
                  onChange={(e) => {
                    const period = periodOptions.find(p => p.id === parseInt(e.target.value));
                    setSelectedPeriod(period);
                  }}
                  className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-wealth-gold/50 focus:border-transparent transition-all"
                  disabled={loading}
                >
                  <option value="">기간을 선택하세요</option>
                  {periodOptions.map(period => (
                    <option key={period.id} value={period.id}>
                      {period.detail_code_name || period.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* 매입금액 */}
              <div>
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
            <h2 className="text-xl font-semibold mb-6 text-wealth-text">잔고 조회</h2>
            
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
            </div>
          </div>

          {/* 배당입금내역 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-6 text-wealth-text">배당입금내역</h2>
              {dividendData.length === 0 ? (
                <div className="text-center py-8 text-wealth-muted">
                  배당 데이터가 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[1040px]">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-wealth-muted font-medium whitespace-nowrap">지급기준일</th>
                        <th className="text-left py-3 px-4 text-wealth-muted font-medium whitespace-nowrap">실지급일</th>
                        <th className="text-right py-3 px-4 text-wealth-muted font-medium whitespace-nowrap">배당금액(원)</th>
                        <th className="text-right py-3 px-4 text-wealth-muted font-medium whitespace-nowrap">주당과세표준액(원)</th>
                        <th className="text-right py-3 px-4 text-wealth-muted font-medium whitespace-nowrap">배당금액({quantity}주)</th>
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
                        <td colSpan="4" className="py-3 px-4 text-wealth-text font-semibold text-right">
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
        </div>
      </div>
    </div>
  );
}

export default DomesticHighDividendSimulation;

