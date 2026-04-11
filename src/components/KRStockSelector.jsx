import React, { useState, useEffect } from 'react';
import { getApiUrl, API_ENDPOINTS } from '../utils/api';

const API_BASE_URL = getApiUrl(API_ENDPOINTS.KR_STOCKS);
const THEMES_API = getApiUrl(API_ENDPOINTS.THEMES);

// 모듈 레벨 캐시: 앱 전체에서 공유되는 국내주식 목록 캐시
let krStockCache = null;
let isLoadingKrStockCache = false;
let krStockCachePromise = null;

function KRStockSelector({ isOpen, onClose, onSelect, selectedStockId = null, themeId = null, categoryId = null }) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [marketFilter, setMarketFilter] = useState(''); // 'KOSPI', 'KOSDAQ', or ''

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setMarketFilter('');
      loadStocks();
    }
  }, [isOpen, themeId, categoryId]);

  const loadStocks = async () => {
    try {
      setLoading(true);
      setError(null);

      if (themeId != null) {
        const params = new URLSearchParams();
        if (categoryId != null) params.set('category_id', categoryId);
        const res = await fetch(`${THEMES_API}/${themeId}/stocks?${params.toString()}`);
        if (!res.ok) throw new Error('테마 종목을 불러오는데 실패했습니다.');
        const themeStocks = await res.json();
        const stockList = themeStocks
          .filter((ts) => ts.stock != null)
          .map((ts) => ({ ...ts.stock }));
        setStocks(stockList);
      } else {
        if (krStockCache) {
          setStocks(krStockCache);
          return;
        }
        if (isLoadingKrStockCache && krStockCachePromise) {
          const data = await krStockCachePromise;
          setStocks(data);
          return;
        }
        const data = await ensureKRStockCache();
        setStocks(data);
      }
    } catch (err) {
      setError(err.message || '국내주식 목록을 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (stock) => {
    onSelect(stock);
    onClose();
  };

  const filteredStocks = stocks.filter(stock => {
    const isUseYn = themeId != null ? true : stock.use_yn === true;
    const matchesSearch = 
      stock.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.ticker?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMarket = !marketFilter || stock.market === marketFilter;
    return isUseYn && matchesSearch && matchesMarket;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-wealth-card rounded-xl border border-gray-800 shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white">
            {themeId != null ? '테마 종목 선택' : '국내주식 선택'}
          </h2>
          <button
            onClick={onClose}
            className="text-wealth-muted hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 필터 및 검색 */}
        <div className="p-4 border-b border-gray-800 space-y-3">
          {/* 시장 필터 */}
          <div className="flex gap-2">
            <button
              onClick={() => setMarketFilter('')}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                marketFilter === ''
                  ? 'bg-wealth-gold text-wealth-dark font-medium'
                  : 'bg-wealth-card/50 text-wealth-muted hover:bg-wealth-card hover:text-white'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setMarketFilter('KOSPI')}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                marketFilter === 'KOSPI'
                  ? 'bg-wealth-gold text-wealth-dark font-medium'
                  : 'bg-wealth-card/50 text-wealth-muted hover:bg-wealth-card hover:text-white'
              }`}
            >
              KOSPI
            </button>
            <button
              onClick={() => setMarketFilter('KOSDAQ')}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                marketFilter === 'KOSDAQ'
                  ? 'bg-wealth-gold text-wealth-dark font-medium'
                  : 'bg-wealth-card/50 text-wealth-muted hover:bg-wealth-card hover:text-white'
              }`}
            >
              KOSDAQ
            </button>
          </div>
          
          {/* 검색 */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="종목명 또는 종목코드로 검색..."
            className="w-full px-4 py-2 bg-wealth-card border border-gray-700 rounded-lg text-white placeholder:text-wealth-muted focus:outline-none focus:ring-2 focus:ring-wealth-gold"
          />
        </div>

        {/* 모달 내용 */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400 mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-wealth-muted">로딩 중...</div>
          ) : (
            <div className="space-y-2">
              {filteredStocks.length === 0 ? (
                <div className="text-center py-8 text-wealth-muted">
                  검색 결과가 없습니다.
                </div>
              ) : (
                filteredStocks.map((stock) => (
                  <button
                    key={stock.id}
                    onClick={() => handleSelect(stock)}
                    className={`w-full text-left px-4 py-3 bg-wealth-card/50 hover:bg-wealth-card border rounded-lg transition-colors ${
                      selectedStockId === stock.id
                        ? 'border-wealth-gold bg-wealth-gold/20'
                        : 'border-gray-700'
                    }`}
                  >
                    <div className="font-semibold text-white">{stock.name}</div>
                    <div className="text-sm text-wealth-muted font-mono">
                      {stock.ticker} - {stock.market}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 캐시에서 주식을 찾는 함수 export
export const findKRStockByCode = (code) => {
  if (!krStockCache) return null;
  return krStockCache.find(stock => stock.ticker === code || stock.ticker.toLowerCase() === code.toLowerCase());
};

// 캐시를 초기화하는 함수 export (필요시 사용)
export const ensureKRStockCache = async () => {
  if (krStockCache) {
    return krStockCache;
  }

  if (isLoadingKrStockCache && krStockCachePromise) {
    return await krStockCachePromise;
  }

  try {
    isLoadingKrStockCache = true;
    const apiUrl = getApiUrl(API_ENDPOINTS.KR_STOCKS);
    krStockCachePromise = fetch(`${apiUrl}?skip=0&limit=10000&use_yn=true&suspend_yn=false`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(async (response) => {
      if (response.ok) {
        const data = await response.json();
        krStockCache = data;
        isLoadingKrStockCache = false;
        krStockCachePromise = null;
        return data;
      } else {
        isLoadingKrStockCache = false;
        krStockCachePromise = null;
        throw new Error('국내주식 목록을 불러오는데 실패했습니다.');
      }
    });

    return await krStockCachePromise;
  } catch (err) {
    isLoadingKrStockCache = false;
    krStockCachePromise = null;
    throw err;
  }
};

export default KRStockSelector;
