import React, { useState } from 'react';
import CurrencyInput from '../../components/CurrencyInput';
import RatioInput from '../../components/RatioInput';

function OpportunityCost() {
  const [dailyTargetIncome, setDailyTargetIncome] = useState('400000'); // 하루목표수익
  const [missedReturnRate, setMissedReturnRate] = useState('9'); // 놓친 종목 수익률 (9%)
  
  // 시작금액 목록
  const initialAmounts = [
    1000000,   // 100만원
    2000000,   // 200만원
    3000000,   // 300만원
    5000000,   // 500만원
    7000000,   // 700만원
    10000000,  // 1,000만원
    20000000,  // 2,000만원
  ];

  // 계산 함수
  const calculateDailyRate = (initialAmount) => {
    // 필요수익률 = 하루목표수익 / 시작금액 (Excel 공식: =$B$1/A4)
    // 하루 수익률을 퍼센트로 표시
    if (initialAmount === 0) return 0;
    const dailyIncome = Number(dailyTargetIncome) || 0;
    return (dailyIncome / initialAmount) * 100; // 하루 수익률 (%)
  };

  const calculateMissedAmount = (initialAmount) => {
    // 목표금액 = 시작금액 * 놓친 종목 수익률 (Excel 공식: =A4*$D$1)
    const missedRate = (Number(missedReturnRate) || 0) / 100;
    return initialAmount * missedRate;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ko-KR').format(Math.round(value));
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-wealth-dark pb-20">
      <div className="max-w-[95%] mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* 헤더 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-wealth-gold to-yellow-200 mb-2 whitespace-nowrap">
              기회비용 계산기
            </h1>
            <p className="text-wealth-muted">
              2027년 7월 이편한세상시티 삼송 4억 3천만원 모으기!!
            </p>
          </div>

          {/* 입력 폼 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CurrencyInput
                label="하루목표수익"
                name="dailyTargetIncome"
                value={dailyTargetIncome}
                onChange={(e) => setDailyTargetIncome(e.target.value)}
                placeholder="하루목표수익을 입력하세요"
                suffix="원"
              />
              <RatioInput
                label="놓친 종목 수익률"
                name="missedReturnRate"
                value={missedReturnRate}
                onChange={(e) => setMissedReturnRate(e.target.value)}
                placeholder="놓친 종목 수익률을 입력하세요"
                suffix="%"
                min={0}
                max={100}
                step={0.01}
              />
            </div>
          </div>

          {/* 결과 테이블 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-center py-3 px-4 text-wealth-muted font-medium border-r border-gray-700/50 whitespace-nowrap">
                      투자금 (원)
                    </th>
                    <th className="text-center py-3 px-4 text-wealth-muted font-medium border-r border-gray-700/50 whitespace-nowrap">
                      필요수익률 (하루, %)
                    </th>
                    <th className="text-center py-3 px-4 text-wealth-muted font-medium whitespace-nowrap">
                      놓친 종목 수익 (원)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {initialAmounts.map((initialAmount) => {
                    const dailyRate = calculateDailyRate(initialAmount);
                    const missedAmount = calculateMissedAmount(initialAmount);
                    
                    return (
                      <tr
                        key={initialAmount}
                        className="border-b border-gray-800/30 hover:bg-wealth-card/30 transition-colors"
                      >
                        <td className="text-center py-3 px-4 text-wealth-text border-r border-gray-700/50 whitespace-nowrap">
                          {formatCurrency(initialAmount)}
                        </td>
                        <td className="text-center py-3 px-4 text-wealth-text border-r border-gray-700/50 whitespace-nowrap">
                          {formatPercentage(dailyRate)}
                        </td>
                        <td className="text-center py-3 px-4 text-wealth-text whitespace-nowrap">
                          {formatCurrency(missedAmount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OpportunityCost;
