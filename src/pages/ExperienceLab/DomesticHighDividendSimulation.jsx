import React, { useState, useEffect } from 'react';
import { getApiUrl, API_ENDPOINTS } from '../../utils/api';

const API_BASE_URL = getApiUrl(API_ENDPOINTS.DOMESTIC_ETFS);
const CHART_API_BASE_URL = getApiUrl(API_ENDPOINTS.DOMESTIC_ETFS_DAILY_CHART);
const DIVIDEND_API_BASE_URL = getApiUrl(API_ENDPOINTS.DOMESTIC_ETFS_DIVIDEND);
const MASTER_API_BASE_URL = getApiUrl(API_ENDPOINTS.COMMON_CODE_MASTERS);
const DETAIL_API_BASE_URL = getApiUrl(API_ENDPOINTS.COMMON_CODE_DETAILS);

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
  const [saleProfit, setSaleProfit] = useState(0); // 매도시 손익
  const [dividendData, setDividendData] = useState([]); // 배당입금내역
  const [dividendIncome, setDividendIncome] = useState({
    general: 0,      // 일반계좌 배당수익
    isaGeneral: 0,   // ISA 일반형 배당수익
    isaPeople: 0     // ISA 서민형 배당수익
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ETF 목록 로드 (etf_type이 'high_dividend'인 것만)
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

  // 매입금액, 매입단가, 현재가, selectedEtf가 변경되면 계산
  useEffect(() => {
    calculateValues();
  }, [purchaseAmount, purchasePrice, currentPrice, selectedEtf]);

  // 배당 데이터나 수량이 변경되면 배당수익 계산
  useEffect(() => {
    calculateDividendIncome();
  }, [dividendData, quantity]);

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
      // 먼저 마스터 코드 찾기
      const masterResponse = await fetch(MASTER_API_BASE_URL);
      if (masterResponse.ok) {
        const masters = await masterResponse.json();
        
        // dividend_period 마스터 찾기
        const periodMaster = masters.find(m => 
          m.code === 'DIVIDEND_PERIOD' || 
          m.code === 'dividend_period' ||
          (m.code_name?.toLowerCase().includes('dividend') && m.code_name?.toLowerCase().includes('period')) ||
          (m.code_name?.toLowerCase().includes('배당') && m.code_name?.toLowerCase().includes('기간'))
        );
        
        if (periodMaster) {
          // 상세 코드 조회
          const detailResponse = await fetch(`${DETAIL_API_BASE_URL}?master_id=${periodMaster.id}`);
          if (detailResponse.ok) {
            const details = await detailResponse.json();
            setPeriodOptions(details);
            // 기본값 설정 (1년)
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

  const loadPurchasePrice = async () => {
    if (!selectedEtf || !selectedPeriod) return;

    try {
      setLoading(true);
      
      // 기간 코드 파싱: one_year(12개월), six_month(6개월), three_month(3개월)
      // code 필드와 detail_code_name 필드 모두 확인
      const periodCode = (selectedPeriod.code || '').toLowerCase();
      const periodName = (selectedPeriod.detail_code_name || '').toLowerCase();
      let monthsAgo = 12; // 기본값: 12개월 (1년)
      
      // 1년 체크
      if (periodCode === 'one_year' || periodCode === '1y' || periodCode === '1_year' || 
          periodName.includes('1y') || periodName.includes('1년') || periodName.includes('one')) {
        monthsAgo = 12;
      } 
      // 6개월 체크
      else if (periodCode === 'six_month' || periodCode === '6m' || periodCode === '6_month' ||
               periodName.includes('6m') || periodName.includes('6개월') || periodName.includes('six')) {
        monthsAgo = 6;
      } 
      // 3개월 체크
      else if (periodCode === 'three_month' || periodCode === '3m' || periodCode === '3_month' ||
               periodName.includes('3m') || periodName.includes('3개월') || periodName.includes('three')) {
        monthsAgo = 3;
      }
      
      const url = `${CHART_API_BASE_URL}/etf/${selectedEtf.id}/period?months_ago=${monthsAgo}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const chartData = await response.json();
        if (chartData && chartData.close) {
          setPurchasePrice(chartData.close);
        } else {
          setPurchasePrice(null);
        }
      } else if (response.status === 404) {
        setPurchasePrice(null);
      } else {
        setError('매입단가를 불러오는데 실패했습니다.');
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

  const loadDividendData = async () => {
    if (!selectedEtf || !selectedPeriod) return;

    try {
      setLoading(true);
      
      // 기간 코드 파싱
      const periodCode = (selectedPeriod.code || '').toLowerCase();
      const periodName = (selectedPeriod.detail_code_name || '').toLowerCase();
      let monthsAgo = 12; // 기본값: 12개월 (1년)
      
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
        // 기준일(record_date) 기준 내림차순 정렬
        const sortedData = [...data].sort((a, b) => {
          const dateA = new Date(a.record_date).getTime();
          const dateB = new Date(b.record_date).getTime();
          return dateB - dateA; // 내림차순 (최신순)
        });
        setDividendData(sortedData);
      } else if (response.status === 404) {
        setDividendData([]);
      } else {
        console.error('배당 데이터 로드 실패');
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
      setDividendIncome({ general: 0, isaGeneral: 0, isaPeople: 0 });
      return;
    }

    // 과세표준 총액 계산: 수량 * 각 주당과세표준액의 합
    const totalTaxableAmount = dividendData.reduce((sum, dividend) => {
      return sum + ((dividend.taxable_amt || 0) * quantity);
    }, 0);

    // 배당금 총액 계산: 수량 * 각 배당금액의 합 (표시용)
    const totalDividend = dividendData.reduce((sum, dividend) => {
      return sum + (dividend.dividend_amt * quantity);
    }, 0);

    // 일반계좌: 15.4% 소득세 차감 (과세표준액 기준)
    const taxAmount = Math.floor(totalTaxableAmount * 0.154);
    const generalIncome = totalDividend - taxAmount;

    // ISA 일반형: 200만원까지 비과세, 그 이상은 9.9% 분리과세 (과세표준액 기준)
    let isaGeneralIncome = 0;
    if (totalTaxableAmount <= 2000000) {
      isaGeneralIncome = totalDividend; // 비과세
    } else {
      const taxFreeAmount = 2000000;
      const taxableAmount = totalTaxableAmount - taxFreeAmount;
      const taxAmount = Math.floor(taxableAmount * 0.099);
      isaGeneralIncome = totalDividend - taxAmount;
    }

    // ISA 서민형: 400만원까지 비과세, 그 이상은 9.9% 분리과세 (과세표준액 기준)
    let isaPeopleIncome = 0;
    if (totalTaxableAmount <= 4000000) {
      isaPeopleIncome = totalDividend; // 비과세
    } else {
      const taxFreeAmount = 4000000;
      const taxableAmount = totalTaxableAmount - taxFreeAmount;
      const taxAmount = Math.floor(taxableAmount * 0.099);
      isaPeopleIncome = totalDividend - taxAmount;
    }

    setDividendIncome({
      general: generalIncome,
      isaGeneral: isaGeneralIncome,
      isaPeople: isaPeopleIncome
    });
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
        
        // 매도시 손익 계산
        let calculatedSaleProfit = calculatedProfit;
        
        // etf_tax_type이 "A"인 경우 소득세(보유기간과세) 15.4% 차감
        if (selectedEtf && selectedEtf.etf_tax_type === 'A' && calculatedProfit > 0) {
          const taxAmount = Math.floor(calculatedProfit * 0.154);
          calculatedSaleProfit = calculatedProfit - taxAmount;
        }
        
        setSaleProfit(calculatedSaleProfit);
      } else {
        setUnrealizedProfit(0);
        setSaleProfit(0);
      }
    } else {
      setEvaluationAmount(0);
      setUnrealizedProfit(0);
      setSaleProfit(0);
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
              고배당 ETF 투자 시뮬레이션을 통해 예상 수익을 확인하세요.
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

              {/* 매도시 손익 */}
              <div className={`bg-wealth-card/30 backdrop-blur-sm rounded-lg border p-4 ${saleProfit >= 0 ? 'border-green-500/50' : 'border-red-500/50'}`}>
                <div className="text-sm text-wealth-muted mb-1">매도시 손익</div>
                {selectedEtf && selectedEtf.etf_tax_type === 'A' && saleProfit > 0 && (
                  <div className="text-xs text-wealth-muted mb-1">(소득세 15.4% 제외)</div>
                )}
                <div className={`text-2xl font-bold ${saleProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {saleProfit >= 0 ? '+' : ''}{formatCurrency(saleProfit)}원
                </div>
                {saleProfit !== 0 && purchasePrice > 0 && quantity > 0 && (
                  <div className={`text-xs mt-1 ${saleProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {((saleProfit / (purchasePrice * quantity)) * 100).toFixed(2)}%
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 배당수익 섹션 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-6 text-wealth-text">배당수익</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* 일반계좌 배당수익 */}
              <div className="bg-wealth-card/30 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
                <div className="text-sm text-wealth-muted mb-1">일반계좌</div>
                <div className="text-xs text-wealth-muted mb-2">(소득세 15.4%)</div>
                <div className="text-2xl font-bold text-wealth-text">
                  {formatCurrency(dividendIncome.general)}원
                </div>
              </div>

              {/* ISA 일반형 배당수익 */}
              <div className="bg-wealth-card/30 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
                <div className="text-sm text-wealth-muted mb-1">ISA 일반형</div>
                <div className="text-xs text-wealth-muted mb-2">(200만원까지 비과세, 초과는 9.9% 분리과세)</div>
                <div className="text-2xl font-bold text-wealth-text">
                  {formatCurrency(dividendIncome.isaGeneral)}원
                </div>
              </div>

              {/* ISA 서민형 배당수익 */}
              <div className="bg-wealth-card/30 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
                <div className="text-sm text-wealth-muted mb-1">ISA 서민형</div>
                <div className="text-xs text-wealth-muted mb-2">(400만원까지 비과세, 초과는 9.9% 분리과세)</div>
                <div className="text-2xl font-bold text-wealth-text">
                  {formatCurrency(dividendIncome.isaPeople)}원
                </div>
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
                  <table className="w-full border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-wealth-muted font-medium whitespace-nowrap">지급기준일</th>
                        <th className="text-left py-3 px-4 text-wealth-muted font-medium whitespace-nowrap">실지급일</th>
                        <th className="text-right py-3 px-4 text-wealth-muted font-medium whitespace-nowrap">배당금액(원)</th>
                        <th className="text-right py-3 px-4 text-wealth-muted font-medium whitespace-nowrap">주당과세표준액(원)</th>
                        <th className="text-right py-3 px-4 text-wealth-muted font-medium whitespace-nowrap">배당금액({quantity}주)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dividendData.map((dividend, index) => (
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
                            {formatCurrency(dividend.dividend_amt * quantity)}
                          </td>
                        </tr>
                      ))}
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

export default DomesticHighDividendSimulation;

