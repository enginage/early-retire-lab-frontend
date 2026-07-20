export const KAKAO_ADFIT_SCRIPT_URL = 'https://t1.kakaocdn.net/kas/static/ba.min.js';

export const KAKAO_ADFIT_BANNER = {
  unit: 'DAN-LKORzNRKbktNoGGI',
  width: '728',
  height: '90',
};

export const KAKAO_ADFIT_ONFAIL_CALLBACK = 'kakaoAdFitBannerOnFail';

/** public 모드에서 AdFit 배너를 노출할 경로 */
export const PUBLIC_AD_PATHS = new Set([
  '/',
  '/experience-lab',
  '/investment-indicators',
  '/domestic-etf-indicators',
  '/kr-market-indicators',
  '/usa-stock-indicators',
  '/privacy',
]);

export function shouldShowKakaoAdFit(pathname) {
  if (import.meta.env.VITE_MENU_MODE !== 'public') return false;
  return PUBLIC_AD_PATHS.has(pathname);
}
