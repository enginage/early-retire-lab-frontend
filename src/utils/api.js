// API 기본 URL 설정
// 개발 환경: http://localhost:8000
// 프로덕션: Vercel 환경 변수에서 가져옴
const envApiUrl = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL = envApiUrl && envApiUrl.trim() !== '' 
  ? envApiUrl.trim() 
  : 'http://localhost:8000';

// 디버깅용: 환경 변수 로드 확인 (프로덕션에서도 확인 가능)
console.log('[API Config] API_BASE_URL:', API_BASE_URL);
console.log('[API Config] VITE_API_BASE_URL from env:', import.meta.env.VITE_API_BASE_URL || '(not set)');
if (!import.meta.env.VITE_API_BASE_URL) {
  console.warn('[API Config] ⚠️ VITE_API_BASE_URL is not set. Using default: http://localhost:8000');
  console.warn('[API Config] Please set VITE_API_BASE_URL in Vercel environment variables and redeploy.');
}

// API 엔드포인트 헬퍼 함수
export const getApiUrl = (endpoint) => {
  // endpoint가 이미 전체 URL이면 그대로 반환
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  // 상대 경로면 API_BASE_URL과 결합
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${path}`;
};

/**
 * Stocks RestAPI 전용 (국내 고배당 ETF 시뮬레이션 등).
 * VITE_STOCKS_REST_API_URL — Vercel URL 또는 로컬 RestAPI (기본 8080, backend-fastapi 8000과 분리)
 * 미설정 시 http://127.0.0.1:8080
 */
const DEFAULT_STOCKS_REST_BASE = 'https://stocks-restapi.vercel.app';

const stocksRestEnv = import.meta.env.VITE_STOCKS_REST_API_URL;
export const STOCKS_REST_API_BASE_URL =
  stocksRestEnv && stocksRestEnv.trim() !== ''
    ? stocksRestEnv.trim()
    // : 'http://127.0.0.1:8080';
    : DEFAULT_STOCKS_REST_BASE;

export const getStocksRestApiUrl = (endpoint) => {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const baseUrl = STOCKS_REST_API_BASE_URL.endsWith('/')
    ? STOCKS_REST_API_BASE_URL.slice(0, -1)
    : STOCKS_REST_API_BASE_URL;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${path}`;
};

// 공통 API 엔드포인트
export const API_ENDPOINTS = {
  // Common Code
  COMMON_CODE_MASTERS: '/api/v1/common-code-masters',
  COMMON_CODE_DETAILS: '/api/v1/common-code-details',
  
  // Financial Institutions
  FINANCIAL_INSTITUTIONS: '/api/v1/financial-institutions',
  
  // ETFs
  DOMESTIC_ETFS: '/api/v1/domestic-etfs',
  DOMESTIC_ETFS_DAILY_CHART: '/api/v1/domestic-etfs-daily-chart',
  DOMESTIC_ETFS_DIVIDEND: '/api/v1/domestic-etfs-dividend',
  USA_ETFS: '/api/v1/usa-etfs',
  USA_ETFS_DAILY_CHART: '/api/v1/usa-etfs-daily-chart',
  USA_ETFS_DIVIDEND: '/api/v1/usa-etfs-dividend',
  USD_KRW_EXCHANGE: '/api/v1/usd-krw-exchange',
  
  // Indicators
  USA_INDICATORS: '/api/v1/usa-indicators',
  
  // Income Targets
  INCOME_TARGETS: '/api/v1/income-targets',
  
  // Accounts
  ISA_ACCOUNTS: '/api/v1/isa-accounts',
  ISA_ACCOUNT_DETAILS: '/api/v1/isa-account-details',
  ISA_ACCOUNT_SALES: '/api/v1/isa-account-sales',
  ISA_ACCOUNT_DIVIDENDS: '/api/v1/isa-account-dividends',
  
  IRP_ACCOUNTS: '/api/v1/irp-accounts',
  IRP_ACCOUNT_DETAILS: '/api/v1/irp-account-details',
  
  PENSION_FUND_ACCOUNTS: '/api/v1/pension-fund-accounts',
  PENSION_FUND_ACCOUNT_DETAILS: '/api/v1/pension-fund-account-details',
  
  // Early Retirement
  EARLY_RETIREMENT_INITIAL_SETTING: '/api/v1/early-retirement-initial-setting',
  
  // Expenses
  EXPENSES: '/api/v1/expenses',
  
  // Income Targets
  INCOME_TARGETS: '/api/v1/income-targets',
  
  // Stock Trading Log
  STOCK_TRADING_LOGS: '/api/v1/stock-trading-logs',
  
  // KR Stocks
  KR_STOCKS: '/api/v1/kr-stocks',

  // KR Stocks Invest Volume
  KR_STOCKS_INVEST_VOLUME: '/api/v1/kr-stocks-invest-volume',
  
  // KR Stocks Trading Value (투자자별 거래대금)
  KR_STOCKS_TRADING_VALUE: '/api/v1/kr-stocks-trading-value',
  
  // KR Stocks Shorting (공매도수량, 공매도잔고)
  KR_STOCKS_SHORTING: '/api/v1/kr-stocks-shorting',
  
  // KR Stocks Daily Chart
  KR_STOCKS_DAILY_CHART: '/api/v1/kr-stocks-daily-chart',

  // KR Stocks News History (종목별 뉴스 요약 이력)
  KR_STOCKS_NEWS_HISTORY: '/api/v1/kr-stocks-news-history',

  // KR Stocks Disclosure History (종목별 공시 이력)
  KR_STOCKS_DISCLOSURE_HISTORY: '/api/v1/kr-stocks-disclosure-history',
  
  // KR Stocks Margin Trading (대차거래정보)
  KR_STOCKS_MARGIN_TRADING: '/api/v1/kr-stocks-margin-trading',
  
  // USA Stocks
  USA_STOCKS: '/api/v1/usa-stocks',
  
  // Themes
  THEMES: '/api/v1/themes',
  
  // Follow-up Stocks
  FOLLOW_UP_STOCKS: '/api/v1/follow-up-stocks',

  // Market Overview & Rising Theme/Stock (국장 상한가 및 급등 분석)
  MARKET_OVERVIEW: '/api/v1/market-overview',
  MARKET_CONDITION: '/api/v1/market-condition',
  RISING_THEME: '/api/v1/rising-theme',
  RISING_STOCK: '/api/v1/rising-stock',

  // Batch Jobs (배치 작업)
  BATCH_JOBS: '/api/v1/batch-jobs',
};

