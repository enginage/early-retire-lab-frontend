/**
 * 공개 허브 페이지 정의 (Introduction·허브·sitemap 공용)
 */
export const PUBLIC_HUBS = [
  {
    seoKey: 'experience-lab',
    navLabel: '실험실',
    hubPath: '/experience-lab',
    intro:
      '조기은퇴(FIRE) 자금 계획과 국내 고배당 ETF 배당 시뮬레이션으로 경제적 자유 달성 경로를 가늠합니다.',
    toolKeys: ['early-retirement', 'domestic-high-dividend'],
  },
  {
    seoKey: 'investment-indicators',
    navLabel: '스크리너',
    hubPath: '/investment-indicators',
    intro:
      '국내·미국 상장 ETF·주식의 RSI, MACD, 등락률 등 기술 지표를 조건별로 검색·비교합니다.',
    toolKeys: ['domestic-etf-indicators', 'kr-market-indicators', 'usa-stock-indicators'],
  },
];

export function getHubBySeoKey(seoKey) {
  return PUBLIC_HUBS.find((hub) => hub.seoKey === seoKey) ?? null;
}

export function getHubByPath(pathname) {
  return PUBLIC_HUBS.find((hub) => hub.hubPath === pathname) ?? null;
}
