import React, { useMemo, useState } from 'react';

const TAX_RATE = 0.22; // 양도소득세율 (지방소득세 포함 22%)
const BASIC_DEDUCTION = 250; // 연간 기본공제 (만원)
const SALE_LIMIT = 5000; // 인당 매도금액 한도 (만원)

/** 매도 시기별 가중치 (기획재정부 시행령 안 기준) */
const PERIODS = [
  { key: 'p100', label: "~ '26년 5월", weight: 1.0, weightLabel: '100%' },
  { key: 'p80', label: "'26년 6월 ~ 7월", weight: 0.8, weightLabel: '80%' },
  { key: 'p50', label: "'26년 8월 ~ 12월", weight: 0.5, weightLabel: '50%' },
];

const emptyPeriodInput = () => ({ sale: '', principal: '', expense: '', netBuy: '' });

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** 만원 단위 금액을 원 단위 문자열로 표시 (소수점 없음) */
const formatWon = (manwon) => {
  const won = Math.round(manwon * 10000);
  return `${new Intl.NumberFormat('ko-KR').format(won)}원`;
};

/** 만원 단위 표시 (반올림, 소수점 없음) */
const formatManwon = (manwon) => `${new Intl.NumberFormat('ko-KR').format(Math.round(manwon))}만원`;

const formatPercent = (ratio) => `${(ratio * 100).toFixed(2)}%`;

