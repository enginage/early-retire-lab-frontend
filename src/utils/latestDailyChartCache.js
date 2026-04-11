import { getApiUrl, API_ENDPOINTS } from './api';

/** ticker -> { date, close, fluctuation_rate } */
let latestDailyChartByTicker = null;
let isLoading = false;
let loadPromise = null;

/**
 * 앱 시작 시 호출: API에서 종목별 최신 일봉 캐시를 받아 메모리에 보관.
 * (백엔드는 startup 시 cache/kr_stocks_latest_daily_chart.json 갱신)
 */
export async function ensureLatestDailyChartCache() {
  if (latestDailyChartByTicker) {
    return latestDailyChartByTicker;
  }
  if (isLoading && loadPromise) {
    return loadPromise;
  }

  isLoading = true;
  const url = `${getApiUrl(API_ENDPOINTS.KR_STOCKS)}/latest-daily-chart-cache`;
  loadPromise = fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('최신 일봉 캐시를 불러오는데 실패했습니다.');
      }
      const data = await response.json();
      const by = data?.by_ticker;
      latestDailyChartByTicker = by && typeof by === 'object' ? by : {};
      isLoading = false;
      loadPromise = null;
      return latestDailyChartByTicker;
    })
    .catch((err) => {
      isLoading = false;
      loadPromise = null;
      throw err;
    });

  return loadPromise;
}

export function getLatestDailyChartByTicker() {
  return latestDailyChartByTicker;
}
