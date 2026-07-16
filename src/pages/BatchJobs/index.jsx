import React, { useState, useEffect } from 'react';
import { getApiUrl, API_ENDPOINTS } from '../../utils/api';
import { ensureKRStockCache } from '../../components/KRStockSelector';

const BATCH_JOBS_API = getApiUrl(API_ENDPOINTS.BATCH_JOBS);
const COMMON_CODE_MASTERS_API = getApiUrl(API_ENDPOINTS.COMMON_CODE_MASTERS);
const COMMON_CODE_DETAILS_API = getApiUrl(API_ENDPOINTS.COMMON_CODE_DETAILS);

function getTodayYyyyMmDd() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function toYyyyMmDd(val) {
  if (!val || !val.trim()) return '';
  if (val.includes('-')) return val;
  return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
}

function resolveDefaultMarketClassCode(options) {
  const list = Array.isArray(options) ? options : [];
  const domestic = list.find(
    (o) => String(o.detail_code_name || '').trim() === '국내'
  );
  return String(domestic?.detail_code ?? list[0]?.detail_code ?? '').trim();
}

function BatchJobs() {
  const [dartContractDate, setDartContractDate] = useState(getTodayYyyyMmDd);
  const [krxDate, setKrxDate] = useState(getTodayYyyyMmDd);
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
  const [pdfPortfolioMarketOptions, setPdfPortfolioMarketOptions] = useState([]);
  const [pdfPortfolioMarketClass, setPdfPortfolioMarketClass] = useState('');
  const [pdfPortfolioTicker, setPdfPortfolioTicker] = useState('');
  const [pdfPortfolioLoading, setPdfPortfolioLoading] = useState(false);
  const [pdfPortfolioError, setPdfPortfolioError] = useState(null);
  const [pdfPortfolioResult, setPdfPortfolioResult] = useState(null);
  const [etfListingDate, setEtfListingDate] = useState(getTodayYyyyMmDd);
  const [etfListingLoading, setEtfListingLoading] = useState(false);
  const [etfListingError, setEtfListingError] = useState(null);
  const [etfListingResult, setEtfListingResult] = useState(null);
  const [usaStockIndicatorsEndDate, setUsaStockIndicatorsEndDate] = useState(getTodayYyyyMmDd);
  const [usaStockIndicatorsTicker, setUsaStockIndicatorsTicker] = useState('');
  const [usaStockIndicatorsLoading, setUsaStockIndicatorsLoading] = useState(false);
  const [usaStockIndicatorsError, setUsaStockIndicatorsError] = useState(null);
  const [usaStockIndicatorsResult, setUsaStockIndicatorsResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const masterRes = await fetch(COMMON_CODE_MASTERS_API);
        if (!masterRes.ok) return;
        const masters = await masterRes.json();
        const mcMaster = (Array.isArray(masters) ? masters : []).find(
          (m) => m.code === 'kr_etf_market_classification'
        );
        if (!mcMaster?.id) return;
        const detailRes = await fetch(
          `${COMMON_CODE_DETAILS_API}?master_id=${mcMaster.id}&skip=0&limit=500`
        );
        if (!detailRes.ok) return;
        const details = await detailRes.json();
        const list = Array.isArray(details) ? details : [];
        if (cancelled) return;
        setPdfPortfolioMarketOptions(list);
        setPdfPortfolioMarketClass(resolveDefaultMarketClassCode(list));
      } catch (err) {
        console.error('시장분류(kr_etf_market_classification) 로드 실패:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (!krxDate.trim()) {
      setKrxError('날짜를 선택해주세요.');
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

  const handleRunDomesticEtfsListingDate = async () => {
    if (!etfListingDate.trim()) {
      setEtfListingError('날짜를 선택해주세요.');
      return;
    }
    setEtfListingLoading(true);
    setEtfListingError(null);
    setEtfListingResult(null);
    try {
      const res = await fetch(`${BATCH_JOBS_API}/domestic-etfs-listing-date/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: toYyyyMmDd(etfListingDate) }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
        throw new Error(msg || '실행 요청 실패');
      }
      setEtfListingResult(data);
    } catch (err) {
      setEtfListingError(err.message || '실행 요청에 실패했습니다.');
    } finally {
      setEtfListingLoading(false);
    }
  };

  const handleRunDomesticEtfsPdfPortfolio = async () => {
    const ticker = pdfPortfolioTicker.trim().toUpperCase();
    if (!ticker && !pdfPortfolioMarketClass.trim()) {
      setPdfPortfolioError('시장분류를 선택하거나 티커를 입력해주세요.');
      return;
    }
    setPdfPortfolioLoading(true);
    setPdfPortfolioError(null);
    setPdfPortfolioResult(null);
    try {
      const payload = ticker
        ? { ticker }
        : { market_class: pdfPortfolioMarketClass };
      const res = await fetch(`${BATCH_JOBS_API}/domestic-etfs-pdf-portfolio/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
        throw new Error(msg || '실행 요청 실패');
      }
      setPdfPortfolioResult(data);
    } catch (err) {
      setPdfPortfolioError(err.message || '실행 요청에 실패했습니다.');
    } finally {
      setPdfPortfolioLoading(false);
    }
  };

  const handleRunUsaStockIndicatorsSync = async () => {
    if (!usaStockIndicatorsEndDate.trim()) {
      setUsaStockIndicatorsError('종료일을 선택해주세요.');
      return;
    }
    setUsaStockIndicatorsLoading(true);
    setUsaStockIndicatorsError(null);
    setUsaStockIndicatorsResult(null);
    try {
      const payload = {
        end: toYyyyMmDd(usaStockIndicatorsEndDate),
      };
      const ticker = usaStockIndicatorsTicker.trim();
      if (ticker) {
        payload.ticker = ticker;
      }
      const res = await fetch(`${BATCH_JOBS_API}/sync-usa-stocks-technical-indicators/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
        throw new Error(msg || '실행 요청 실패');
      }
      setUsaStockIndicatorsResult(data);
    } catch (err) {
      setUsaStockIndicatorsError(err.message || '실행 요청에 실패했습니다.');
    } finally {
      setUsaStockIndicatorsLoading(false);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KRX 일일 데이터 수집기 */}
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            KRX 일일 데이터 수집기(거래일 3시 30분 이후 작업)
          </h2>
          <p className="text-wealth-muted text-sm mb-4">
            KRX 로그인 후 일일 차트, 투자자별 거래대금, 국내 ETF 일일 차트 등을 수집합니다. 날짜(일일 차트·거래대금·ETF 일봉용)를 선택하세요.
            수집 3단계가 모두 성공하면 국내주식·국내ETF 기술지표를 터미널에서 병렬 동기화합니다.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-wealth-muted text-xs mb-1">날짜 (일일 차트/거래대금/ETF)</label>
              <input
                type="date"
                value={krxDate}
                onChange={(e) => setKrxDate(e.target.value)}
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
              {krxResult.message} (날짜: {krxResult.date})
            </div>
          )}
        </div>

        {/* 인포스탁 Daily 특징 테마 */}
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            인포스탁 Daily 특징 테마(거래일 5시 20분 작업)
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

        {/* KRX ETF 상장일 domestic_etfs 적재 */}
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            KRX ETF 상장일 domestic_etfs 적재
          </h2>
          <p className="text-wealth-muted text-sm mb-4">
            KRX HTTP 세션으로 ETF 전종목 기본정보를 조회해, 지정 상장일 종목을{' '}
            <code className="text-xs bg-black/30 px-1 rounded">stock.domestic_etfs</code>에
            저장합니다. 사전에 <code className="text-xs bg-black/30 px-1 rounded">krx_session_extender</code>{' '}
            (HTTP 세션) 실행이 필요합니다. Excel 수동 다운로드는 불필요합니다.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-wealth-muted text-xs mb-1">상장일</label>
              <input
                type="date"
                value={etfListingDate}
                onChange={(e) => setEtfListingDate(e.target.value)}
                className="px-3 py-2 bg-wealth-card border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
              />
            </div>
            <button
              type="button"
              onClick={handleRunDomesticEtfsListingDate}
              disabled={etfListingLoading}
              className="px-4 py-2 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {etfListingLoading ? '실행 중...' : '실행'}
            </button>
          </div>
          {etfListingError && (
            <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
              {etfListingError}
            </div>
          )}
          {etfListingResult && (
            <div className="mt-4 bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-400 text-sm">
              {etfListingResult.message} (상장일: {etfListingResult.date})
            </div>
          )}
        </div>

        {/* 국내 ETF PDF 포트폴리오 적재 */}
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            국내 ETF PDF 포트폴리오 적재
          </h2>
          <p className="text-wealth-muted text-sm mb-4">
            pykrx <code className="text-xs bg-black/30 px-1 rounded">get_etf_portfolio_deposit_file</code> 결과를{' '}
            <code className="text-xs bg-black/30 px-1 rounded">stock.domestic_etfs_pdf</code>에 저장합니다.
            시장분류별로 해당 ETF를 적재하거나, 티커를 입력하면 해당 종목만 적재합니다.
          </p>
          <div className="mb-4">
            <p className="text-sm text-wealth-muted mb-2">시장분류</p>
            <div
              className="inline-flex flex-wrap gap-2"
              role="group"
              aria-label="시장분류 선택"
            >
              {pdfPortfolioMarketOptions.map((opt) => {
                  const code = String(opt.detail_code ?? '').trim();
                  const active = pdfPortfolioMarketClass === code;
                  return (
                    <button
                      key={opt.id ?? code}
                      type="button"
                      onClick={() => setPdfPortfolioMarketClass(code)}
                      disabled={pdfPortfolioLoading || !code}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
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
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-wealth-muted text-xs mb-1">티커 (선택)</label>
              <input
                type="text"
                value={pdfPortfolioTicker}
                onChange={(e) => setPdfPortfolioTicker(e.target.value.toUpperCase())}
                placeholder="예: 0098F0"
                autoComplete="off"
                className="px-3 py-2 bg-wealth-card border border-gray-700 rounded-lg text-white text-sm w-28 focus:outline-none focus:ring-2 focus:ring-wealth-gold"
              />
            </div>
            <button
              type="button"
              onClick={handleRunDomesticEtfsPdfPortfolio}
              disabled={
                pdfPortfolioLoading
                || (!pdfPortfolioTicker.trim() && !pdfPortfolioMarketClass.trim())
              }
              className="px-4 py-2 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {pdfPortfolioLoading ? '실행 중...' : '실행'}
            </button>
          </div>
          {pdfPortfolioTicker.trim() && (
            <p className="mt-2 text-xs text-wealth-muted">
              티커가 입력되면 시장분류 선택 없이 해당 ETF만 적재합니다.
            </p>
          )}
          {pdfPortfolioError && (
            <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
              {pdfPortfolioError}
            </div>
          )}
          {pdfPortfolioResult && (
            <div className="mt-4 bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-400 text-sm">
              {pdfPortfolioResult.message}
              {pdfPortfolioResult.ticker
                ? ` (티커: ${pdfPortfolioResult.ticker})`
                : ` (시장분류: ${pdfPortfolioResult.market_class})`}
            </div>
          )}
        </div>

        {/* 미국 상장 기업 기술지표 동기화 */}
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            미국 상장 기업 기술지표 동기화
          </h2>
          <p className="text-wealth-muted text-sm mb-4">
            FinanceDataReader로 usa_stocks 일봉(종료일 기준 2개월)을 조회해 RSI·MACD·BB 등
            스냅샷을 갱신합니다. 티커를 비우면 use_yn=True 전 종목을 처리합니다.
            (명령:{' '}
            <code className="text-xs bg-black/30 px-1 rounded whitespace-nowrap">
              python -m app.import.sync_usa_stocks_technical_indicators
            </code>
            )
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-wealth-muted text-xs mb-1">종료일 (--end)</label>
              <input
                type="date"
                value={usaStockIndicatorsEndDate}
                onChange={(e) => setUsaStockIndicatorsEndDate(e.target.value)}
                className="px-3 py-2 bg-wealth-card border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
              />
            </div>
            <div>
              <label className="block text-wealth-muted text-xs mb-1">티커 (선택)</label>
              <input
                type="text"
                value={usaStockIndicatorsTicker}
                onChange={(e) => setUsaStockIndicatorsTicker(e.target.value.toUpperCase())}
                placeholder="예: AAPL"
                autoComplete="off"
                className="px-3 py-2 bg-wealth-card border border-gray-700 rounded-lg text-white text-sm w-28 focus:outline-none focus:ring-2 focus:ring-wealth-gold"
              />
            </div>
            <button
              type="button"
              onClick={handleRunUsaStockIndicatorsSync}
              disabled={usaStockIndicatorsLoading}
              className="px-4 py-2 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {usaStockIndicatorsLoading ? '실행 중...' : '실행'}
            </button>
          </div>
          {usaStockIndicatorsError && (
            <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
              {usaStockIndicatorsError}
            </div>
          )}
          {usaStockIndicatorsResult && (
            <div className="mt-4 bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-400 text-sm">
              {usaStockIndicatorsResult.message}
              {usaStockIndicatorsResult.end ? ` (종료일: ${usaStockIndicatorsResult.end})` : ''}
              {usaStockIndicatorsResult.ticker ? ` (티커: ${usaStockIndicatorsResult.ticker})` : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BatchJobs;
