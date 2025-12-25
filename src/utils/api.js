// API 기본 URL 설정
// 개발 환경: http://localhost:8000
// 프로덕션: Vercel 환경 변수에서 가져옴
const envApiUrl = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL = envApiUrl && envApiUrl.trim() !== '' 
  ? envApiUrl.trim() 
  : 'http://localhost:8000';

// 디버깅용: 환경 변수 로드 확인
if (import.meta.env.DEV) {
  console.log('API_BASE_URL:', API_BASE_URL);
  console.log('VITE_API_BASE_URL env:', import.meta.env.VITE_API_BASE_URL);
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

// 공통 API 엔드포인트
export const API_ENDPOINTS = {
  // Common Code
  COMMON_CODE_MASTERS: '/api/v1/common-code-masters',
  COMMON_CODE_DETAILS: '/api/v1/common-code-details',
  
  // Financial Institutions
  FINANCIAL_INSTITUTIONS: '/api/v1/financial-institutions',
  
  // ETFs
  DOMESTIC_ETFS: '/api/v1/domestic-etfs',
  USA_ETFS: '/api/v1/usa-etfs',
  
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
  
  // Experience Lab
  EXPERIENCE_LAB_STOCKS: '/api/v1/experience-lab-stocks',
};

