# 환경 변수 마이그레이션 가이드

이 문서는 하드코딩된 API URL을 환경 변수로 변경하는 방법을 설명합니다.

## 변경 패턴

### 이전 코드
```javascript
const API_BASE_URL = 'http://localhost:8000/api/v1/endpoint';
```

### 변경 후 코드
```javascript
import { getApiUrl, API_ENDPOINTS } from '../utils/api';

const API_BASE_URL = getApiUrl(API_ENDPOINTS.ENDPOINT_NAME);
```

## 변경이 필요한 파일들

다음 파일들을 위 패턴에 따라 수정해야 합니다:

1. `src/pages/TargetSetting/EarlyRetirementInitialSetting.jsx`
   - `API_BASE_URL` → `getApiUrl(API_ENDPOINTS.EARLY_RETIREMENT_INITIAL_SETTING)`
   - `EXPENSE_API_BASE_URL` → `getApiUrl(API_ENDPOINTS.EXPENSES)`

2. `src/pages/Settings/ExperienceLabSettings.jsx`
   - `MASTER_API_BASE_URL` → `getApiUrl(API_ENDPOINTS.COMMON_CODE_MASTERS)`
   - `DETAIL_API_BASE_URL` → `getApiUrl(API_ENDPOINTS.COMMON_CODE_DETAILS)`
   - `EXPERIENCE_LAB_STOCKS_API_BASE_URL` → `getApiUrl(API_ENDPOINTS.EXPERIENCE_LAB_STOCKS)`
   - `DOMESTIC_ETF_API_BASE_URL` → `getApiUrl(API_ENDPOINTS.DOMESTIC_ETFS)`
   - `USA_ETF_API_BASE_URL` → `getApiUrl(API_ENDPOINTS.USA_ETFS)`

3. `src/components/USAETFSelector.jsx`
   - `API_BASE_URL` → `getApiUrl(API_ENDPOINTS.USA_ETFS)`

4. `src/components/DomesticETFSelector.jsx`
   - `API_BASE_URL` → `getApiUrl(API_ENDPOINTS.DOMESTIC_ETFS)`

5. `src/pages/Settings/CommonCode.jsx`
   - `MASTER_API_BASE_URL` → `getApiUrl(API_ENDPOINTS.COMMON_CODE_MASTERS)`
   - `DETAIL_API_BASE_URL` → `getApiUrl(API_ENDPOINTS.COMMON_CODE_DETAILS)`

6. `src/pages/Settings/DomesticETF.jsx`
   - `API_BASE_URL` → `getApiUrl(API_ENDPOINTS.DOMESTIC_ETFS)`

7. `src/pages/Settings/USAETF.jsx`
   - `API_BASE_URL` → `getApiUrl(API_ENDPOINTS.USA_ETFS)`

## 환경 변수 설정

### 로컬 개발

`.env.local` 파일 생성:
```env
VITE_API_BASE_URL=http://localhost:8000
```

### Vercel 배포

Vercel 대시보드 > Settings > Environment Variables에서:
- Key: `VITE_API_BASE_URL`
- Value: `https://your-backend-project.vercel.app`

