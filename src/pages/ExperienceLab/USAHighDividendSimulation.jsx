import React, { useState, useEffect } from 'react';
import { getApiUrl, API_ENDPOINTS } from '../../utils/api';

const API_BASE_URL = getApiUrl(API_ENDPOINTS.USA_ETFS);
const CHART_API_BASE_URL = getApiUrl(API_ENDPOINTS.USA_ETFS_DAILY_CHART);
const DIVIDEND_API_BASE_URL = getApiUrl(API_ENDPOINTS.USA_ETFS_DIVIDEND);
const EXCHANGE_API_BASE_URL = getApiUrl(API_ENDPOINTS.USD_KRW_EXCHANGE);
const MASTER_API_BASE_URL = getApiUrl(API_ENDPOINTS.COMMON_CODE_MASTERS);
const DETAIL_API_BASE_URL = getApiUrl(API_ENDPOINTS.COMMON_CODE_DETAILS);

function USAHighDividendSimulation() {
  const [etfOptions, setEtfOptions] = useState([]);
  const [selectedEtf, setSelectedEtf] = useState(null);
  const [periodOptions, setPeriodOptions] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [purchaseAmount, setPurchaseAmount] = useState(20000000); // 기본 20,000,000원
  const [purchasePrice, setPurchasePrice] = useState(null); // 매입단가 (USD)
  const [currentPrice, setCurrentPrice] = useState(null); // 현재가 (USD)
  const [quantity, setQuantity] = useState(0); // 수량
  const [evaluationAmount, setEvaluationAmount] = useState(0); // 평가금액 (USD)
  const [unrealizedProfit, setUnrealizedProfit] = useState(0); // 미실현손익 (USD)
  const [dividendData, setDividendData] = useState([]); // 배당입금내역
  const [dividendIncome, setDividendIncome] = useState({
    beforeTax: 0,    // 세전 배당 수익 (USD)
    afterTax: 0      // 세후 배당 수익 (USD, 15% 세금 제외)
  });
  const [currentExchangeRate, setCurrentExchangeRate] = useState(null); // 현재 환율
  const [purchaseExchangeRate, setPurchaseExchangeRate] = useState(null); // 매입시 환율
  const [dividendExchangeRates, setDividendExchangeRates] = useState({}); // 배당일별 환율
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ETF 목록 로드 (모든 USA ETF - 필터링은 나중에 추가 가능)
  useEffect(() => {
    loadEtfOptions();
  }, []);

  // 기간 옵션 로드 (dividend_period 공통코드)
  useEffect(() => {
    loadPeriodOptions();
  }, []);

  // 선택된 ETF나 기간이 변경되면 매입단가 조회
  useEffect(() => {
    if (selectedEtf && selectedPeriod) {
      loadPurchasePrice();
      loadDividendData();
    }
  }, [selectedEtf, selectedPeriod]);

  // 선택된 ETF가 변경되면 현재가 조회
  useEffect(() => {
    if (selectedEtf) {
      loadCurrentPrice();
    }
  }, [selectedEtf]);

  // 매입금액, 매입단가, 현재가, 매입시환율, selectedEtf가 변경되면 계산
  useEffect(() => {
    calculateValues();
  }, [purchaseAmount, purchasePrice, currentPrice, purchaseExchangeRate, selectedEtf]);

  // 배당 데이터나 수량이 변경되면 배당수익 계산
  useEffect(() => {
    calculateDividendIncome();
  }, [dividendData, quantity]);

  // 현재 환율 로드
  useEffect(() => {
    loadCurrentExchangeRate();
  }, []);

  const loadEtfOptions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}?etf_type=high_dividend`);
      if (response.ok) {
        const data = await response.json();
        setEtfOptions(data);
      } else {
        setError('ETF 목록을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('ETF 목록을 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPeriodOptions = async () => {
    try {
      const masterResponse = await fetch(MASTER_API_BASE_URL);
      if (masterResponse.ok) {
        const masters = await masterResponse.json();
        const periodMaster = masters.find(m => 
          m.code === 'DIVIDEND_PERIOD' || 
          m.code === 'dividend_period' ||
          (m.code_name?.toLowerCase().includes('dividend') && m.code_name?.toLowerCase().includes('period')) ||
          (m.code_name?.toLowerCase().includes('배당') && m.code_name?.toLowerCase().includes('기간'))
        );
        
        if (periodMaster) {
          const detailResponse = await fetch(`${DETAIL_API_BASE_URL}?master_id=${periodMaster.id}`);
          if (detailResponse.ok) {
            const details = await detailResponse.json();
            setPeriodOptions(details);
            const defaultPeriod = details.find(d => d.code === 'one_year');
            if (defaultPeriod) {
              setSelectedPeriod(defaultPeriod);
            }
          }
        }
      }
    } catch (err) {
      console.error('기간 옵션 로드 실패:', err);
    }
  };

  const loadCurrentExchangeRate = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${EXCHANGE_API_BASE_URL}/date/${today}/nearest`);
      if (response.ok) {
        const data = await response.json();
        setCurrentExchangeRate(parseFloat(data.exchange_rate));
      }
    } catch (err) {
      console.error('현재 환율 로드 실패:', err);
    }
  };

  const loadPurchasePrice = async () => {
    if (!selectedEtf || !selectedPeriod) return;

    try {
      setLoading(true);
      
      const periodCode = (selectedPeriod.code || '').toLowerCase();
      const periodName = (selectedPeriod.detail_code_name || '').toLowerCase();
      let monthsAgo = 12;
      
      if (periodCode === 'one_year' || periodCode === '1y' || periodCode === '1_year' || 
          periodName.includes('1y') || periodName.includes('1년') || periodName.includes('one')) {
        monthsAgo = 12;
      } else if (periodCode === 'six_month' || periodCode === '6m' || periodCode === '6_month' ||
                 periodName.includes('6m') || periodName.includes('6개월') || periodName.includes('six')) {
        monthsAgo = 6;
      } else if (periodCode === 'three_month' || periodCode === '3m' || periodCode === '3_month' ||
                 periodName.includes('3m') || periodName.includes('3개월') || periodName.includes('three')) {
        monthsAgo = 3;
      }
      
      const url = `${CHART_API_BASE_URL}/etf/${selectedEtf.id}/period?months_ago=${monthsAgo}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const chartData = await response.json();
        if (chartData && chartData.close) {
          setPurchasePrice(parseFloat(chartData.close));
          
          // 매입 시점의 환율 조회
          const purchaseDate = chartData.date;
          const exchangeResponse = await fetch(`${EXCHANGE_API_BASE_URL}/date/${purchaseDate}/nearest`);
          if (exchangeResponse.ok) {
            const exchangeData = await exchangeResponse.json();
            setPurchaseExchangeRate(parseFloat(exchangeData.exchange_rate));
          }
        } else {
          setPurchasePrice(null);
        }
      } else if (response.status === 404) {
        setPurchasePrice(null);
      }
    } catch (err) {
      console.error('매입단가 로드 실패:', err);
      setPurchasePrice(null);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentPrice = async () => {
    if (!selectedEtf) return;

    try {
      setLoading(true);
      const response = await fetch(`${CHART_API_BASE_URL}/etf/${selectedEtf.id}/latest`);
      if (response.ok) {
        const chartData = await response.json();
        if (chartData && chartData.close) {
          setCurrentPrice(parseFloat(chartData.close));
        } else {
          setCurrentPrice(null);
        }
      }
    } catch (err) {
      console.error('현재가 로드 실패:', err);
      setCurrentPrice(null);
    } finally {
      setLoading(false);
    }
  };

  const loadDividendData = async () => {
    if (!selectedEtf || !selectedPeriod) return;

    try {
      setLoading(true);
      
      const periodCode = (selectedPeriod.code || '').toLowerCase();
      const periodName = (selectedPeriod.detail_code_name || '').toLowerCase();
      let monthsAgo = 12;
      
      if (periodCode === 'one_year' || periodCode === '1y' || periodCode === '1_year' || 
          periodName.includes('1y') || periodName.includes('1년') || periodName.includes('one')) {
        monthsAgo = 12;
      } else if (periodCode === 'six_month' || periodCode === '6m' || periodCode === '6_month' ||
                 periodName.includes('6m') || periodName.includes('6개월') || periodName.includes('six')) {
        monthsAgo = 6;
      } else if (periodCode === 'three_month' || periodCode === '3m' || periodCode === '3_month' ||
                 periodName.includes('3m') || periodName.includes('3개월') || periodName.includes('three')) {
        monthsAgo = 3;
      }
      
      const url = `${DIVIDEND_API_BASE_URL}/etf/${selectedEtf.id}/period?months_ago=${monthsAgo}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        const sortedData = [...data].sort((a, b) => {
          const dateA = new Date(a.record_date).getTime();
          const dateB = new Date(b.record_date).getTime();
          return dateB - dateA;
        });
        setDividendData(sortedData);
        
        // 배당일별 환율 로드
        const exchangeRates = {};
        for (const dividend of sortedData) {
          try {
            const exchangeResponse = await fetch(`${EXCHANGE_API_BASE_URL}/date/${dividend.record_date}/nearest`);
            if (exchangeResponse.ok) {
              const exchangeData = await exchangeResponse.json();
              exchangeRates[dividend.record_date] = parseFloat(exchangeData.exchange_rate);
            }
          } catch (err) {
            console.error(`환율 로드 실패 (${dividend.record_date}):`, err);
          }
        }
        setDividendExchangeRates(exchangeRates);
      } else if (response.status === 404) {
        setDividendData([]);
      }
    } catch (err) {
      console.error('배당 데이터 로드 실패:', err);
      setDividendData([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateDividendIncome = () => {
    if (!dividendData || dividendData.length === 0 || quantity === 0) {
      setDividendIncome({ beforeTax: 0, afterTax: 0 });
      return;
    }

    // 세전 배당 수익 계산
    const totalDividendBeforeTax = dividendData.reduce((sum, dividend) => {
      return sum + (parseFloat(dividend.dividend_amt) * quantity);
    }, 0);

    // 세후 배당 수익 계산 (미국 배당소득세 15% 제외)
    const taxAmount = totalDividendBeforeTax * 0.15;
    const totalDividendAfterTax = totalDividendBeforeTax - taxAmount;

    setDividendIncome({
      beforeTax: totalDividendBeforeTax,
      afterTax: totalDividendAfterTax
    });
  };

  const calculateValues = () => {
    let calculatedQuantity = 0;
    // 매입금액(KRW) / (매입단가(USD) * 당시환율) = 수량 (매수시 소수점 이하 올림)
    if (purchasePrice && purchasePrice > 0 && purchaseExchangeRate && purchaseExchangeRate > 0) {
      const purchasePriceInKRW = purchasePrice * purchaseExchangeRate;
      calculatedQuantity = Math.ceil(purchaseAmount / purchasePriceInKRW);
      setQuantity(calculatedQuantity);
    } else {
      setQuantity(0);
    }

    if (calculatedQuantity > 0 && currentPrice) {
      // 평가금액 = 수량 * 현재가(USD) (소수점 이하 절사)
      const calculatedEvaluation = Math.floor(calculatedQuantity * currentPrice);
      setEvaluationAmount(calculatedEvaluation);
      
      if (purchasePrice && purchaseExchangeRate && purchaseExchangeRate > 0) {
        // 미실현손익 = 평가금액(USD) - 매입금액(USD)
        // 매입금액(USD) = 매입금액(KRW) / 당시환율 (매도시 소수점 이하 내림)
        const purchaseAmountInUSD = Math.floor(purchaseAmount / purchaseExchangeRate);
        const calculatedProfit = calculatedEvaluation - purchaseAmountInUSD;
        setUnrealizedProfit(calculatedProfit);
      } else {
        setUnrealizedProfit(0);
      }
    } else {
      setEvaluationAmount(0);
      setUnrealizedProfit(0);
    }
  };

  const formatUSD = (value) => {
    if (value === null || value === undefined) return '$0.00';
    return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDividendUSD = (value) => {
    if (value === null || value === undefined) return '$0.000';
    return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
  };

  const formatKRW = (value) => {
    if (value === null || value === undefined) return '0원';
    // 원화는 소수점 표시하지 않음
    return `${Math.floor(Number(value)).toLocaleString('ko-KR')}원`;
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined) return '0';
    return Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const convertUSDToKRW = (usd, exchangeRate) => {
    if (!exchangeRate) return null;
    return usd * exchangeRate;
  };

  return (
    <div className="min-h-screen bg-wealth-dark pb-20">
      <div className="max-w-[95%] mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* 헤더 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-wealth-gold to-yellow-200 mb-2 whitespace-nowrap">
              미국 고배당 ETF 시뮬레이션
            </h1>
            <p className="text-wealth-muted text-sm">
              미국 고배당 ETF 투자 시뮬레이션을 통해 예상 수익을 확인하세요.
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
                  {purchasePrice ? formatUSD(purchasePrice) : '-'}
                </div>
                {purchasePrice && purchaseExchangeRate && (
                  <div className="text-xs text-wealth-muted mt-1">
                    {formatKRW(purchasePrice * purchaseExchangeRate)}
                  </div>
                )}
              </div>

              {/* 수량 */}
              <div className="bg-wealth-card/30 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
                <div className="text-sm text-wealth-muted mb-1">수량</div>
                <div className="text-2xl font-bold text-wealth-text">
                  {quantity.toLocaleString('ko-KR')}주
                </div>
              </div>

              {/* 현재가 */}
              <div className="bg-wealth-card/30 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
                <div className="text-sm text-wealth-muted mb-1">현재가</div>
                <div className="text-2xl font-bold text-wealth-text">
                  {currentPrice ? formatUSD(currentPrice) : '-'}
                </div>
                {currentPrice && currentExchangeRate && (
                  <div className="text-xs text-wealth-muted mt-1">
                    {formatKRW(currentPrice * currentExchangeRate)}
                  </div>
                )}
              </div>

              {/* 평가금액 */}
              <div className="bg-wealth-card/30 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
                <div className="text-sm text-wealth-muted mb-1">평가금액</div>
                <div className="text-2xl font-bold text-wealth-text">
                  {formatUSD(evaluationAmount)}
                </div>
                {currentExchangeRate && (
                  <div className="text-xs text-wealth-muted mt-1">
                    {formatKRW(evaluationAmount * currentExchangeRate)}
                  </div>
                )}
              </div>

              {/* 미실현손익 */}
              <div className={`bg-wealth-card/30 backdrop-blur-sm rounded-lg border p-4 ${unrealizedProfit >= 0 ? 'border-green-500/50' : 'border-red-500/50'}`}>
                <div className="text-sm text-wealth-muted mb-1">미실현손익</div>
                <div className={`text-2xl font-bold ${unrealizedProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {unrealizedProfit >= 0 ? '+' : ''}{formatUSD(unrealizedProfit)}
                </div>
                {currentExchangeRate && (
                  <div className={`text-xs mt-1 ${unrealizedProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {unrealizedProfit >= 0 ? '+' : ''}{formatKRW(unrealizedProfit * currentExchangeRate)}
                  </div>
                )}
                {unrealizedProfit !== 0 && purchasePrice > 0 && quantity > 0 && (
                  <div className={`text-xs mt-1 ${unrealizedProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {((unrealizedProfit / (purchasePrice * quantity)) * 100).toFixed(2)}%
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 배당수익 섹션 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-6 text-wealth-text">배당수익</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* 세전 배당 수익 */}
              <div className="bg-wealth-card/30 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
                <div className="text-sm text-wealth-muted mb-1">세전 배당 수익</div>
                <div className="text-2xl font-bold text-wealth-text">
                  {formatUSD(dividendIncome.beforeTax)}
                </div>
                {currentExchangeRate && (
                  <div className="text-xs text-wealth-muted mt-1">
                    {formatKRW(dividendIncome.beforeTax * currentExchangeRate)}
                  </div>
                )}
              </div>

              {/* 세후 배당 수익 */}
              <div className="bg-wealth-card/30 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
                <div className="text-sm text-wealth-muted mb-1">세후 배당 수익</div>
                <div className="text-xs text-wealth-muted mb-2">(배당소득세 15% 제외)</div>
                <div className="text-2xl font-bold text-wealth-text">
                  {formatUSD(dividendIncome.afterTax)}
                </div>
                {currentExchangeRate && (
                  <div className="text-xs text-wealth-muted mt-1">
                    {formatKRW(dividendIncome.afterTax * currentExchangeRate)}
                  </div>
                )}
              </div>
            </div>

            {/* 배당입금내역 테이블 */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4 text-wealth-text">배당입금내역</h3>
              {dividendData.length === 0 ? (
                <div className="text-center py-8 text-wealth-muted">
                  배당 데이터가 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2 px-2 text-wealth-muted font-medium whitespace-nowrap text-sm">지급기준일</th>
                        <th className="text-right py-2 px-2 text-wealth-muted font-medium whitespace-nowrap text-sm">배당금액(USD)</th>
                        <th className="text-right py-2 px-2 text-wealth-muted font-medium whitespace-nowrap text-sm">배당금액({quantity}주, USD)</th>
                        <th className="text-right py-2 px-2 text-wealth-muted font-medium whitespace-nowrap text-sm">배당금액({quantity}주, KRW)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dividendData.map((dividend, index) => {
                        const dividendAmount = parseFloat(dividend.dividend_amt);
                        const totalDividend = dividendAmount * quantity;
                        const exchangeRate = dividendExchangeRates[dividend.record_date] || currentExchangeRate;
                        const totalDividendKRW = exchangeRate ? totalDividend * exchangeRate : null;
                        
                        return (
                          <tr key={dividend.id || index} className="border-b border-gray-700/50 hover:bg-gray-800/30">
                            <td className="py-2 px-2 text-wealth-text whitespace-nowrap text-sm">
                              {new Date(dividend.record_date).toLocaleDateString('ko-KR')}
                            </td>
                            <td className="py-2 px-2 text-wealth-text text-right whitespace-nowrap text-sm">
                              {formatDividendUSD(dividendAmount)}
                            </td>
                            <td className="py-2 px-2 text-wealth-text text-right font-semibold whitespace-nowrap text-sm">
                              {formatDividendUSD(totalDividend)}
                            </td>
                            <td className="py-2 px-2 text-wealth-text text-right font-semibold whitespace-nowrap text-sm">
                              {totalDividendKRW ? formatKRW(totalDividendKRW) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-600 bg-wealth-card/30">
                        <td colSpan="2" className="py-2 px-2 text-wealth-text font-semibold text-right whitespace-nowrap text-sm">
                          합계
                        </td>
                        <td className="py-2 px-2 text-wealth-text text-right font-bold whitespace-nowrap text-sm">
                          {formatDividendUSD(dividendIncome.beforeTax)}
                        </td>
                        <td className="py-2 px-2 text-wealth-text text-right font-bold whitespace-nowrap text-sm">
                          {currentExchangeRate ? formatKRW(dividendIncome.beforeTax * currentExchangeRate) : '-'}
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
    </div>
  );
}

export default USAHighDividendSimulation;