function RiaCalculator() {
  const [periodInputs, setPeriodInputs] = useState({
    p100: emptyPeriodInput(),
    p80: emptyPeriodInput(),
    p50: emptyPeriodInput(),
  });
  const [applyBasicDeduction, setApplyBasicDeduction] = useState(true);

  const handleInputChange = (periodKey, field, rawValue) => {
    // 숫자, 음수 부호, 소수점만 허용 (만원 단위 입력)
    const value = rawValue.replace(/[^0-9.-]/g, '');
    setPeriodInputs((prev) => ({
      ...prev,
      [periodKey]: { ...prev[periodKey], [field]: value },
    }));
  };

  const handleReset = () => {
    setPeriodInputs({ p100: emptyPeriodInput(), p80: emptyPeriodInput(), p50: emptyPeriodInput() });
    setApplyBasicDeduction(true);
  };

  const result = useMemo(() => {
    const rows = PERIODS.map((period) => {
      const input = periodInputs[period.key];
      const sale = toNumber(input.sale);
      const principal = toNumber(input.principal);
      const expense = toNumber(input.expense);
      const netBuy = toNumber(input.netBuy);
      const gain = sale - principal - expense; // 양도소득금액
      return { ...period, sale, principal, expense, netBuy, gain };
    });

    // 1단계: RIA 계좌 내 가중 매도금액 및 양도소득(기간) 공제액
    const weightedSale = rows.reduce((acc, r) => acc + r.sale * r.weight, 0);
    const weightedGainDeduction = rows.reduce((acc, r) => acc + r.gain * r.weight, 0);

    // 2단계: RIA 외 계좌 해외주식 등 순매수금액 (가중치 적용, 음수면 0 처리)
    const weightedNetBuyRaw = rows.reduce((acc, r) => acc + r.netBuy * r.weight, 0);
    const weightedNetBuy = Math.max(0, weightedNetBuyRaw);

    // 3단계: 조정비율 및 최종공제액
    const adjustRatio =
      weightedSale > 0 ? Math.min(1, Math.max(0, 1 - weightedNetBuy / weightedSale)) : 0;
    const finalDeduction = Math.max(0, weightedGainDeduction) * adjustRatio;

    // 4단계: 세액 계산
    const totalSale = rows.reduce((acc, r) => acc + r.sale, 0);
    const totalGain = rows.reduce((acc, r) => acc + r.gain, 0);
    const basicDeduction = applyBasicDeduction ? BASIC_DEDUCTION : 0;

    const normalTaxBase = Math.max(0, totalGain - basicDeduction);
    const normalTax = normalTaxBase * TAX_RATE;

    const riaTaxBase = Math.max(0, totalGain - basicDeduction - finalDeduction);
    const riaTax = riaTaxBase * TAX_RATE;

    const saving = normalTax - riaTax;
    const reductionRate = normalTax > 0 ? saving / normalTax : 0;

    const hasInput = rows.some((r) => r.sale > 0 || r.principal > 0 || r.expense > 0 || r.netBuy !== 0);

    return {
      rows,
      weightedSale,
      weightedGainDeduction,
      weightedNetBuyRaw,
      weightedNetBuy,
      adjustRatio,
      finalDeduction,
      totalSale,
      totalGain,
      basicDeduction,
      normalTaxBase,
      normalTax,
      riaTaxBase,
      riaTax,
      saving,
      reductionRate,
      hasInput,
      overLimit: totalSale > SALE_LIMIT,
    };
  }, [periodInputs, applyBasicDeduction]);

  const inputFields = [
    { field: 'sale', label: '해외주식 매도금액' },
    { field: 'principal', label: '매수원금' },
    { field: 'expense', label: '필요경비' },
  ];

  return (
    <div className="min-h-screen bg-wealth-dark pb-20">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* 헤더 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-wealth-gold to-yellow-200 mb-2 whitespace-nowrap">
              국내시장복귀계좌(RIA) 절세 계산기
            </h1>
            <p className="text-wealth-muted">
              해외주식을 RIA 계좌로 이전해 매도하면 매도 시기에 따라 양도소득세가 감면됩니다. 시기별
              매도 내역을 입력해 절세액을 확인하세요. (금액 단위: 만원)
            </p>
          </div>

          {/* 입력: 기간별 RIA 계좌 매도 내역 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <h2 className="text-lg font-bold text-white mb-1">RIA 계좌 내 매도 내역 (매도만 가능)</h2>
            <p className="text-sm text-wealth-muted mb-4">
              매도 시기별로 매도금액·매수원금·필요경비를 입력하면 양도소득금액이 자동 계산됩니다.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-wealth-muted">
                    <th className="text-left py-3 pr-4 font-medium whitespace-nowrap">구분</th>
                    {PERIODS.map((p) => (
                      <th key={p.key} className="text-center py-3 px-2 font-medium whitespace-nowrap">
                        <div className="text-white">{p.label}</div>
                        <div className="text-wealth-gold text-xs mt-1">가중치 {p.weightLabel}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inputFields.map(({ field, label }) => (
                    <tr key={field} className="border-b border-gray-800">
                      <td className="py-3 pr-4 text-wealth-muted whitespace-nowrap">{label}</td>
                      {PERIODS.map((p) => (
                        <td key={p.key} className="py-2 px-2">
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={periodInputs[p.key][field]}
                              onChange={(e) => handleInputChange(p.key, field, e.target.value)}
                              placeholder="0"
                              className="w-full bg-wealth-dark border border-gray-700 rounded-lg px-3 py-2 pr-12 text-right text-white focus:outline-none focus:border-wealth-gold transition-colors"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-wealth-muted text-xs">
                              만원
                            </span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td className="py-3 pr-4 text-white font-medium whitespace-nowrap">양도소득금액</td>
                    {result.rows.map((r) => (
                      <td key={r.key} className="py-3 px-2 text-right">
                        <span className={`font-semibold ${r.gain < 0 ? 'text-red-400' : 'text-wealth-gold'}`}>
                          {formatManwon(r.gain)}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            {result.overLimit && (
              <div className="mt-4 bg-red-500/10 border border-red-500/40 rounded-lg px-4 py-3 text-sm text-red-400">
                매도금액 합계 {formatManwon(result.totalSale)}이 인당 한도 5,000만원을 초과했습니다. 한도
                초과분은 세제혜택이 적용되지 않습니다.
              </div>
            )}
          </div>

          {/* 입력: RIA 외 계좌 순매수 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <h2 className="text-lg font-bold text-white mb-1">RIA 외 계좌 해외주식 등 거래</h2>
            <p className="text-sm text-wealth-muted mb-4">
              RIA 운용 기간 중 다른 계좌에서 해외주식·해외투자 ETF/ETN·해외주식형펀드 등을 신규
              매수하면 그만큼 공제액이 차감됩니다. 기간별 순매수금액을 입력하세요. (순매도는 음수로 입력)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PERIODS.map((p) => (
                <div key={p.key}>
                  <label className="block text-sm text-wealth-muted mb-2">
                    {p.label} <span className="text-wealth-gold text-xs">(가중치 {p.weightLabel})</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={periodInputs[p.key].netBuy}
                      onChange={(e) => handleInputChange(p.key, 'netBuy', e.target.value)}
                      placeholder="0"
                      className="w-full bg-wealth-dark border border-gray-700 rounded-lg px-3 py-2 pr-12 text-right text-white focus:outline-none focus:border-wealth-gold transition-colors"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-wealth-muted text-xs">
                      만원
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 기본공제 토글 */}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <span className="text-sm text-wealth-muted">연간 기본공제 (250만원)</span>
              <div className="flex rounded-lg overflow-hidden border border-gray-700">
                <button
                  type="button"
                  onClick={() => setApplyBasicDeduction(true)}
                  className={`px-4 py-2 text-sm transition-colors ${
                    applyBasicDeduction
                      ? 'bg-wealth-gold/20 text-wealth-gold font-medium'
                      : 'bg-wealth-dark text-wealth-muted hover:text-white'
                  }`}
                >
                  적용
                </button>
                <button
                  type="button"
                  onClick={() => setApplyBasicDeduction(false)}
                  className={`px-4 py-2 text-sm transition-colors ${
                    !applyBasicDeduction
                      ? 'bg-wealth-gold/20 text-wealth-gold font-medium'
                      : 'bg-wealth-dark text-wealth-muted hover:text-white'
                  }`}
                >
                  미적용
                </button>
              </div>
              <span className="text-xs text-wealth-muted">
                올해 다른 해외주식 양도로 기본공제를 이미 소진했다면 미적용을 선택하세요.
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="ml-auto px-4 py-2 text-sm rounded-lg border border-gray-700 text-wealth-muted hover:text-white hover:border-gray-500 transition-colors"
              >
                입력 초기화
              </button>
            </div>
          </div>

          {/* 결과 요약 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">절세 결과</h2>
            {result.hasInput ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-wealth-gold/10 border border-wealth-gold/40 rounded-xl p-4 md:col-span-2">
                    <div className="text-sm text-wealth-muted mb-1">RIA로 절약하는 양도소득세</div>
                    <div className="text-2xl md:text-3xl font-bold text-wealth-gold">
                      {formatWon(result.saving)}
                    </div>
                  </div>
                  <div className="bg-wealth-dark/60 border border-gray-800 rounded-xl p-4">
                    <div className="text-sm text-wealth-muted mb-1">일반 계좌 세금</div>
                    <div className="text-xl font-bold text-red-400">{formatWon(result.normalTax)}</div>
                  </div>
                  <div className="bg-wealth-dark/60 border border-gray-800 rounded-xl p-4">
                    <div className="text-sm text-wealth-muted mb-1">RIA 계좌 세금</div>
                    <div className="text-xl font-bold text-emerald-400">{formatWon(result.riaTax)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-sm text-wealth-muted whitespace-nowrap">세금 감면율</span>
                  <div className="flex-1 h-3 bg-wealth-dark rounded-full overflow-hidden border border-gray-800">
                    <div
                      className="h-full bg-gradient-to-r from-wealth-gold to-yellow-200"
                      style={{ width: `${Math.min(100, result.reductionRate * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-wealth-gold whitespace-nowrap">
                    {formatPercent(result.reductionRate)}
                  </span>
                </div>

                {/* 4단계 상세 내역 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-gray-700">
                        <td colSpan={2} className="py-2 text-wealth-gold font-semibold">
                          1단계 : RIA 계좌 내 매도금액 및 양도소득금액 공제액(조정 전) 계산
                        </td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-2 pl-4 text-wealth-muted">해외주식 매도금액 (가중치 적용)</td>
                        <td className="py-2 text-right text-white">{formatWon(result.weightedSale)}</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-2 pl-4 text-wealth-muted">양도소득(기간) 공제액</td>
                        <td className="py-2 text-right text-white">{formatWon(result.weightedGainDeduction)}</td>
                      </tr>
                      <tr className="border-b border-gray-700">
                        <td colSpan={2} className="py-2 text-wealth-gold font-semibold">
                          2단계 : RIA 외 계좌 해외주식 등 순매수금액 계산
                        </td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-2 pl-4 text-wealth-muted">순매수금액 (가중치 적용, 음수는 0 처리)</td>
                        <td className="py-2 text-right text-white">{formatWon(result.weightedNetBuy)}</td>
                      </tr>
                      <tr className="border-b border-gray-700">
                        <td colSpan={2} className="py-2 text-wealth-gold font-semibold">
                          3단계 : 최종공제금액(조정 후) 계산
                        </td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-2 pl-4 text-wealth-muted">
                          조정비율 = 1 − (순매수금액 ÷ 매도금액)
                        </td>
                        <td className="py-2 text-right text-white">{formatPercent(result.adjustRatio)}</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-2 pl-4 text-wealth-muted">최종공제액 = 공제액 × 조정비율</td>
                        <td className="py-2 text-right font-semibold text-wealth-gold">
                          {formatWon(result.finalDeduction)}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-700">
                        <td colSpan={2} className="py-2 text-wealth-gold font-semibold">
                          4단계 : 양도소득세 세액 계산
                        </td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-2 pl-4 text-wealth-muted">총 양도소득금액</td>
                        <td className="py-2 text-right text-white">{formatWon(result.totalGain)}</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-2 pl-4 text-wealth-muted">기본공제</td>
                        <td className="py-2 text-right text-white">{formatWon(result.basicDeduction)}</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-2 pl-4 text-wealth-muted">
                          과세표준 (양도소득 − 기본공제 − 최종공제액)
                        </td>
                        <td className="py-2 text-right text-white">{formatWon(result.riaTaxBase)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pl-4 text-white font-medium">RIA 납부 세액 (과세표준 × 22%)</td>
                        <td className="py-2 text-right font-bold text-emerald-400">
                          {formatWon(result.riaTax)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-wealth-muted text-sm">
                위에 매도 내역을 입력하면 절세 결과가 표시됩니다.
              </p>
            )}
          </div>

          {/* 안내 사항 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">RIA 세제혜택 조건</h2>
            <ul className="space-y-2 text-sm text-wealth-muted list-disc list-inside">
              <li>대상: 2025년 12월 23일 이전에 취득한 해외주식만 RIA 계좌 입고(이전) 가능</li>
              <li>한도: 인당 해외주식 매도금액 기준 총 5,000만원</li>
              <li>
                유지 조건: 매도대금을 원화 환전 후 1년간 국내 주식·ETF·펀드 등에 재투자 유지 (중도 인출
                시 혜택 취소)
              </li>
              <li>
                차감: RIA 기간 중 다른 계좌에서 해외주식·국내 설정 해외투자 ETF/ETN·해외주식형펀드 등을
                신규 매수하면 그 금액(가중치 적용)만큼 공제 대상이 차감됨
              </li>
              <li>매도 시기별 가중치: ~'26년 5월 100% / 6~7월 80% / 8~12월 50%</li>
              <li>
                본 계산기는 참고용이며 실제 세금은 개인 상황과 법령 개정에 따라 달라질 수 있습니다.
                정확한 내용은 증권사·세무사와 상담하세요.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RiaCalculator;
