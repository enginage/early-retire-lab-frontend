import React, { useState, useEffect } from 'react';
import CurrencyInput from '../../components/CurrencyInput';
import SimulationTable from '../../components/SimulationTable';

// 아이콘 컴포넌트
const AlertCircle = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const TrendingDown = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

const Briefcase = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const Target = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Zap = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const DIVIDEND_OPTIONS = [
  { value: 'medium', label: '중배당', rate: 5 },
  { value: 'high', label: '고배당', rate: 10 },
  { value: 'ultra_high', label: '초고배당', rate: 20 },
];

// 조기은퇴 시스템 수익률 (월 2% 복리)
const SIGNAL_MONTHLY_RETURN = 0.02;

function EarlyRetirementSimulation() {
  const [currentAge, setCurrentAge] = useState(40);
  const [investableAssets, setInvestableAssets] = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [expectedLifespan, setExpectedLifespan] = useState(85);
  const [retirementAge, setRetirementAge] = useState(55);
  const [dividendOption, setDividendOption] = useState('high');
  const [results, setResults] = useState(null);

  useEffect(() => {
    // 은퇴예상나이가 현재 나이보다 크면 현재수입(월) 필수
    const isRetirementAgeGreater = retirementAge > currentAge;
    const hasRequiredFields = investableAssets && monthlyExpenses && (!isRetirementAgeGreater || (monthlyIncome && monthlyIncome > 0));

    if (hasRequiredFields) {
      calculateResults();
    } else {
      setResults(null);
    }
  }, [currentAge, investableAssets, monthlyExpenses, monthlyIncome, expectedLifespan, retirementAge, dividendOption]);

  const calculateResults = () => {

    const currentAsset = parseFloat(investableAssets.replace(/,/g, '')) || 0;
    const monthlyExpenseAmount = parseFloat(monthlyExpenses.replace(/,/g, '')) || 0;
    const yearlyExpense = monthlyExpenseAmount * 12;
    const monthlyIncomeAmount = parseFloat(monthlyIncome.replace(/,/g, '')) || 0;
    
    // 은퇴예상나이가 현재 나이보다 크면 현재수입(월) 필수
    if (retirementAge > currentAge && !monthlyIncome) {
      setResults(null);
      return;
    }
    
    // 추가투입자산 = 현재월수입 - 지출평균(월)
    // 단, 현재 나이와 은퇴예상나이가 같으면 추가투입자산은 0
    const yearsUntilRetirement = Math.max(0, retirementAge - currentAge);
    const monthlyAdditionalInvestmentAmount = yearsUntilRetirement > 0 
      ? Math.max(0, monthlyIncomeAmount - monthlyExpenseAmount)
      : 0;
    
    if (currentAsset === 0 || yearlyExpense === 0) {
      setResults(null);
      return;
    }

    // 1. 투자 없이 자산만 소진하는 경우
    // 은퇴예상나이까지는 수입이 있고, 이후에는 수입 없이 지출만 있음
    // 현재 나이와 은퇴예상나이가 같으면 추가투입자산은 0
    const monthlySavings = yearsUntilRetirement > 0 ? monthlyIncomeAmount - monthlyExpenseAmount : 0; // 월 순 저축 (은퇴예상나이와 현재 나이가 같으면 0)
    const yearlySavings = monthlySavings * 12; // 연 순 저축

    // 은퇴예상나이 시점의 자산 = 현재자산 + (은퇴예상나이까지의 순 저축)
    const assetAtRetirement = currentAsset + (yearlySavings * yearsUntilRetirement);
    
    // 은퇴예상나이부터 자산 고갈까지의 기간
    // 자산이 음수이거나 0이면 즉시 고갈
    let yearsAfterRetirementUntilDepletion = 0;
    if (assetAtRetirement > 0 && yearlyExpense > 0) {
      yearsAfterRetirementUntilDepletion = assetAtRetirement / yearlyExpense;
    }

    // 자산 고갈 시점 = 은퇴예상나이 + (은퇴예상나이부터 고갈까지의 기간)
    const depletionAge = retirementAge + yearsAfterRetirementUntilDepletion;

    // 기대수명까지 필요한 추가 근로 기간
    const yearsNeedWork = Math.max(0, expectedLifespan - depletionAge);
    const totalWorkNeeded = yearsNeedWork * yearlyExpense;
    const monthlyExpense = yearlyExpense / 12;

    // 2. 배당 투자 시나리오
    const selectedDividend = DIVIDEND_OPTIONS.find(opt => opt.value === dividendOption);
    const dividendRate = selectedDividend ? selectedDividend.rate / 100 : 0.1;
    const requiredAssetForDividend = yearlyExpense / dividendRate;
    const shortfall = requiredAssetForDividend - currentAsset;
    const shortfallPercent = currentAsset > 0 ? (currentAsset / requiredAssetForDividend) * 100 : 0;


    // 3. 조기은퇴 시스템 활용 시 (월 2% 복리, 지출 고려, 추가 투입 고려)
    // 매월 수익을 얻고 지출을 하면서 목표 자산까지 도달하는 기간 계산
    let asset = currentAsset;
    let months = 0;
    const maxMonths = 600; // 50년
    const simulationData = [];
    const currentYear = new Date().getFullYear();
    let lastRecordedYear = -1;
    let yearStartBalance = asset;
    let yearTotalReturn = 0;
    let yearTotalAdditionalInvestment = 0;
    let yearTotalAdditionalInvestmentReturn = 0;
    
    while (asset < requiredAssetForDividend && months < maxMonths) {
      const year = Math.floor(months / 12);
      const monthInYear = months % 12;
      const age = currentAge + year;
      
      // 연도 시작 시점에 데이터 기록 시작
      if (year !== lastRecordedYear) {
        if (lastRecordedYear >= 0) {
          // 이전 연도 데이터 저장
          const openingBalance = Math.round(yearStartBalance);
          const openingReturn = Math.round(yearTotalReturn);
          const openingPlusProfit = Math.round(yearStartBalance + openingReturn);
          const annualAdditionalInvestment = Math.round(yearTotalAdditionalInvestment);
          const annualAdditionalInvestmentReturn = Math.round(yearTotalAdditionalInvestmentReturn);
          const additionalInvestmentPlusProfit = Math.round(annualAdditionalInvestment + annualAdditionalInvestmentReturn);
          const closingBalance = Math.round(asset);
          const shortfall = Math.round(requiredAssetForDividend - closingBalance);
          
          simulationData.push({
            year: currentYear + lastRecordedYear,
            age: currentAge + lastRecordedYear,
            openingBalance: openingBalance,
            openingReturn: openingReturn,
            openingPlusProfit: openingPlusProfit,
            additionalInvestment: annualAdditionalInvestment,
            additionalInvestmentReturn: annualAdditionalInvestmentReturn,
            additionalInvestmentPlusProfit: additionalInvestmentPlusProfit,
            closingBalance: closingBalance,
            shortfall: shortfall,
          });
        }
        
        // 새 연도 시작
        yearStartBalance = asset;
        yearTotalReturn = 0;
        yearTotalAdditionalInvestment = 0;
        yearTotalAdditionalInvestmentReturn = 0;
        lastRecordedYear = year;
      }
      
      // 월 수익 (기존 자산 기준)
      const monthlyReturn = asset * SIGNAL_MONTHLY_RETURN;
      yearTotalReturn += monthlyReturn;
      
      // 추가 투입 자산의 월 수익 (월 2% 복리)
      const additionalInvestmentReturn = monthlyAdditionalInvestmentAmount * SIGNAL_MONTHLY_RETURN;
      yearTotalAdditionalInvestment += monthlyAdditionalInvestmentAmount;
      yearTotalAdditionalInvestmentReturn += additionalInvestmentReturn;
      
      // 자산 증가 (수익 - 지출 + 추가 투입)
      asset = asset + monthlyReturn - monthlyExpenseAmount + monthlyAdditionalInvestmentAmount;
      months++;
      
      // 자산이 음수가 되면 중단
      if (asset <= 0) {
        // 마지막 연도 데이터 저장
        const openingBalance = Math.round(yearStartBalance);
        const openingReturn = Math.round(yearTotalReturn);
        const openingPlusProfit = Math.round(yearStartBalance + openingReturn);
        const annualAdditionalInvestment = Math.round(yearTotalAdditionalInvestment);
        const annualAdditionalInvestmentReturn = Math.round(yearTotalAdditionalInvestmentReturn);
        const additionalInvestmentPlusProfit = Math.round(annualAdditionalInvestment + annualAdditionalInvestmentReturn);
        const closingBalance = Math.round(asset);
        const shortfall = Math.round(requiredAssetForDividend - closingBalance);
        
        simulationData.push({
          year: currentYear + year,
          age: age,
          openingBalance: openingBalance,
          openingReturn: openingReturn,
          openingPlusProfit: openingPlusProfit,
          additionalInvestment: annualAdditionalInvestment,
          additionalInvestmentReturn: annualAdditionalInvestmentReturn,
          additionalInvestmentPlusProfit: additionalInvestmentPlusProfit,
          closingBalance: closingBalance,
          shortfall: shortfall,
        });
        break;
      }
    }
    
    // 마지막 연도 데이터 저장 (목표 달성 시)
    if (asset >= requiredAssetForDividend && lastRecordedYear >= 0) {
      const openingBalance = Math.round(yearStartBalance);
      const openingReturn = Math.round(yearTotalReturn);
      const openingPlusProfit = Math.round(yearStartBalance + openingReturn);
      const annualAdditionalInvestment = Math.round(yearTotalAdditionalInvestment);
      const annualAdditionalInvestmentReturn = Math.round(yearTotalAdditionalInvestmentReturn);
      const additionalInvestmentPlusProfit = Math.round(annualAdditionalInvestment + annualAdditionalInvestmentReturn);
      const closingBalance = Math.round(asset);
      const shortfall = Math.round(requiredAssetForDividend - closingBalance);
      
      simulationData.push({
        year: currentYear + lastRecordedYear,
        age: currentAge + lastRecordedYear,
        openingBalance: openingBalance,
        openingReturn: openingReturn,
        openingPlusProfit: openingPlusProfit,
        additionalInvestment: annualAdditionalInvestment,
        additionalInvestmentReturn: annualAdditionalInvestmentReturn,
        additionalInvestmentPlusProfit: additionalInvestmentPlusProfit,
        closingBalance: closingBalance,
        shortfall: shortfall,
      });
    }
    
    const signalYearsToGoal = months / 12;
    const signalGoalAge = currentAge + signalYearsToGoal;

    // 조기은퇴 시스템으로 목표 달성 후 배당 수익으로 생활
    const signalDividendIncome = requiredAssetForDividend * dividendRate;
    const signalSurplus = signalDividendIncome - yearlyExpense;

    setResults({
      // 투자 없이 소진
      depletionAge: depletionAge.toFixed(1),
      yearsNeedWork: yearsNeedWork.toFixed(1),
      totalWorkNeeded: totalWorkNeeded.toFixed(0),
      monthlyExpense: monthlyExpense.toFixed(0),
      
      // 배당 투자
      requiredAsset: requiredAssetForDividend.toFixed(0),
      shortfall: shortfall.toFixed(0),
      shortfallPercent: shortfallPercent.toFixed(1),
      dividendRate: (dividendRate * 100).toFixed(1),
      
      // 조기은퇴 시스템
      signalYearsToGoal: signalYearsToGoal.toFixed(1),
      signalGoalAge: signalGoalAge.toFixed(1),
      signalSurplus: signalSurplus.toFixed(0),
      yearsSaved: (retirementAge - signalGoalAge).toFixed(1),
      simulationData: simulationData,
    });
  };

  const formatCurrency = (value) => {
    if (!value) return '0';
    const num = parseFloat(value.toString().replace(/,/g, ''));
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('ko-KR').format(Math.floor(num));
  };

  const handleInvestableAssetsChange = (e) => {
    setInvestableAssets(e.target.value);
  };

  const handleMonthlyExpensesChange = (e) => {
    setMonthlyExpenses(e.target.value);
  };

  const handleMonthlyIncomeChange = (e) => {
    setMonthlyIncome(e.target.value);
  };

  return (
    <div className="min-h-screen bg-wealth-dark pb-20">
      <div className="max-w-[95%] mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* 헤더 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-wealth-gold to-yellow-200 mb-2 whitespace-nowrap">
              조기은퇴 시뮬레이션
            </h1>
            <p className="text-wealth-muted text-sm">
              투자 없이 살면 언제까지 버틸 수 있을까요? 다양한 시나리오를 비교해보세요.
            </p>
          </div>

      {/* 입력 섹션 */}
      <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-6">현재 상황 입력</h2>
        
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-wealth-muted mb-2">현재 나이</label>
            <input
              type="number"
              value={currentAge}
              onChange={(e) => {
                const newCurrentAge = Number(e.target.value);
                setCurrentAge(newCurrentAge);
                // 현재 나이가 변경되면 은퇴예상나이가 현재 나이보다 작아지면 조정
                if (retirementAge < newCurrentAge) {
                  setRetirementAge(newCurrentAge);
                }
              }}
              className="w-full bg-wealth-card border border-gray-700 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-wealth-gold"
              min="1"
              max="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-wealth-muted mb-2">은퇴예상나이</label>
            <input
              type="number"
              value={retirementAge}
              onChange={(e) => {
                const newRetirementAge = Number(e.target.value);
                // 입력 중에는 허용하되, 빈 값이나 NaN은 무시
                if (!isNaN(newRetirementAge) && e.target.value !== '') {
                  setRetirementAge(newRetirementAge);
                }
              }}
              onBlur={(e) => {
                const newRetirementAge = Number(e.target.value);
                // blur 시 현재 나이보다 작으면 현재 나이로 조정
                if (isNaN(newRetirementAge) || newRetirementAge < currentAge) {
                  setRetirementAge(currentAge);
                }
              }}
              className="w-full bg-wealth-card border border-gray-700 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-wealth-gold"
              min={currentAge}
              max="120"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-wealth-muted mb-2">기대수명</label>
            <input
              type="number"
              value={expectedLifespan}
              onChange={(e) => setExpectedLifespan(Number(e.target.value))}
              className="w-full bg-wealth-card border border-gray-700 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-wealth-gold"
              min="1"
              max="120"
            />
          </div>

        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <CurrencyInput
            label="현재자산"
            name="investable_assets"
            value={investableAssets}
            onChange={handleInvestableAssetsChange}
            placeholder="현재자산을 입력하세요"
            suffix="원"
            showHelperText={false}
            required={true}
          />
          <CurrencyInput
            label="지출평균(월)"
            name="monthly_expenses"
            value={monthlyExpenses}
            onChange={handleMonthlyExpensesChange}
            placeholder="월 지출액을 입력하세요"
            suffix="원"
            showHelperText={false}
            required={true}
          />
          <CurrencyInput
            label="현재수입(월)"
            name="monthly_income"
            value={monthlyIncome}
            onChange={handleMonthlyIncomeChange}
            placeholder="월 수입액을 입력하세요"
            suffix="원"
            showHelperText={false}
            required={retirementAge > currentAge}
            disabled={retirementAge <= currentAge}
          />
        </div>
      </div>

      {results && (
        <>
          {/* 투자 없이 자산만 소진하는 경우 */}
          <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-4 sm:p-6 md:p-8 backdrop-blur-sm overflow-hidden">
            <div className="flex items-start gap-4 mb-6">
              <AlertCircle className="w-8 h-8 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  ⚠️ 투자 없이 은퇴할 경우 (기대수명 {expectedLifespan}세 기준)
                </h2>
                <p className="text-red-200">현실적인 시나리오입니다</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-wealth-card/50 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingDown className="w-6 h-6 text-red-400" />
                  <h3 className="text-base sm:text-lg font-semibold text-white break-words">은퇴 후 자산 고갈 시점</h3>
                </div>
                <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-red-400 mb-2 break-words">
                  {results.depletionAge}세
                </p>
                <p className="text-wealth-muted text-sm sm:text-base">
                  은퇴 후 {(parseFloat(results.depletionAge) - retirementAge).toFixed(1)}년 내 자산 소진
                </p>
              </div>

              <div className="bg-wealth-card/50 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center gap-3 mb-3">
                  <Briefcase className="w-6 h-6 text-orange-400" />
                  <h3 className="text-base sm:text-lg font-semibold text-white break-words">죽기 전까지 또 일해야 하는 시간</h3>
                </div>
                <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-orange-400 mb-2 break-words">
                  {results.yearsNeedWork}년
                </p>
              </div>
            </div>

            <div className="mt-6 bg-wealth-card/50 rounded-xl p-4 sm:p-6 border border-gray-700 overflow-hidden">
              <p className="text-white text-base sm:text-lg mb-2 break-words">
                💰 고갈 후 {expectedLifespan}세까지 필요한 총 소득
              </p>
              <p className="text-xl sm:text-2xl md:text-4xl font-bold text-red-300 break-all">
                {formatCurrency(results.totalWorkNeeded)}원
              </p>
              <p className="text-wealth-muted mt-2 text-sm sm:text-base break-words">
                = 월 {formatCurrency(results.monthlyExpense)}원 × 12개월 × {results.yearsNeedWork}년 
              </p>
            </div>
          </div>

          {/* 배당 옵션 선택 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">은퇴 후 배당 옵션 선택</h2>
            <div className="grid grid-cols-3 gap-4">
              {DIVIDEND_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDividendOption(option.value)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    dividendOption === option.value
                      ? 'border-wealth-gold bg-wealth-gold/20 text-wealth-gold'
                      : 'border-gray-700 bg-wealth-card text-white hover:border-gray-600'
                  }`}
                >
                  <div className="font-semibold">{option.label}</div>
                  <div className="text-sm text-wealth-muted">{option.rate}%(세후)</div>
                </button>
              ))}
            </div>
          </div>

          {/* 배당 투자 시나리오 */}
          <div className="bg-blue-500/20 border-2 border-blue-500 rounded-xl p-8 backdrop-blur-sm">
            <div className="flex items-start gap-4 mb-6">
              <Target className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  🎯 은퇴 후 시나리오 (연 {results.dividendRate}% 배당)
                </h2>
                <p className="text-blue-200">배당 수익으로 지출 100% 충당</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-wealth-card/50 rounded-xl p-6 border border-gray-700">
                <p className="text-wealth-muted mb-2 text-sm sm:text-base">필요한 은퇴 자산</p>
                <p className="text-xl sm:text-2xl md:text-4xl font-bold text-blue-400 mb-2 break-all">
                  {formatCurrency(results.requiredAsset)}원
                </p>
                <p className="text-wealth-muted text-xs sm:text-sm break-words">
                  (연 지출 {formatCurrency((parseFloat(monthlyExpenses.replace(/,/g, '')) || 0) * 12)}원 ÷ {results.dividendRate}% 배당)
                </p>
              </div>

              <div className="bg-wealth-card/50 rounded-xl p-6 border border-gray-700">
                <p className="text-wealth-muted mb-2 text-sm sm:text-base">현재 달성률</p>
                <p className="text-xl sm:text-2xl md:text-4xl font-bold text-yellow-400 mb-2 break-words">
                  {results.shortfallPercent}%
                </p>
                {parseFloat(results.shortfallPercent) < 100 && (
                  <p className="text-wealth-muted text-xs sm:text-sm break-words">
                    부족액: {formatCurrency(results.shortfall)}원
                  </p>
                )}
              </div>
            </div>

            {/* 진행 바 */}
            <div className="bg-wealth-card/50 rounded-xl p-6 border border-gray-700 mb-6">
              <div className="flex justify-between text-wealth-muted mb-3">
                <span>현재 자산</span>
                <span>목표 자산</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-8 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-full flex items-center justify-end pr-3 transition-all duration-1000"
                  style={{ width: `${Math.min(parseFloat(results.shortfallPercent), 100)}%` }}
                >
                  <span className="text-white font-bold text-sm">
                    {results.shortfallPercent}%
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* 조기은퇴 시스템 활용 시 */}
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500 rounded-xl p-8 backdrop-blur-sm">
            <div className="flex items-start gap-4 mb-6">
              <Zap className="w-8 h-8 text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  🚀 조기은퇴 시스템 활용 시 (월 평균 2% 수익 가정)
                </h2>
                <p className="text-green-200">시그널을 활용한 복리 투자</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-wealth-card/50 rounded-xl p-6 border border-gray-700">
                <p className="text-wealth-muted mb-2 text-sm sm:text-base">목표 달성 예상 시점</p>
                <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-green-400 mb-2 break-words">
                  {results.signalGoalAge}세
                </p>
                <p className="text-green-300 text-sm sm:text-base break-words">
                  약 {results.signalYearsToGoal}년 후 경제적 자유 달성
                </p>
              </div>

              <div className="bg-wealth-card/50 rounded-xl p-6 border border-gray-700">
                <p className="text-wealth-muted mb-2 text-sm sm:text-base">은퇴 예상 보다</p>
                <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-emerald-400 mb-2 break-words">
                  {results.yearsSaved}년
                </p>
                <p className="text-emerald-300 text-sm sm:text-base break-words">
                  더 일찍 은퇴 가능
                </p>
              </div>
            </div>

            {/* 배당 수익으로 생활 */}
            <div className="bg-wealth-card/50 rounded-xl p-6 border border-gray-700 mb-6">
              <p className="text-wealth-muted mb-2 text-sm sm:text-base break-words">목표 달성 후 배당 수익 (연 {results.dividendRate}%)</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-400 mb-2 break-all">
                {formatCurrency((parseFloat(results.requiredAsset) * parseFloat(results.dividendRate)) / 100)}원/년
              </p>
              {parseFloat(results.signalSurplus) > 0 ? (
                <p className="text-green-300 text-sm sm:text-base break-words">
                  연 지출 {formatCurrency((parseFloat(monthlyExpenses.replace(/,/g, '')) || 0) * 12)}만원 대비 
                  <span className="font-bold"> {formatCurrency(results.signalSurplus)}만원 여유</span>
                </p>
              ) : (
                <p className="text-wealth-muted text-sm sm:text-base">연 지출과 동일</p>
              )}
            </div>

            {/* 비교 요약 */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-center mb-6">
              <p className="text-white text-base sm:text-lg md:text-xl font-bold mb-2 break-words">
                투자 없이 일만 하면: {(parseFloat(results.yearsSaved) + parseFloat(results.yearsNeedWork)).toFixed(1)}년을 더 일 해야 함, 자녀에게 남길 자산 없음.
              </p>
              <p className="text-white text-base sm:text-lg md:text-xl font-bold mb-2 break-words">
                조기은퇴 시스템 활용 시: {results.signalGoalAge}세에 완전한 경제적 자유, 자녀에게 남길 자산 <span className="break-all">{formatCurrency(results.requiredAsset)}원</span> 🎉
              </p>
            </div>

            {/* 시뮬레이션 테이블 */}
            {results.simulationData && results.simulationData.length > 0 && (
              <div className="mt-6">
                <SimulationTable data={results.simulationData} />
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

export default EarlyRetirementSimulation;
