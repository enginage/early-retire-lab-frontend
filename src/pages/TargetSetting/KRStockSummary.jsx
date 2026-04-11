import React, { useState, useEffect } from 'react';
import { getApiUrl, API_ENDPOINTS } from '../../utils/api';
import { ensureKRStockCache } from '../../components/KRStockSelector';

const KR_STOCKS_API = getApiUrl(API_ENDPOINTS.KR_STOCKS);
const KR_STOCKS_MARGIN_TRADING_API = getApiUrl(API_ENDPOINTS.KR_STOCKS_MARGIN_TRADING);
const COMMON_CODE_DETAILS_API = getApiUrl(API_ENDPOINTS.COMMON_CODE_DETAILS);
const THEMES_API = getApiUrl(API_ENDPOINTS.THEMES);
const FOLLOW_UP_STOCKS_API = getApiUrl('/api/v1/follow-up-stocks');
const KR_STOCKS_TRADING_VALUE_API = getApiUrl(API_ENDPOINTS.KR_STOCKS_TRADING_VALUE);
const KR_STOCKS_SHORTING_API = getApiUrl(API_ENDPOINTS.KR_STOCKS_SHORTING);
const KR_STOCKS_DAILY_CHART_API = getApiUrl(API_ENDPOINTS.KR_STOCKS_DAILY_CHART);
const RELATED_STOCKS_API = getApiUrl('/api/v1/related-stocks');

