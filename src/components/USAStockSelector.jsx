import React, { useState, useEffect } from 'react';
import { getApiUrl, API_ENDPOINTS } from '../utils/api';

const API_BASE_URL = getApiUrl(`${API_ENDPOINTS.USA_STOCKS}/selector`);

let usaStockCache = null;
let isLoadingUsaStockCache = false;
let usaStockCachePromise = null;

function USAStockSelector({ isOpen, onClose, onSelect }) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [marketFilter, setMarketFilter] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setMarketFilter('');
      loadStocks();
    }
  }, [isOpen]);

  const loadStocks = async () => {
    if (usaStockCache) {
      setStocks(usaStockCache);
      return;
    }

    if (isLoadingUsaStockCache && usaStockCachePromise) {
      try {
        const data = await usaStockCachePromise;
        setStocks(data);
      } catch (err) {
        setError('미장주식 목록을 불러오는데 실패했습니다.');
      }
      return;
    }

    try {
      setLoading(true);
      isLoadingUsaStockCache = true;
      setError(null);

      usaStockCachePromise = fetch(`${API_BASE_URL}?skip=0&limit=10000`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          usaStockCache = data;
          isLoadingUsaStockCache = false;
          usaStockCachePromise = null;
          return data;
        }
        isLoadingUsaStockCache = false;
        usaStockCachePromise = null;
        throw new Error('미장주식 목록을 불러오는데 실패했습니다.');
      });

      const data = await usaStockCachePromise;
      setStocks(data);
    } catch (err) {
      setError('서버에 연결할 수 없습니다.');
      console.error(err);
      isLoadingUsaStockCache = false;
      usaStockCachePromise = null;
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (stock) => {
    onSelect(stock);
    onClose();
  };

  const filteredStocks = stocks.filter((stock) => {
    if (marketFilter && stock.market !== marketFilter) return false;
    const term = searchTerm.toLowerCase();
    return (
      stock.name.toLowerCase().includes(term) ||
      stock.ticker.toLowerCase().includes(term)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-wealth-card rounded-xl border border-gray-800 shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white">미장주식 선택</h2>
          <button
            onClick={onClose}
            className="text-wealth-muted hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 border-b border-gray-800 space-y-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="종목명 또는 티커로 검색..."
            className="w-full px-4 py-2 bg-wealth-card border border-gray-700 rounded-lg text-white placeholder:text-wealth-muted focus:outline-none focus:ring-2 focus:ring-wealth-gold"
          />
          <div className="flex gap-2">
            {['', 'NYSE', 'NASDAQ'].map((market) => (
              <button
                key={market || 'all'}
                type="button"
                onClick={() => setMarketFilter(market)}
                className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                  marketFilter === market
                    ? 'bg-wealth-gold/20 border-wealth-gold text-wealth-gold'
                    : 'bg-wealth-card border-gray-700 text-wealth-muted hover:border-gray-500'
                }`}
              >
                {market || '전체'}
              </button>
            ))}
          </div>
        </div>

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
                    className="w-full text-left px-4 py-3 bg-wealth-card/50 hover:bg-wealth-card border border-gray-700 rounded-lg transition-colors"
                  >
                    <div className="font-semibold text-white">{stock.name}</div>
                    <div className="text-sm text-wealth-muted font-mono">
                      {stock.ticker}
                      <span className="ml-2 text-xs">{stock.market}</span>
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

export const findUSAStockByTicker = (ticker) => {
  if (!usaStockCache) return null;
  return usaStockCache.find(
    (stock) =>
      stock.ticker === ticker ||
      stock.ticker.toLowerCase() === ticker.toLowerCase()
  );
};

export const ensureUSAStockCache = async () => {
  if (usaStockCache) {
    return usaStockCache;
  }

  if (isLoadingUsaStockCache && usaStockCachePromise) {
    return await usaStockCachePromise;
  }

  try {
    isLoadingUsaStockCache = true;
    const apiUrl = getApiUrl(`${API_ENDPOINTS.USA_STOCKS}/selector`);
    usaStockCachePromise = fetch(`${apiUrl}?skip=0&limit=10000`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(async (response) => {
      if (response.ok) {
        const data = await response.json();
        usaStockCache = data;
        isLoadingUsaStockCache = false;
        usaStockCachePromise = null;
        return data;
      }
      isLoadingUsaStockCache = false;
      usaStockCachePromise = null;
      throw new Error('미장주식 목록을 불러오는데 실패했습니다.');
    });

    return await usaStockCachePromise;
  } catch (err) {
    isLoadingUsaStockCache = false;
    usaStockCachePromise = null;
    throw err;
  }
};

export default USAStockSelector;
