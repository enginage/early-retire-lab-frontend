import React, { useState, useEffect } from 'react';
import { getApiUrl, API_ENDPOINTS } from '../utils/api';

const API_BASE_URL = getApiUrl(`${API_ENDPOINTS.USA_ETFS}/selector`);

// 모듈 레벨 캐시: 앱 전체에서 공유되는 미국ETF 목록 캐시
let usaEtfCache = null;
let isLoadingUsaEtfCache = false;
let usaEtfCachePromise = null;

function USAETFSelector({ isOpen, onClose, onSelect }) {
  const [etfs, setEtfs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadETFs();
    }
  }, [isOpen]);

  const loadETFs = async () => {
    // 캐시가 이미 있으면 캐시 사용
    if (usaEtfCache) {
      setEtfs(usaEtfCache);
      return;
    }

    // 이미 로딩 중이면 기존 Promise 대기
    if (isLoadingUsaEtfCache && usaEtfCachePromise) {
      try {
        const data = await usaEtfCachePromise;
        setEtfs(data);
      } catch (err) {
        setError('미국ETF 목록을 불러오는데 실패했습니다.');
      }
      return;
    }

    // 첫 로딩 시
    try {
      setLoading(true);
      isLoadingUsaEtfCache = true;
      setError(null);
      
      // Promise를 캐시하여 동시 요청 방지
      usaEtfCachePromise = fetch(`${API_BASE_URL}?skip=0&limit=10000`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          usaEtfCache = data; // 캐시에 저장
          isLoadingUsaEtfCache = false;
          usaEtfCachePromise = null;
          return data;
        } else {
          isLoadingUsaEtfCache = false;
          usaEtfCachePromise = null;
          throw new Error('미국ETF 목록을 불러오는데 실패했습니다.');
        }
      });

      const data = await usaEtfCachePromise;
      setEtfs(data);
    } catch (err) {
      setError('서버에 연결할 수 없습니다.');
      console.error(err);
      isLoadingUsaEtfCache = false;
      usaEtfCachePromise = null;
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (etf) => {
    onSelect(etf);
    onClose();
  };

  const filteredETFs = etfs.filter(etf =>
    etf.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    etf.ticker.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-wealth-card rounded-xl border border-gray-800 shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white">미국ETF 선택</h2>
          <button
            onClick={onClose}
            className="text-wealth-muted hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 검색 */}
        <div className="p-4 border-b border-gray-800">
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
              {filteredETFs.length === 0 ? (
                <div className="text-center py-8 text-wealth-muted">
                  검색 결과가 없습니다.
                </div>
              ) : (
                filteredETFs.map((etf) => (
                  <button
                    key={etf.id}
                    onClick={() => handleSelect(etf)}
                    className="w-full text-left px-4 py-3 bg-wealth-card/50 hover:bg-wealth-card border border-gray-700 rounded-lg transition-colors"
                  >
                    <div className="font-semibold text-white">{etf.name}</div>
                    <div className="text-sm text-wealth-muted font-mono">{etf.ticker}</div>
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

// 캐시에서 ETF를 찾는 함수 export
export const findUSAETFByCode = (code) => {
  if (!usaEtfCache) return null;
  return usaEtfCache.find(etf => etf.ticker === code || etf.ticker.toLowerCase() === code.toLowerCase());
};

// 캐시를 초기화하는 함수 export (필요시 사용)
export const ensureUSAETFCache = async () => {
  if (usaEtfCache) {
    return usaEtfCache;
  }

  if (isLoadingUsaEtfCache && usaEtfCachePromise) {
    return await usaEtfCachePromise;
  }

  try {
    isLoadingUsaEtfCache = true;
    const apiUrl = getApiUrl(`${API_ENDPOINTS.USA_ETFS}/selector`);
    usaEtfCachePromise = fetch(`${apiUrl}?skip=0&limit=10000`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(async (response) => {
      if (response.ok) {
        const data = await response.json();
        usaEtfCache = data;
        isLoadingUsaEtfCache = false;
        usaEtfCachePromise = null;
        return data;
      } else {
        isLoadingUsaEtfCache = false;
        usaEtfCachePromise = null;
        throw new Error('미국ETF 목록을 불러오는데 실패했습니다.');
      }
    });

    return await usaEtfCachePromise;
  } catch (err) {
    isLoadingUsaEtfCache = false;
    usaEtfCachePromise = null;
    throw err;
  }
};

export default USAETFSelector;

