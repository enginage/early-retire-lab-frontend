import React, { useState } from 'react';
import { getApiUrl, API_ENDPOINTS } from '../../utils/api';
import { ensureKRStockCache } from '../../components/KRStockSelector';

const KR_STOCKS_API = getApiUrl(API_ENDPOINTS.KR_STOCKS);

function EnterpriseAnalysis() {
  const [ticker, setTicker] = useState('');
  const [stock, setStock] = useState(null);
  const [businessSummary, setBusinessSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!ticker.trim()) {
      setError('티커를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setStock(null);
    setBusinessSummary('');

    try {
      const allStocks = await ensureKRStockCache();
      const foundStock = allStocks.find(
        (s) => s.ticker === ticker.trim().toUpperCase() || s.ticker === ticker.trim()
      );

      if (!foundStock) {
        setError('해당 티커를 찾을 수 없습니다.');
        setLoading(false);
        return;
      }

      let selectedStock = foundStock;
      const detailResponse = await fetch(`${KR_STOCKS_API}/${selectedStock.id}`);
      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        selectedStock = detailData;
      }

      setStock(selectedStock);
      setBusinessSummary(selectedStock.business_summary || '');
    } catch (err) {
      setError('정보를 불러오는데 실패했습니다: ' + err.message);
      console.error('Error loading stock:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!stock) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${KR_STOCKS_API}/${stock.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_summary: businessSummary.trim() || null,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || '저장에 실패했습니다.');
      }

      const updated = await response.json();
      setStock(updated);
      setBusinessSummary(updated.business_summary || '');
    } catch (err) {
      setError('저장에 실패했습니다: ' + err.message);
      console.error('Error saving business summary:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-wealth-gold to-yellow-200 mb-2">
          기업 분석
        </h1>
        <p className="text-wealth-muted text-sm">티커를 입력하여 종목의 사업요약을 조회·편집하세요.</p>
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
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            {stock.name} ({stock.ticker}) - 사업요약
          </h2>
          <div className="mb-4">
            <textarea
              value={businessSummary}
              onChange={(e) => setBusinessSummary(e.target.value)}
              rows={15}
              className="w-full px-4 py-3 bg-wealth-card border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold whitespace-pre-wrap overflow-y-auto resize-none"
              placeholder="사업요약을 입력하세요"
              style={{ minHeight: '300px' }}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-wealth-gold hover:bg-yellow-500 text-wealth-dark font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      )}
    </div>
  );
}

export default EnterpriseAnalysis;
