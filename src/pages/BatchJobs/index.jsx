import React, { useState } from 'react';
import { getApiUrl, API_ENDPOINTS } from '../../utils/api';
import { ensureKRStockCache } from '../../components/KRStockSelector';

const BATCH_JOBS_API = getApiUrl(API_ENDPOINTS.BATCH_JOBS);

function getTodayYyyyMmDd() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function toYyyyMmDd(val) {
  if (!val || !val.trim()) return '';
  if (val.includes('-')) return val;
  return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
}

function BatchJobs() {
  const [dartContractDate, setDartContractDate] = useState(getTodayYyyyMmDd);
  const [krxDate, setKrxDate] = useState(getTodayYyyyMmDd);
  const [krxShortingDate, setKrxShortingDate] = useState(getTodayYyyyMmDd);
  const [infostockDate, setInfostockDate] = useState(getTodayYyyyMmDd);
  const [infostockHeadless, setInfostockHeadless] = useState(true);
  const [dartContractLoading, setDartContractLoading] = useState(false);
  const [krxLoading, setKrxLoading] = useState(false);
  const [dartContractError, setDartContractError] = useState(null);
  const [dartContractResult, setDartContractResult] = useState(null);
  const [krxError, setKrxError] = useState(null);
  const [krxResult, setKrxResult] = useState(null);
  const [infostockLoading, setInfostockLoading] = useState(false);
  const [infostockError, setInfostockError] = useState(null);
  const [infostockResult, setInfostockResult] = useState(null);
  const [chartTableDate, setChartTableDate] = useState(getTodayYyyyMmDd);
  const [chartTableLoading, setChartTableLoading] = useState(false);
  const [chartTableError, setChartTableError] = useState(null);
  const [chartTableResult, setChartTableResult] = useState(null);

  const handleRunDartContract = async () => {
    if (!dartContractDate.trim()) {
      setDartContractError('날짜를 선택해주세요.');
      return;
    }
    setDartContractLoading(true);
    setDartContractError(null);
    setDartContractResult(null);
    try {
      const dateStr = toYyyyMmDd(dartContractDate);
      const res = await fetch(`${BATCH_JOBS_API}/dart-contract-summarizer/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
        throw new Error(msg || '실행 요청 실패');
      }
      setDartContractResult(data);
    } catch (err) {
      setDartContractError(err.message || '실행 요청에 실패했습니다.');
    } finally {
      setDartContractLoading(false);
    }
  };

  const handleRunKrxDailyCollector = async () => {
    if (!krxDate.trim() || !krxShortingDate.trim()) {
      setKrxError('날짜를 모두 선택해주세요.');
      return;
    }
    setKrxLoading(true);
    setKrxError(null);
    setKrxResult(null);
    try {
      const res = await fetch(`${BATCH_JOBS_API}/krx-daily-collector/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: toYyyyMmDd(krxDate),
          shorting_date: toYyyyMmDd(krxShortingDate),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
        throw new Error(msg || '실행 요청 실패');
      }
      setKrxResult(data);
    } catch (err) {
      setKrxError(err.message || '실행 요청에 실패했습니다.');
    } finally {
      setKrxLoading(false);
    }
  };

  const handleRunInfostockDailyFeaturedTheme = async () => {
    if (!infostockDate.trim()) {
      setInfostockError('날짜를 선택해주세요.');
      return;
    }
    setInfostockLoading(true);
    setInfostockError(null);
    setInfostockResult(null);
    try {
      await ensureKRStockCache();
      const res = await fetch(`${BATCH_JOBS_API}/infostock-daily-featured-theme/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: toYyyyMmDd(infostockDate),
          headless: infostockHeadless,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
        throw new Error(msg || '실행 요청 실패');
      }
      setInfostockResult(data);
    } catch (err) {
      setInfostockError(err.message || '실행 요청에 실패했습니다.');
    } finally {
      setInfostockLoading(false);
    }
  };

  const handleRunDailyFeaturedThemeChartTable = async () => {
    if (!chartTableDate.trim()) {
      setChartTableError('날짜를 선택해주세요.');
      return;
    }
    setChartTableLoading(true);
    setChartTableError(null);
    setChartTableResult(null);
    try {
      await ensureKRStockCache();
      const res = await fetch(`${BATCH_JOBS_API}/daily-featured-theme-chart-table/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: toYyyyMmDd(chartTableDate) }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
        throw new Error(msg || '실행 요청 실패');
      }
      setChartTableResult(data);
    } catch (err) {
      setChartTableError(err.message || '실행 요청에 실패했습니다.');
    } finally {
      setChartTableLoading(false);
    }
  };

  return (
    <div className="min-h-screen space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-wealth-gold to-yellow-200 mb-2">
          배치 작업
        </h1>
        <p className="text-wealth-muted text-sm">
          화면에서 배치 작업을 실행할 수 있습니다. 실행 시 터미널 창이 열립니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 인포스탁 Daily 특징 테마 */}
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            인포스탁 Daily 특징 테마(거래일 5시 10분 작업)
          </h2>
          <p className="text-wealth-muted text-sm mb-4">
            인포스탁 Daily 특징 테마 + 특징 상한가 및 급등종목(키움 파일 다운로드)을 스크래핑하고, LLM으로 종합시황·상승테마·테마별 상승종목을 정리해 logs/daily_featured_theme에 저장합니다.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-wealth-muted text-xs mb-1">날짜</label>
              <input
                type="date"
                value={infostockDate}
                onChange={(e) => setInfostockDate(e.target.value)}
                className="px-3 py-2 bg-wealth-card border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-wealth-muted hover:text-wealth-text">
              <input
                type="checkbox"
                checked={infostockHeadless}
                onChange={(e) => setInfostockHeadless(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-wealth-card text-wealth-gold focus:ring-wealth-gold"
              />
              <span className="text-sm">헤드리스</span>
            </label>
            <button
              type="button"
              onClick={handleRunInfostockDailyFeaturedTheme}
              disabled={infostockLoading}
              className="px-4 py-2 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {infostockLoading ? '실행 중...' : '실행'}
            </button>
          </div>
          {infostockError && (
            <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
              {infostockError}
            </div>
          )}
          {infostockResult && (
            <div className="mt-4 bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-400 text-sm">
              {infostockResult.message} (날짜: {infostockResult.date})
            </div>
          )}
        </div>

        {/* KRX 일일 데이터 수집기 */}
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            KRX 일일 데이터 수집기(거래일 6시 5분 작업)
          </h2>
          <p className="text-wealth-muted text-sm mb-4">
            KRX 로그인 후 일일 차트, 공매도, 투자자별 거래대금 데이터를 수집합니다. 날짜(일일 차트/거래대금용)와 공매도 날짜를 각각 선택하세요.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-wealth-muted text-xs mb-1">날짜 (일일 차트/거래대금)</label>
              <input
                type="date"
                value={krxDate}
                onChange={(e) => setKrxDate(e.target.value)}
                className="px-3 py-2 bg-wealth-card border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
              />
            </div>
            <div>
              <label className="block text-wealth-muted text-xs mb-1">공매도 날짜</label>
              <input
                type="date"
                value={krxShortingDate}
                onChange={(e) => setKrxShortingDate(e.target.value)}
                className="px-3 py-2 bg-wealth-card border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
              />
            </div>
            <button
              type="button"
              onClick={handleRunKrxDailyCollector}
              disabled={krxLoading}
              className="px-4 py-2 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {krxLoading ? '실행 중...' : '실행'}
            </button>
          </div>
          {krxError && (
            <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
              {krxError}
            </div>
          )}
          {krxResult && (
            <div className="mt-4 bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-400 text-sm">
              {krxResult.message} (날짜: {krxResult.date}, 공매도: {krxResult.shorting_date})
            </div>
          )}
        </div>

        {/* Featured Theme 차트 테이블 (analyzer) */}
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            특징 테마 기술 지표(KRX 데이터 수집 후 재기동)
          </h2>
          <p className="text-wealth-muted text-sm mb-4">
            인포스탁 Daily 특징 테마로 만든{' '}
            <code className="text-xs bg-black/30 px-1 rounded">logs/daily_featured_theme/날짜.html</code>에서 종목을 읽어
            차트·보조지표·시총을 정리한 HTML을{' '}
            <code className="text-xs bg-black/30 px-1 rounded">logs/daily_featured_theme_chart_table</code>에 저장합니다.
            (명령: <code className="text-xs bg-black/30 px-1 rounded whitespace-nowrap">python -m analyzer.daily_featured_theme_chart_table</code> 날짜)
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-wealth-muted text-xs mb-1">날짜</label>
              <input
                type="date"
                value={chartTableDate}
                onChange={(e) => setChartTableDate(e.target.value)}
                className="px-3 py-2 bg-wealth-card border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
              />
            </div>
            <button
              type="button"
              onClick={handleRunDailyFeaturedThemeChartTable}
              disabled={chartTableLoading}
              className="px-4 py-2 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {chartTableLoading ? '실행 중...' : '실행'}
            </button>
          </div>
          {chartTableError && (
            <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
              {chartTableError}
            </div>
          )}
          {chartTableResult && (
            <div className="mt-4 bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-400 text-sm">
              {chartTableResult.message} (날짜: {chartTableResult.date})
            </div>
          )}
        </div>

        {/* DART 단일판매ㆍ공급계약체결 */}
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            DART &apos;단일판매ㆍ공급계약체결&apos; 공시 요약(거래일 오후 8시 작업)
          </h2>
          <p className="text-wealth-muted text-sm mb-4">
            해당 날짜의 단일판매ㆍ공급계약체결 공시를 조회하여 요약 후 logs/dart_contract_summary에 저장합니다.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-wealth-muted text-xs mb-1">날짜</label>
              <input
                type="date"
                value={dartContractDate}
                onChange={(e) => setDartContractDate(e.target.value)}
                className="px-3 py-2 bg-wealth-card border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
              />
            </div>
            <button
              type="button"
              onClick={handleRunDartContract}
              disabled={dartContractLoading}
              className="px-4 py-2 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {dartContractLoading ? '실행 중...' : '실행'}
            </button>
          </div>
          {dartContractError && (
            <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
              {dartContractError}
            </div>
          )}
          {dartContractResult && (
            <div className="mt-4 bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-400 text-sm">
              {dartContractResult.message} (날짜: {dartContractResult.date})
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BatchJobs;
