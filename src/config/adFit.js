import { matchSubmenuActive } from './publicTools';

export const KAKAO_ADFIT_SCRIPT_URL = 'https://t1.kakaocdn.net/kas/static/ba.min.js';

export const KAKAO_ADFIT_BANNERS = {
  top: { unit: 'DAN-LKORzNRKbktNoGGI', width: '728', height: '90' },
  footer: { unit: 'DAN-i9iSu9Gu91iuR4Kw', width: '728', height: '90' },
  sidebar: { unit: 'DAN-0GHNw9y0wHA21yxV', width: '160', height: '600' },
};

export const KAKAO_ADFIT_ONFAIL_CALLBACK_TOP = 'kakaoAdFitBannerOnFailTop';
export const KAKAO_ADFIT_ONFAIL_CALLBACK_FOOTER = 'kakaoAdFitBannerOnFailFooter';
export const KAKAO_ADFIT_ONFAIL_CALLBACK_SIDEBAR = 'kakaoAdFitBannerOnFailSidebar';

/** @typedef {'top' | 'footer' | 'sidebar'} KakaoAdFitSlot */

const SIDEBAR_CONTENT_ADJUST_ROUTES = [
  { path: '/experience-lab?menu=early-retirement' },
  { path: '/experience-lab?menu=domestic-high-dividend' },
  { path: '/domestic-etf-indicators' },
  { path: '/kr-market-indicators' },
  { path: '/usa-stock-indicators' },
];

/** @param {KakaoAdFitSlot} slot */
export function getKakaoAdFitBanner(slot) {
  return KAKAO_ADFIT_BANNERS[slot] ?? KAKAO_ADFIT_BANNERS.top;
}

/** @param {KakaoAdFitSlot} slot */
export function getKakaoAdFitOnFailCallback(slot) {
  if (slot === 'footer') return KAKAO_ADFIT_ONFAIL_CALLBACK_FOOTER;
  if (slot === 'sidebar') return KAKAO_ADFIT_ONFAIL_CALLBACK_SIDEBAR;
  return KAKAO_ADFIT_ONFAIL_CALLBACK_TOP;
}

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

/** public 페이지 전체에서 sidebar 노출 (top/footer와 동일 경로) */
export function shouldShowKakaoAdFitSidebar(pathname) {
  return shouldShowKakaoAdFit(pathname);
}

/** 5개 도구 페이지에서만 콘텐츠 폭 flex 조정 */
export function shouldAdjustContentForSidebar(location) {
  if (import.meta.env.VITE_MENU_MODE !== 'public') return false;
  return SIDEBAR_CONTENT_ADJUST_ROUTES.some((route) => matchSubmenuActive(location, route));
}