function KRStockSummary() {
  const [ticker, setTicker] = useState('');
  const [stock, setStock] = useState(null);
  const [themes, setThemes] = useState([]);
  const [followUpStocks, setFollowUpStocks] = useState([]);
  const [sameLeaderStocks, setSameLeaderStocks] = useState([]);
  const [leaderStock, setLeaderStock] = useState(null);
  const [industryMap, setIndustryMap] = useState({});
  const [tradingValues, setTradingValues] = useState([]);
  const [shortings, setShortings] = useState([]);
  const [dailyCharts, setDailyCharts] = useState([]);
  const [relatedStocksLatestCharts, setRelatedStocksLatestCharts] = useState({});
  const [relatedStockGroups, setRelatedStockGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [marginTradingLoading, setMarginTradingLoading] = useState(false);
  const [marginTradingMessage, setMarginTradingMessage] = useState(null);

  useEffect(() => {
    loadIndustryTypes();
  }, []);

  const loadIndustryTypes = async () => {
    try {
      const response = await fetch(`${COMMON_CODE_DETAILS_API}?master_id=10&skip=0&limit=10000`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const map = {};
        data.forEach(item => {
          if (item.detail_code && item.detail_code_name) {
            map[item.detail_code] = item.detail_code_name;
          }
        });
        setIndustryMap(map);
      }
    } catch (err) {
      console.error('업종구분 로드 실패:', err);
    }
  };

  const handleSearch = async () => {
    if (!ticker.trim()) {
      setError('티커를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setStock(null);
    setThemes([]);
    setFollowUpStocks([]);
    setSameLeaderStocks([]);
    setLeaderStock(null);
    setTradingValues([]);
    setShortings([]);
    setDailyCharts([]);
    setRelatedStocksLatestCharts({});
    setRelatedStockGroups([]);
    setMarginTradingMessage(null);

    try {
      // 티커로 주식 정보 조회
      const allStocks = await ensureKRStockCache();
      const foundStock = allStocks.find(
        s => s.ticker === ticker.trim().toUpperCase() || s.ticker === ticker.trim()
      );

      if (!foundStock) {
        setError('해당 티커를 찾을 수 없습니다.');
        setLoading(false);
        return;
      }

      let selectedStock = foundStock;

      // 캐시 데이터에 업종코드가 없을 수 있어 최신 데이터로 보강
      if (!selectedStock.kr_industry_type) {
        const detailResponse = await fetch(`${KR_STOCKS_API}/${selectedStock.id}`);
        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          selectedStock = detailData;
        }
      }

      setStock(selectedStock);

      // 최신 투자자별 거래대금 20건 조회
      try {
        const tradingResponse = await fetch(
          `${KR_STOCKS_TRADING_VALUE_API}/stock/${selectedStock.id}/latest?limit=20`
        );
        if (tradingResponse.ok) {
          const tradingData = await tradingResponse.json();
          setTradingValues(tradingData);
        }
      } catch (tradingErr) {
        console.error('투자자별 거래대금 로드 실패:', tradingErr);
      }

      // 최신 공매도 현황 20건 조회
      try {
        const shortingResponse = await fetch(
          `${KR_STOCKS_SHORTING_API}/stock/${selectedStock.id}/latest?limit=20`
        );
        if (shortingResponse.ok) {
          const shortingData = await shortingResponse.json();
          setShortings(shortingData);
        }
      } catch (shortingErr) {
        console.error('공매도 현황 로드 실패:', shortingErr);
      }

      // 최신 일일 차트 데이터 20건 조회 (종가, 등락률, 거래량)
      try {
        const chartResponse = await fetch(
          `${KR_STOCKS_DAILY_CHART_API}/stock/${selectedStock.id}/latest?limit=20`
        );
        if (chartResponse.ok) {
          const chartData = await chartResponse.json();
          setDailyCharts(chartData);
        }
      } catch (chartErr) {
        console.error('일일 차트 데이터 로드 실패:', chartErr);
      }

      // 해당 주식이 속한 테마 조회 (stock_id 중심 - 전체 테마 loop 없이)
      const themesResponse = await fetch(`${THEMES_API}/stock/${foundStock.id}/summary`);
      let stockThemes = [];
      if (themesResponse.ok) {
        const summaryItems = await themesResponse.json();
        stockThemes = summaryItems.map((item) => ({
          id: item.theme_id,
          name: item.theme_name,
          description: item.theme_description,
          currentCategory: item.category_name ? { name: item.category_name } : null,
          stocks: (item.stocks || []).map((s) => ({
            stock: s,
            category_id: item.category_id,
            category: item.category_name ? { name: item.category_name } : null,
          })),
        }));
        setThemes(stockThemes);
      }

      // 관련주 그룹 조회 (동일 group_id 종목)
      let relatedGroups = [];
      try {
        const relatedRes = await fetch(`${RELATED_STOCKS_API}/stock/${foundStock.id}/groups`);
        if (relatedRes.ok) {
          relatedGroups = await relatedRes.json();
          setRelatedStockGroups(relatedGroups);
        }
      } catch (relatedErr) {
        console.error('관련주 그룹 조회 실패:', relatedErr);
      }

      // 연관 종목들의 최신 일봉(종가, 거래량, 등락률) 일괄 조회 (테마 + 관련주)
      const themeIds = stockThemes.flatMap((t) =>
        (t.stocks || [])
          .filter((item) => item.stock && item.stock.id !== foundStock.id)
          .map((item) => item.stock.id)
      );
      const relatedGroupIds = relatedGroups.flatMap((g) =>
        (g.stocks || []).filter((s) => s.id !== foundStock.id).map((s) => s.id)
      );
      const relatedIds = [...new Set([...themeIds, ...relatedGroupIds])];
      if (relatedIds.length > 0) {
        try {
          const idsParam = relatedIds.map((id) => `stock_ids=${id}`).join('&');
          const batchRes = await fetch(`${KR_STOCKS_DAILY_CHART_API}/latest-batch?${idsParam}`);
          if (batchRes.ok) {
            const batchData = await batchRes.json();
            const chartMap = {};
            batchData.forEach((c) => {
              chartMap[c.stock_id] = {
                close: c.close,
                volume: c.volume,
                fluctuation_rate: c.fluctuation_rate,
                date: c.date,
              };
            });
            setRelatedStocksLatestCharts(chartMap);
          }
        } catch (batchErr) {
          console.error('연관 종목 일봉 조회 실패:', batchErr);
        }
      }

      // 대장주인지 확인
      const leaderResponse = await fetch(`${FOLLOW_UP_STOCKS_API}/leader/${foundStock.id}`);
      if (leaderResponse.ok) {
        const leaderData = await leaderResponse.json();
        if (leaderData.length > 0) {
          // 대장주인 경우
          setLeaderStock(foundStock);
          setFollowUpStocks(leaderData.map(item => item.follower_stock));
        } else {
          // 대장주가 아닌 경우, 같은 대장주에 속하는지 확인
          const followerResponse = await fetch(`${FOLLOW_UP_STOCKS_API}/follower/${foundStock.id}`);
          if (followerResponse.ok) {
            const followerData = await followerResponse.json();
            if (followerData.length > 0) {
              // 같은 대장주에 속하는 후속주들 찾기
              const leaderId = followerData[0].leader_stock_id;
              setLeaderStock(followerData[0].leader_stock);
              
              // 같은 대장주의 다른 후속주들 조회
              const sameLeaderResponse = await fetch(`${FOLLOW_UP_STOCKS_API}/leader/${leaderId}`);
              if (sameLeaderResponse.ok) {
                const sameLeaderData = await sameLeaderResponse.json();
                setSameLeaderStocks(
                  sameLeaderData
                    .map(item => item.follower_stock)
                    .filter(s => s.id !== foundStock.id)
                );
              }
            }
          }
        }
      }
    } catch (err) {
      setError('정보를 불러오는데 실패했습니다: ' + err.message);
      console.error('Error loading stock summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleMarginTradingClick = async () => {
    if (!stock?.ticker) return;
    setMarginTradingLoading(true);
    setMarginTradingMessage(null);
    try {
      const res = await fetch(`${KR_STOCKS_MARGIN_TRADING_API}/open-browser/${stock.ticker}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setMarginTradingMessage(json.message || '브라우저를 열었습니다.');
      // 브라우저 자동 종료(25) 후 메시지도 사라지도록
      setTimeout(() => setMarginTradingMessage(null), 31000);
    } catch (err) {
      setMarginTradingMessage(err.message || '브라우저 실행 실패');
    } finally {
      setMarginTradingLoading(false);
    }
  };

  const totalTradingValue = tradingValues.reduce(
    (acc, item) => ({
      institutions: acc.institutions + Number(item.institutions || 0),
      other_corp: acc.other_corp + Number(item.other_corp || 0),
      individual: acc.individual + Number(item.individual || 0),
      foreigners: acc.foreigners + Number(item.foreigners || 0),
    }),
    { institutions: 0, other_corp: 0, individual: 0, foreigners: 0 }
  );

  const getVolumeColor = (value) =>
    value > 0 ? 'text-red-400' : value < 0 ? 'text-blue-400' : 'text-wealth-muted';

  const formatTradingValueBillion = (value) => {
    const numValue = Number(value || 0);
    // -100만원 초과 ~ +100만원 미만이면 "-" 표시
    if (numValue > -1000000 && numValue < 1000000) return '-';
    const absBillion = Math.abs(numValue / 100000000).toFixed(2);
    if (numValue > 0) return `+${absBillion}억`;
    if (numValue < 0) return `-${absBillion}억`;
    return '0.00억';
  };

  const getTradingValueColor = (value) => {
    const numValue = Number(value || 0);
    if (numValue > -1000000 && numValue < 1000000) return 'text-wealth-muted';
    return getVolumeColor(numValue);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-wealth-gold to-yellow-200 mb-2">
          국내 주식 종합
        </h1>
        <p className="text-wealth-muted text-sm">티커를 입력하여 종목 정보를 조회하세요.</p>
      </div>

      {/* 티커 입력 */}
      <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
        <div className="flex gap-4">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="티커 입력 (예: 005930)"
            className="flex-1 px-4 py-3 bg-wealth-card border border-gray-700 rounded-lg text-white text-lg placeholder:text-wealth-muted focus:outline-none focus:ring-2 focus:ring-wealth-gold"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 bg-wealth-gold hover:bg-yellow-500 text-wealth-dark font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '조회 중...' : '조회'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {stock && (
        <div className="space-y-6">
          {/* 기본 정보 카드 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">
              {stock.name} ({stock.ticker})
              {stock.nxt_yn && <span className="text-green-400 text-base ml-2">NXT거래</span>}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-wealth-muted text-sm mb-1">시장구분</p>
                <p className="text-white font-medium">{stock.market}</p>
              </div>
              <div className="flex flex-col md:flex-row md:items-end md:justify-between md:gap-4">
                <div>
                  <p className="text-wealth-muted text-sm mb-1">업종명</p>
                  <p className="text-white font-medium">
                    {industryMap[stock.kr_industry_type] || stock.kr_industry_type || '-'}
                  </p>
                </div>
                <div className="md:text-right">
                  <p className="text-wealth-muted text-sm mb-1">시가총액</p>
                  <p className="text-white font-medium">
                    {stock.market_cap != null
                      ? (() => {
                          const v = Number(stock.market_cap);
                          if (v >= 1e12) {
                            const jo = Math.floor(v / 1e12);
                            const eok = Math.floor((v % 1e12) / 1e8);
                            return `${jo}조 ${eok.toLocaleString()}억`;
                          }
                          return `${(v / 1e8).toFixed(2)}억`;
                        })()
                      : '-'}
                  </p>
                </div>
              </div>
              {stock.business_summary && (
                <div className="md:col-span-2">
                  <p className="text-wealth-muted text-sm mb-1">사업요약</p>
                  <p className="text-white whitespace-pre-wrap">{stock.business_summary}</p>
                </div>
              )}
              {stock.opinion && (
                <div className="md:col-span-2">
                  <p className="text-wealth-muted text-sm mb-1">의견</p>
                  <p className="text-white">{stock.opinion}</p>
                </div>
              )}
              {themes.length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-wealth-muted text-sm mb-1">테마</p>
                  <div className="flex flex-wrap gap-2">
                    {themes.map((theme) => (
                      <span
                        key={`${theme.id}-${theme.currentCategory?.name ?? 'top'}`}
                        className="px-3 py-1 bg-wealth-gold/20 text-wealth-gold border border-wealth-gold rounded-lg text-sm"
                      >
                        {theme.currentCategory 
                          ? `${theme.name} - ${theme.currentCategory.name}` 
                          : theme.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 투자자별 거래대금 (최근 20일) */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-2xl font-bold text-white">투자자별 거래대금 (최근 20일)</h2>
              <button
                type="button"
                onClick={handleMarginTradingClick}
                disabled={marginTradingLoading}
                className="px-4 py-2 bg-wealth-card border border-gray-600 hover:border-wealth-gold text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {marginTradingLoading ? '조회 중...' : '대차거래정보'}
              </button>
            </div>
            {marginTradingMessage && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                marginTradingMessage.includes('실패') || marginTradingMessage.includes('오류')
                  ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                  : 'bg-wealth-gold/20 border border-wealth-gold/50 text-wealth-gold'
              }`}>
                {marginTradingMessage}
              </div>
            )}
            {tradingValues.length === 0 ? (
              <p className="text-wealth-muted">데이터가 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex flex-wrap gap-4 mb-4 text-sm">
                  <div className="text-wealth-muted">
                    20일 합계
                  </div>
                  <div className={getTradingValueColor(totalTradingValue.institutions)}>
                    기관합계 {formatTradingValueBillion(totalTradingValue.institutions)}
                  </div>
                  <div className={getTradingValueColor(totalTradingValue.other_corp)}>
                    기타법인 {formatTradingValueBillion(totalTradingValue.other_corp)}
                  </div>
                  <div className={getTradingValueColor(totalTradingValue.individual)}>
                    개인 {formatTradingValueBillion(totalTradingValue.individual)}
                  </div>
                  <div className={getTradingValueColor(totalTradingValue.foreigners)}>
                    외국인합계 {formatTradingValueBillion(totalTradingValue.foreigners)}
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 px-3 text-left text-wealth-muted whitespace-nowrap">날짜</th>
                      <th className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap">종가</th>
                      <th className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap">공매도수량(주)</th>
                      <th className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap">공매도잔고(주)</th>
                      <th className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap">등락률</th>
                      <th className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap">거래량(주)</th>
                      <th className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap">거래대금(원)</th>
                      <th className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap">기관합계(원)</th>
                      <th className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap">기타법인(원)</th>
                      <th className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap">개인(원)</th>
                      <th className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap">외국인합계(원)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tradingValues.map((item) => {
                      const chartByDate = dailyCharts.find((c) => c.date === item.date);
                      const shortingByDate = shortings.find((s) => s.date === item.date);
                      return (
                      <tr key={`${item.stock_id}-${item.date}`} className="border-b border-gray-800/50">
                        <td className="py-2 px-3 text-white whitespace-nowrap">{item.date}</td>
                        <td className="py-2 px-3 text-right text-white whitespace-nowrap">
                          {chartByDate?.close != null ? Number(chartByDate.close).toLocaleString() : '-'}
                        </td>
                        <td className="py-2 px-3 text-right text-white whitespace-nowrap">
                          {shortingByDate?.short_volume != null ? Number(shortingByDate.short_volume).toLocaleString() : '-'}
                        </td>
                        <td className="py-2 px-3 text-right text-white whitespace-nowrap">
                          {shortingByDate?.short_balance != null ? Number(shortingByDate.short_balance).toLocaleString() : '-'}
                        </td>
                        <td className={`py-2 px-3 text-right whitespace-nowrap ${
                          chartByDate?.fluctuation_rate == null ? 'text-wealth-muted' : getVolumeColor(Number(chartByDate.fluctuation_rate))
                        }`}>
                          {chartByDate?.fluctuation_rate != null
                            ? `${Number(chartByDate.fluctuation_rate) >= 0 ? '+' : ''}${Number(chartByDate.fluctuation_rate).toFixed(2)}%`
                            : '-'}
                        </td>
                        <td className={`py-2 px-3 text-right whitespace-nowrap ${
                          chartByDate?.volume == null ? 'text-wealth-muted' : 'text-white'
                        }`}>
                          {chartByDate?.volume != null ? Number(chartByDate.volume).toLocaleString() : '-'}
                        </td>
                        <td className={`py-2 px-3 text-right whitespace-nowrap ${
                          (() => {
                            if (chartByDate?.low == null || chartByDate?.high == null || chartByDate?.volume == null) return 'text-white';
                            const low = Number(chartByDate.low);
                            const high = Number(chartByDate.high);
                            const vol = Number(chartByDate.volume);
                            const amountBillion = ((low + high) / 2) * vol / 100000000;
                            if (amountBillion >= 500) return 'text-orange-400 font-bold';
                            if (amountBillion >= 150) return 'text-pink-400 font-bold';
                            return 'text-white';
                          })()
                        }`}>
                          {chartByDate?.low != null && chartByDate?.high != null && chartByDate?.volume != null
                            ? (() => {
                                const low = Number(chartByDate.low);
                                const high = Number(chartByDate.high);
                                const vol = Number(chartByDate.volume);
                                const amount = ((low + high) / 2) * vol;
                                return `${(amount / 100000000).toFixed(2)}억`;
                              })()
                            : '-'}
                        </td>
                        <td className={`py-2 px-3 text-right whitespace-nowrap ${getTradingValueColor(item.institutions)}`}>
                          {formatTradingValueBillion(item.institutions)}
                        </td>
                        <td className={`py-2 px-3 text-right whitespace-nowrap ${getTradingValueColor(item.other_corp)}`}>
                          {formatTradingValueBillion(item.other_corp)}
                        </td>
                        <td className={`py-2 px-3 text-right whitespace-nowrap ${getTradingValueColor(item.individual)}`}>
                          {formatTradingValueBillion(item.individual)}
                        </td>
                        <td className={`py-2 px-3 text-right whitespace-nowrap ${getTradingValueColor(item.foreigners)}`}>
                          {formatTradingValueBillion(item.foreigners)}
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 관련주 정보 카드 */}
          {relatedStockGroups.length > 0 && (
            <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">관련주</h2>
              <div className="space-y-4">
                {relatedStockGroups.map((group) => {
                  const displayStocks = (group.stocks || []).filter((s) => s.id !== stock.id);
                  if (displayStocks.length === 0) return null;
                  return (
                    <div key={group.group_id} className="bg-wealth-card/30 rounded-lg p-4 border border-gray-700">
                      <h3 className="text-lg font-semibold text-wealth-gold mb-2">{group.group_name}</h3>
                      <p className="text-wealth-muted text-sm mb-2">
                        연관 종목 ({displayStocks.length}개)
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        {displayStocks.map((s, index) => {
                          const latestChart = relatedStocksLatestCharts[s.id];
                          return (
                            <div
                              key={`related-${group.group_id}-${s.id}-${index}`}
                              className="bg-wealth-card/30 rounded-lg p-4 border border-gray-700"
                            >
                              <p className="text-white font-medium">{s.name}</p>
                              <p className="text-wealth-muted text-sm flex justify-between items-center">
                                <span>{s.ticker} - {s.market}</span>
                                {s.nxt_yn && <span className="text-green-400 text-xs">NXT거래</span>}
                              </p>
                              {latestChart && (
                                <div className="mt-2 text-xs space-y-0.5">
                                  <p className="text-white">
                                    종가 {latestChart.close != null ? Number(latestChart.close).toLocaleString() : '-'}
                                  </p>
                                  <p className="text-wealth-muted">
                                    거래량 {latestChart.volume != null ? Number(latestChart.volume).toLocaleString() : '-'}
                                  </p>
                                  <p className={latestChart.fluctuation_rate != null ? getVolumeColor(Number(latestChart.fluctuation_rate)) : 'text-wealth-muted'}>
                                    등락률 {latestChart.fluctuation_rate != null
                                      ? `${Number(latestChart.fluctuation_rate) >= 0 ? '+' : ''}${Number(latestChart.fluctuation_rate).toFixed(2)}%`
                                      : '-'}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 테마 정보 카드 */}
          {themes.length > 0 && (
            <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">동일 테마</h2>
              <div className="space-y-4">
                {themes.map((theme) => (
                  <div key={`${theme.id}-${theme.currentCategory?.name ?? 'top'}`} className="bg-wealth-card/30 rounded-lg p-4 border border-gray-700">
                    <h3 className="text-lg font-semibold text-wealth-gold mb-2">
                      {theme.currentCategory ? `${theme.name} - ${theme.currentCategory.name}` : theme.name}
                    </h3>
                    {theme.stocks && theme.stocks.filter((item) => item.stock && item.stock.id !== stock.id).length > 0 && (
                      <div>
                        <p className="text-wealth-muted text-sm mb-2">
                          연관 종목 ({theme.stocks.filter((item) => item.stock && item.stock.id !== stock.id).length}개)
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                          {theme.stocks
                            .filter((item) => item.stock && item.stock.id !== stock.id)
                            .map((item, index) => {
                              const s = item.stock;
                              const latestChart = relatedStocksLatestCharts[s.id];
                              return (
                                <div
                                  key={`${theme.id}-${s.id}-${index}`}
                                  className="bg-wealth-card/30 rounded-lg p-4 border border-gray-700"
                                >
                                  <p className="text-white font-medium">{s.name}</p>
                                  <p className="text-wealth-muted text-sm flex justify-between items-center">
                                    <span>{s.ticker} - {s.market}</span>
                                    {s.nxt_yn && <span className="text-green-400 text-xs">NXT거래</span>}
                                  </p>
                                  {latestChart && (
                                    <div className="mt-2 text-xs space-y-0.5">
                                      <p className="text-white">
                                        종가 {latestChart.close != null ? Number(latestChart.close).toLocaleString() : '-'}
                                      </p>
                                      <p className="text-wealth-muted">
                                        거래량 {latestChart.volume != null ? Number(latestChart.volume).toLocaleString() : '-'}
                                      </p>
                                      <p className={latestChart.fluctuation_rate != null ? getVolumeColor(Number(latestChart.fluctuation_rate)) : 'text-wealth-muted'}>
                                        등락률 {latestChart.fluctuation_rate != null
                                          ? `${Number(latestChart.fluctuation_rate) >= 0 ? '+' : ''}${Number(latestChart.fluctuation_rate).toFixed(2)}%`
                                          : '-'}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 후속주 정보 카드 */}
          {leaderStock && leaderStock.id === stock.id && followUpStocks.length > 0 && (
            <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                대장주 - 후속주 목록 ({followUpStocks.length}개)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {followUpStocks.map((s, index) => (
                  <div
                    key={`followup-${s.id}-${index}`}
                    className="bg-wealth-card/30 rounded-lg p-4 border border-gray-700"
                  >
                    <p className="text-white font-medium">{s.name}</p>
                    <p className="text-wealth-muted text-sm flex justify-between items-center">
                      <span>{s.ticker} - {s.market}</span>
                      {s.nxt_yn && <span className="text-green-400 text-xs">NXT거래</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 같은 대장주에 속하는 후속주 카드 */}
          {leaderStock && leaderStock.id !== stock.id && sameLeaderStocks.length > 0 && (
            <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                같은 대장주에 속하는 후속주 ({sameLeaderStocks.length}개)
              </h2>
              <div className="mb-4 p-4 bg-wealth-card/30 rounded-lg border border-gray-700">
                <p className="text-wealth-muted text-sm mb-1">대장주</p>
                <p className="text-wealth-gold font-medium text-lg">
                  {leaderStock.name} ({leaderStock.ticker})
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sameLeaderStocks.map((s, index) => (
                  <div
                    key={`sameleader-${s.id}-${index}`}
                    className="bg-wealth-card/30 rounded-lg p-4 border border-gray-700"
                  >
                    <p className="text-white font-medium">{s.name}</p>
                    <p className="text-wealth-muted text-sm flex justify-between items-center">
                      <span>{s.ticker} - {s.market}</span>
                      {s.nxt_yn && <span className="text-green-400 text-xs">NXT거래</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 정보가 없는 경우 */}
          {themes.length === 0 && relatedStockGroups.length === 0 && !leaderStock && (
            <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
              <p className="text-wealth-muted text-center py-8">
                등록된 테마, 관련주, 후속주 정보가 없습니다.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default KRStockSummary;
