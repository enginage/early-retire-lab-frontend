import React, { useState, useEffect } from 'react';
import { getApiUrl, API_ENDPOINTS } from '../../utils/api';
import ThemeCategorySelector from '../../components/ThemeCategorySelector';
import KRStockSelector from '../../components/KRStockSelector';
import DataGrid from '../../components/DataGrid';

const MARKET_OVERVIEW_API = getApiUrl(API_ENDPOINTS.MARKET_OVERVIEW);
const RISING_THEME_API = getApiUrl(API_ENDPOINTS.RISING_THEME);
const RISING_STOCK_API = getApiUrl(API_ENDPOINTS.RISING_STOCK);

function LimitUpSurgeAnalysis() {
  const [marketOverviews, setMarketOverviews] = useState([]);
  const [risingThemes, setRisingThemes] = useState({});
  const [risingStocks, setRisingStocks] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedOverviewId, setSelectedOverviewId] = useState(null);
  const [selectedThemeId, setSelectedThemeId] = useState(null);

  const [overviewForm, setOverviewForm] = useState({ trading_date: '', market_info: '' });
  const [themeForm, setThemeForm] = useState({ theme_id: null, category_id: null, theme_info: '', theme: null, category: null });
  const [stockForm, setStockForm] = useState({ stock_id: null, capital_order: 0, remark: '', is_surge_limit: false, stock: null });

  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [editingOverviewId, setEditingOverviewId] = useState(null);
  const [editingThemeId, setEditingThemeId] = useState(null);
  const [editingStockId, setEditingStockId] = useState(null);

  useEffect(() => {
    loadMarketOverviews();
  }, []);

  useEffect(() => {
    if (selectedOverviewId) {
      loadRisingThemes(selectedOverviewId);
    } else {
      setRisingThemes({});
    }
    setSelectedThemeId(null);
  }, [selectedOverviewId]);

  useEffect(() => {
    if (selectedThemeId) {
      loadRisingStocks(selectedThemeId);
    } else {
      setRisingStocks({});
    }
  }, [selectedThemeId]);

  const loadMarketOverviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${MARKET_OVERVIEW_API}?skip=0&limit=100`);
      if (!res.ok) throw new Error('종합시황을 불러오는데 실패했습니다.');
      const data = await res.json();
      setMarketOverviews(data);
      if (data.length > 0 && !selectedOverviewId) {
        setSelectedOverviewId(data[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRisingThemes = async (overviewId) => {
    try {
      const res = await fetch(`${RISING_THEME_API}/by-overview/${overviewId}`);
      if (!res.ok) return setRisingThemes(prev => ({ ...prev, [overviewId]: [] }));
      const data = await res.json();
      setRisingThemes(prev => ({ ...prev, [overviewId]: data }));
    } catch {
      setRisingThemes(prev => ({ ...prev, [overviewId]: [] }));
    }
  };

  const loadRisingStocks = async (themeId) => {
    try {
      const res = await fetch(`${RISING_STOCK_API}/by-theme/${themeId}`);
      if (!res.ok) return setRisingStocks(prev => ({ ...prev, [themeId]: [] }));
      const data = await res.json();
      setRisingStocks(prev => ({ ...prev, [themeId]: data }));
    } catch {
      setRisingStocks(prev => ({ ...prev, [themeId]: [] }));
    }
  };

  const handleSaveOverview = async () => {
    if (!overviewForm.trading_date) {
      setError('거래일을 입력해주세요.');
      return;
    }
    try {
      setError(null);
      const isNew = editingOverviewId === 'new' || editingOverviewId === null;
      const res = isNew
        ? await fetch(MARKET_OVERVIEW_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(overviewForm),
          })
        : await fetch(`${MARKET_OVERVIEW_API}/${editingOverviewId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(overviewForm),
          });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`저장 실패: ${res.status} ${errText}`);
      }
      setOverviewForm({ trading_date: '', market_info: '' });
      setEditingOverviewId(null);
      await loadMarketOverviews();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveTheme = async () => {
    if (!selectedOverviewId) {
      setError('종합시황을 먼저 선택해주세요.');
      return;
    }
    if (!themeForm.theme_id) {
      setError('테마를 선택해주세요.');
      return;
    }
    try {
      setError(null);
      const payload = {
        market_overview_id: selectedOverviewId,
        theme_id: themeForm.theme_id,
        category_id: themeForm.category_id || null,
        theme_info: themeForm.theme_info || null,
      };
      const isNew = editingThemeId === 'new' || editingThemeId === null;
      const res = isNew
        ? await fetch(RISING_THEME_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`${RISING_THEME_API}/${editingThemeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`저장 실패: ${res.status} ${errText}`);
      }
      setThemeForm({ theme_id: null, category_id: null, theme_info: '', theme: null, category: null });
      setEditingThemeId(null);
      setIsThemeModalOpen(false);
      await loadRisingThemes(selectedOverviewId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveStock = async () => {
    if (!selectedThemeId) {
      setError('상승테마를 먼저 선택해주세요.');
      return;
    }
    if (!stockForm.stock_id) {
      setError('종목을 선택해주세요.');
      return;
    }
    try {
      setError(null);
      const payload = {
        rising_theme_id: selectedThemeId,
        stock_id: stockForm.stock_id,
        capital_order: Number(stockForm.capital_order) || 0,
        remark: stockForm.remark || null,
        is_surge_limit: stockForm.is_surge_limit ?? false,
      };
      const isNew = editingStockId === 'new' || editingStockId === null;
      const res = isNew
        ? await fetch(RISING_STOCK_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`${RISING_STOCK_API}/${editingStockId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`저장 실패: ${res.status} ${errText}`);
      }
      setStockForm({ stock_id: null, capital_order: 0, remark: '', is_surge_limit: false, stock: null });
      setEditingStockId(null);
      setIsStockModalOpen(false);
      await loadRisingStocks(selectedThemeId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleThemeSelect = (selection) => {
    setThemeForm(prev => ({
      ...prev,
      theme_id: selection.theme_id,
      category_id: selection.category_id,
      theme: selection.theme,
      category: selection.category,
    }));
  };

  const handleStockSelect = (stock) => {
    setStockForm(prev => ({ ...prev, stock_id: stock.id, stock }));
  };

  const themes = risingThemes[selectedOverviewId] || [];
  const stocks = risingStocks[selectedThemeId] || [];

  const themeDisplay = (t) => {
    if (t.category) return `${t.theme?.name || '-'} - ${t.category.name}`;
    return t.theme?.name || '-';
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-wealth-gold to-yellow-200 mb-2">
          국장 상한가 및 급등 분석
        </h1>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">{error}</div>
      )}

      {/* 1. 종합시황 */}
      <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">1. 종합시황</h2>
        <div className="flex justify-end mb-4">
          <button
            onClick={() => {
              if (editingOverviewId !== null) return;
              setOverviewForm({ trading_date: '', market_info: '' });
              setEditingOverviewId('new');
            }}
            disabled={editingOverviewId !== null}
            className="px-4 py-2 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            추가
          </button>
        </div>
        <DataGrid
          columns={[
            { key: 'trading_date', label: '거래일', align: 'left', width: '120px', nowrap: true },
            { key: 'market_info', label: '시황정보', align: 'left', width: 'auto', nowrap: false },
          ]}
          data={marketOverviews}
          editingId={editingOverviewId}
          selectedId={selectedOverviewId}
          onRowClick={(id) => setSelectedOverviewId(id)}
          onEdit={(id) => {
            const o = marketOverviews.find((x) => x.id === id);
            if (o) {
              setOverviewForm({ trading_date: o.trading_date || '', market_info: o.market_info || '' });
              setEditingOverviewId(id);
            }
          }}
          onDelete={async (id) => {
            if (confirm('삭제하시겠습니까?')) {
              await fetch(`${MARKET_OVERVIEW_API}/${id}`, { method: 'DELETE' });
              if (selectedOverviewId === id) setSelectedOverviewId(null);
              await loadMarketOverviews();
            }
          }}
          onSave={async () => { await handleSaveOverview(); }}
          onCancel={() => { setEditingOverviewId(null); setOverviewForm({ trading_date: '', market_info: '' }); }}
          loading={loading}
          showRowNumber={true}
          showActions={true}
          renderNewRow={() => (
            <>
              <td className="py-3 px-4 border-r border-gray-700/50">
                <input
                  type="date"
                  value={overviewForm.trading_date}
                  onChange={(e) => setOverviewForm(prev => ({ ...prev, trading_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                />
              </td>
              <td className="py-3 px-4 align-top">
                <textarea
                  value={overviewForm.market_info}
                  onChange={(e) => setOverviewForm(prev => ({ ...prev, market_info: e.target.value }))}
                  placeholder="시황 정보를 입력하세요"
                  rows={4}
                  className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold resize-y min-h-[80px]"
                />
              </td>
            </>
          )}
          renderEditRow={(row) => (
            <>
              <td className="py-3 px-4 border-r border-gray-700/50">
                <input
                  type="date"
                  value={overviewForm.trading_date}
                  onChange={(e) => setOverviewForm(prev => ({ ...prev, trading_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                />
              </td>
              <td className="py-3 px-4 align-top">
                <textarea
                  value={overviewForm.market_info}
                  onChange={(e) => setOverviewForm(prev => ({ ...prev, market_info: e.target.value }))}
                  placeholder="시황 정보를 입력하세요"
                  rows={4}
                  className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold resize-y min-h-[80px]"
                />
              </td>
            </>
          )}
          renderViewRow={(row) => (
            <>
              <td className="py-3 px-4 text-white text-sm whitespace-nowrap border-r border-gray-700/50">{row.trading_date || '-'}</td>
              <td className="py-3 px-4 text-white text-sm break-words whitespace-pre-wrap">{row.market_info || '-'}</td>
            </>
          )}
          emptyMessage="등록된 데이터가 없습니다."
        />
      </div>

      {/* 2. 상승테마 */}
      <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">2. 상승테마</h2>
        {!selectedOverviewId ? (
          <p className="text-wealth-muted">종합시황을 먼저 선택해주세요.</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-medium">
                선택된 거래일: <span className="text-wealth-gold">{marketOverviews.find((o) => o.id === selectedOverviewId)?.trading_date ?? '-'}</span>
              </p>
              <button
                onClick={() => {
                  if (editingThemeId !== null) return;
                  setThemeForm({ theme_id: null, category_id: null, theme_info: '', theme: null, category: null });
                  setEditingThemeId('new');
                }}
                disabled={editingThemeId !== null}
                className="px-4 py-2 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                추가
              </button>
            </div>
            <DataGrid
              columns={[
                { key: 'theme_display', label: '테마 · 카테고리', align: 'left', width: '240px', nowrap: false },
                { key: 'theme_info', label: '테마시황', align: 'left', width: 'auto', nowrap: false },
              ]}
              data={themes}
              editingId={editingThemeId}
              selectedId={selectedThemeId}
              onRowClick={(id) => setSelectedThemeId(id)}
              onEdit={(id) => {
                const t = themes.find((x) => x.id === id);
                if (t) {
                  setThemeForm({
                    theme_id: t.theme_id,
                    category_id: t.category_id ?? null,
                    theme_info: t.theme_info || '',
                    theme: t.theme || null,
                    category: t.category || null,
                  });
                  setEditingThemeId(id);
                }
              }}
              onDelete={async (id) => {
                if (confirm('삭제하시겠습니까?')) {
                  await fetch(`${RISING_THEME_API}/${id}`, { method: 'DELETE' });
                  if (selectedThemeId === id) setSelectedThemeId(null);
                  await loadRisingThemes(selectedOverviewId);
                }
              }}
              onSave={async () => { await handleSaveTheme(); }}
              onCancel={() => {
                setEditingThemeId(null);
                setThemeForm({ theme_id: null, category_id: null, theme_info: '', theme: null, category: null });
                setIsThemeModalOpen(false);
              }}
              loading={false}
              showRowNumber={true}
              showActions={true}
              renderNewRow={() => (
                <>
                  <td className="py-3 px-4 border-r border-gray-700/50">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setIsThemeModalOpen(true); }}
                      className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-left text-white text-sm hover:border-wealth-gold focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    >
                      {themeForm.theme_id
                        ? (themeForm.category ? `${themeForm.theme?.name || '-'} - ${themeForm.category.name}` : themeForm.theme?.name || '선택됨')
                        : '테마 선택'}
                    </button>
                  </td>
                  <td className="py-3 px-4 align-top">
                    <textarea
                      value={themeForm.theme_info}
                      onChange={(e) => setThemeForm(prev => ({ ...prev, theme_info: e.target.value }))}
                      placeholder="테마 시황"
                      rows={4}
                      className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold resize-y min-h-[80px]"
                    />
                  </td>
                </>
              )}
              renderEditRow={(row) => (
                <>
                  <td className="py-3 px-4 border-r border-gray-700/50">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setIsThemeModalOpen(true); }}
                      className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-left text-white text-sm hover:border-wealth-gold focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    >
                      {themeForm.theme_id
                        ? (themeForm.category ? `${themeForm.theme?.name || '-'} - ${themeForm.category.name}` : themeForm.theme?.name || '선택됨')
                        : '테마 선택'}
                    </button>
                  </td>
                  <td className="py-3 px-4 align-top">
                    <textarea
                      value={themeForm.theme_info}
                      onChange={(e) => setThemeForm(prev => ({ ...prev, theme_info: e.target.value }))}
                      placeholder="테마 시황"
                      rows={4}
                      className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold resize-y min-h-[80px]"
                    />
                  </td>
                </>
              )}
              renderViewRow={(row) => (
                <>
                  <td className="py-3 px-4 text-white text-sm border-r border-gray-700/50">{themeDisplay(row)}</td>
                  <td className="py-3 px-4 text-white text-sm break-words whitespace-pre-wrap">{row.theme_info || '-'}</td>
                </>
              )}
              emptyMessage="등록된 상승테마가 없습니다."
            />
          </>
        )}
      </div>

      {/* 3. 상승종목 */}
      <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">3. 상승종목</h2>
        {selectedThemeId && (
          <p className="text-wealth-muted text-sm mb-2">
            선택된 테마: {themeDisplay(themes.find((t) => t.id === selectedThemeId) || {})}
          </p>
        )}
        {!selectedThemeId ? (
          <p className="text-wealth-muted">상승테마 그리드에서 행을 클릭하여 선택해주세요.</p>
        ) : (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  if (editingStockId !== null) return;
                  setStockForm({ stock_id: null, capital_order: 0, remark: '', is_surge_limit: false, stock: null });
                  setEditingStockId('new');
                }}
                disabled={editingStockId !== null}
                className="px-4 py-2 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                추가
              </button>
            </div>
            <DataGrid
              columns={[
                { key: 'stock_display', label: '종목', align: 'left', width: '200px', nowrap: false },
                { key: 'capital_order', label: '자금입금순서', align: 'center', width: '120px', nowrap: true },
                { key: 'remark', label: '비고', align: 'left', width: 'auto', nowrap: false },
                { key: 'is_surge_limit', label: '상한가여부', align: 'center', width: '100px', nowrap: true, render: (v) => (v ? 'Y' : 'N') },
              ]}
              data={stocks}
              editingId={editingStockId}
              selectedId={null}
              onRowClick={null}
              onEdit={(id) => {
                const s = stocks.find((x) => x.id === id);
                if (s) {
                  setStockForm({
                    stock_id: s.stock_id,
                    capital_order: s.capital_order ?? 0,
                    remark: s.remark || '',
                    is_surge_limit: s.is_surge_limit ?? false,
                    stock: s.stock || null,
                  });
                  setEditingStockId(id);
                }
              }}
              onDelete={async (id) => {
                if (confirm('삭제하시겠습니까?')) {
                  await fetch(`${RISING_STOCK_API}/${id}`, { method: 'DELETE' });
                  await loadRisingStocks(selectedThemeId);
                }
              }}
              onSave={async () => { await handleSaveStock(); }}
              onCancel={() => {
                setEditingStockId(null);
                setStockForm({ stock_id: null, capital_order: 0, remark: '', is_surge_limit: false, stock: null });
                setIsStockModalOpen(false);
              }}
              loading={false}
              showRowNumber={true}
              showActions={true}
              renderNewRow={() => (
                <>
                  <td className="py-3 px-4 border-r border-gray-700/50">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setIsStockModalOpen(true); }}
                      className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-left text-white text-sm hover:border-wealth-gold focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    >
                      {stockForm.stock_id
                        ? (
                            <>
                              {stockForm.stock ? `${stockForm.stock.name} (${stockForm.stock.ticker})` : '선택됨'}
                              {stockForm.stock?.nxt_yn && <span className="text-green-400 text-xs ml-2">NXT거래</span>}
                            </>
                          )
                        : '종목 선택'}
                    </button>
                  </td>
                  <td className="py-3 px-4 border-r border-gray-700/50">
                    <input
                      type="number"
                      value={stockForm.capital_order}
                      onChange={(e) => setStockForm(prev => ({ ...prev, capital_order: e.target.value }))}
                      className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    />
                  </td>
                  <td className="py-3 px-4 align-top">
                    <textarea
                      value={stockForm.remark}
                      onChange={(e) => setStockForm(prev => ({ ...prev, remark: e.target.value }))}
                      placeholder="비고"
                      rows={4}
                      className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold resize-y min-h-[80px]"
                    />
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <select
                      value={stockForm.is_surge_limit ? 'true' : 'false'}
                      onChange={(e) => setStockForm(prev => ({ ...prev, is_surge_limit: e.target.value === 'true' }))}
                      className="w-full px-2 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    >
                      <option value="true">Y</option>
                      <option value="false">N</option>
                    </select>
                  </td>
                </>
              )}
              renderEditRow={(row) => (
                <>
                  <td className="py-3 px-4 border-r border-gray-700/50">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setIsStockModalOpen(true); }}
                      className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-left text-white text-sm hover:border-wealth-gold focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    >
                      {stockForm.stock_id
                        ? (
                            <>
                              {stockForm.stock ? `${stockForm.stock.name} (${stockForm.stock.ticker})` : '선택됨'}
                              {stockForm.stock?.nxt_yn && <span className="text-green-400 text-xs ml-2">NXT거래</span>}
                            </>
                          )
                        : '종목 선택'}
                    </button>
                  </td>
                  <td className="py-3 px-4 border-r border-gray-700/50">
                    <input
                      type="number"
                      value={stockForm.capital_order}
                      onChange={(e) => setStockForm(prev => ({ ...prev, capital_order: e.target.value }))}
                      className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    />
                  </td>
                  <td className="py-3 px-4 align-top">
                    <textarea
                      value={stockForm.remark}
                      onChange={(e) => setStockForm(prev => ({ ...prev, remark: e.target.value }))}
                      placeholder="비고"
                      rows={4}
                      className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold resize-y min-h-[80px]"
                    />
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <select
                      value={stockForm.is_surge_limit ? 'true' : 'false'}
                      onChange={(e) => setStockForm(prev => ({ ...prev, is_surge_limit: e.target.value === 'true' }))}
                      className="w-full px-2 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    >
                      <option value="true">Y</option>
                      <option value="false">N</option>
                    </select>
                  </td>
                </>
              )}
              renderViewRow={(row) => (
                <>
                  <td className="py-3 px-4 text-white text-sm border-r border-gray-700/50">
                    <span className="whitespace-nowrap">
                      {row.stock?.name || '-'} ({row.stock?.ticker || '-'})
                      {row.stock?.nxt_yn && <span className="text-green-400 text-xs ml-2">NXT거래</span>}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white text-sm text-center border-r border-gray-700/50">{row.capital_order ?? '-'}</td>
                  <td className="py-3 px-4 text-white text-sm break-words whitespace-pre-wrap">{row.remark || '-'}</td>
                  <td className="py-3 px-4 text-white text-sm text-center">{row.is_surge_limit ? 'Y' : 'N'}</td>
                </>
              )}
              emptyMessage="등록된 상승종목이 없습니다."
            />
          </>
        )}
      </div>

      <ThemeCategorySelector
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        onSelect={handleThemeSelect}
        selectedThemeId={themeForm.theme_id}
        selectedCategoryId={themeForm.category_id}
      />

      <KRStockSelector
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        onSelect={handleStockSelect}
        selectedStockId={stockForm.stock_id}
        themeId={themes.find((t) => t.id === selectedThemeId)?.theme_id ?? null}
        categoryId={themes.find((t) => t.id === selectedThemeId)?.category_id ?? null}
      />
    </div>
  );
}

export default LimitUpSurgeAnalysis;
