# 환경 변수가 적용되지 않는 문제 해결

## 문제: 환경 변수를 설정했는데도 localhost를 호출함

### 원인
Vite는 **빌드 시점**에 환경 변수를 번들에 포함시킵니다. 따라서:
1. 환경 변수를 추가한 후 **반드시 재배포**해야 합니다
2. 환경 변수가 **모든 환경**(Production, Preview, Development)에 설정되어 있어야 합니다

### 해결 방법

#### 1. 환경 변수가 모든 환경에 설정되었는지 확인

Vercel 대시보드에서:
- Settings > Environment Variables
- `VITE_API_BASE_URL` 변수 확인
- **Production, Preview, Development 모두 체크**되어 있는지 확인

#### 2. 재배포 (필수!)

환경 변수를 추가/수정한 후:

**방법 1: 수동 재배포**
1. Deployments 탭으로 이동
2. 최신 배포 선택
3. "..." 메뉴 클릭
4. **"Redeploy"** 선택
5. "Use existing Build Cache" 체크 해제 (선택사항, 확실하게 하려면)

**방법 2: 새 커밋 푸시**
- 아무 변경사항이나 커밋 후 푸시하면 자동 재배포됩니다

#### 3. 빌드 로그 확인

재배포 후:
1. Deployments > 최신 배포 클릭
2. Build Logs 확인
3. 환경 변수가 제대로 로드되었는지 확인

#### 4. 브라우저에서 확인

재배포 후:
1. 브라우저 캐시 완전 삭제 (Ctrl+Shift+Delete)
2. 또는 시크릿 모드로 접속
3. 개발자 도구 > Network 탭
4. API 요청 URL이 백엔드 URL로 가는지 확인

### 디버깅

개발 모드에서만 다음 로그가 출력됩니다:
```javascript
console.log('API_BASE_URL:', API_BASE_URL);
console.log('VITE_API_BASE_URL env:', import.meta.env.VITE_API_BASE_URL);
```

프로덕션에서는 이 로그가 출력되지 않으므로, Network 탭에서 실제 요청 URL을 확인해야 합니다.

### 주의사항

- ⚠️ **Vite 환경 변수는 빌드 시점에 번들에 포함됩니다**
- ⚠️ 환경 변수 변경 후 **반드시 재배포**해야 합니다
- ⚠️ 환경 변수는 **각 환경(Production/Preview/Development)별로 별도 설정**됩니다
- ⚠️ 변수 이름은 반드시 `VITE_`로 시작해야 합니다

