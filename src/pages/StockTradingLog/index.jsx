import React, { useState, useEffect } from 'react';
import AppLayout from '../../layouts/AppLayout';
import KRStockSelector from '../../components/KRStockSelector';
import { getApiUrl, API_ENDPOINTS } from '../../utils/api';

const API_BASE_URL = getApiUrl(API_ENDPOINTS.STOCK_TRADING_LOGS);
const KR_STOCKS_URL = getApiUrl(API_ENDPOINTS.KR_STOCKS);
const COMMON_CODE_MASTERS_API = getApiUrl(API_ENDPOINTS.COMMON_CODE_MASTERS);
const COMMON_CODE_DETAILS_API = getApiUrl(API_ENDPOINTS.COMMON_CODE_DETAILS);

const POSITION_MASTER_CODE = 'position';
const INVEST_RESULT_MASTER_CODE = 'invest_result';

function StockTradingLog({ embed = false }) {
  const [logs, setLogs] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [positionOptions, setPositionOptions] = useState([]);
  const [investResultOptions, setInvestResultOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isStockSelectorOpen, setIsStockSelectorOpen] = useState(false);
  const [stockSelectorFor, setStockSelectorFor] = useState(null); // 'new' | logId
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [editingContentId, setEditingContentId] = useState(null);
  const [contentText, setContentText] = useState('');
  const [hideSold, setHideSold] = useState(true);
  const [filterPosition, setFilterPosition] = useState('');
  const [filterInvestResult, setFilterInvestResult] = useState('');
  const [filterTicker, setFilterTicker] = useState('');
  const [editForm, setEditForm] = useState({
    stock_id: null,
    purchase_date: '',
    sale_date: '',
    content: '',
    position: null,
    invest_result: null,
  });
  const [newForm, setNewForm] = useState({
    stock_id: null,
    purchase_date: '',
    sale_date: '',
    content: '',
    position: null,
    invest_result: null,
  });

  useEffect(() => {
    loadLogs();
    loadStocks();
    loadPositionOptions();
    loadInvestResultOptions();
  }, []);

  const loadInvestResultOptions = async () => {
    try {
      const masterRes = await fetch(`${COMMON_CODE_MASTERS_API}?skip=0&limit=100`);
      if (!masterRes.ok) return;
      const masters = await masterRes.json();
      const investResultMaster = masters.find((m) => m.code === INVEST_RESULT_MASTER_CODE);
      if (!investResultMaster) return;
      const detailRes = await fetch(`${COMMON_CODE_DETAILS_API}?master_id=${investResultMaster.id}&skip=0&limit=1000`);
      if (detailRes.ok) {
        const data = await detailRes.json();
        setInvestResultOptions(data);
      }
    } catch (err) {
      console.error('Error loading invest result options:', err);
    }
  };

  const loadPositionOptions = async () => {
    try {
      const masterRes = await fetch(`${COMMON_CODE_MASTERS_API}?skip=0&limit=100`);
      if (!masterRes.ok) return;
      const masters = await masterRes.json();
      const positionMaster = masters.find((m) => m.code === POSITION_MASTER_CODE);
      if (!positionMaster) return;
      const detailRes = await fetch(`${COMMON_CODE_DETAILS_API}?master_id=${positionMaster.id}&skip=0&limit=1000`);
      if (detailRes.ok) {
        const data = await detailRes.json();
        setPositionOptions(data);
      }
    } catch (err) {
      console.error('Error loading position options:', err);
    }
  };

  const getPositionLabel = (detailCode) => {
    if (!detailCode) return '-';
    const opt = positionOptions.find((o) => o.detail_code === detailCode);
    return opt ? opt.detail_code_name : detailCode;
  };

  const getInvestResultLabel = (detailCode) => {
    if (!detailCode) return '-';
    const opt = investResultOptions.find((o) => o.detail_code === detailCode);
    return opt ? opt.detail_code_name : detailCode;
  };

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}?skip=0&limit=1000`);
      if (!response.ok) {
        throw new Error('국장매매일지 목록을 불러오는데 실패했습니다.');
      }
      const data = await response.json();
      setLogs(data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading stock trading logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStocks = async () => {
    try {
      const response = await fetch(`${KR_STOCKS_URL}?skip=0&limit=10000`);
      if (response.ok) {
        const data = await response.json();
        setStocks(data);
      }
    } catch (err) {
      console.error('Error loading stocks:', err);
    }
  };

  const getStockLabel = (stockId) => {
    if (!stockId) return '-';
    const s = stocks.find((x) => x.id === stockId);
    if (!s) return '-';
    const base = `${s.name}(${s.ticker})`;
    return s.market ? `${base} (${s.market})` : base;
  };

  const handleAdd = () => {
    setIsAdding(true);
    setNewForm({
      stock_id: null,
      purchase_date: '',
      sale_date: '',
      content: '',
      position: null,
      invest_result: null,
    });
  };

  const handleEdit = (log) => {
    setEditingId(log.id);
    setEditForm({
      stock_id: log.stock_id || null,
      purchase_date: log.purchase_date || '',
      sale_date: log.sale_date || '',
      content: log.content || '',
      position: log.position || null,
      invest_result: log.invest_result || null,
    });
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewForm({ stock_id: null, purchase_date: '', sale_date: '', content: '', position: null, invest_result: null });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ stock_id: null, purchase_date: '', sale_date: '', content: '', position: null, invest_result: null });
  };

  const handleSaveNew = async () => {
    if (!newForm.purchase_date || !newForm.content) {
      setError('매수일자와 내용은 필수입니다.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock_id: newForm.stock_id || null,
          purchase_date: newForm.purchase_date,
          sale_date: newForm.sale_date || null,
          content: newForm.content,
          position: newForm.position || null,
          invest_result: newForm.invest_result || null,
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || '저장에 실패했습니다.');
      }
      await loadLogs();
      handleCancelAdd();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editForm.purchase_date || !editForm.content) {
      setError('매수일자와 내용은 필수입니다.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock_id: editForm.stock_id || null,
          purchase_date: editForm.purchase_date,
          sale_date: editForm.sale_date || null,
          content: editForm.content,
          position: editForm.position || null,
          invest_result: editForm.invest_result || null,
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || '저장에 실패했습니다.');
      }
      await loadLogs();
      handleCancelEdit();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStockSelect = (stock) => {
    if (stockSelectorFor === 'new') {
      setNewForm((prev) => ({ ...prev, stock_id: stock.id }));
    } else if (stockSelectorFor) {
      setEditForm((prev) => ({ ...prev, stock_id: stock.id }));
    }
    setIsStockSelectorOpen(false);
    setStockSelectorFor(null);
  };

  const handleContentClick = (log) => {
    setEditingContentId(log.id);
    setContentText(log.content || '');
    setIsContentModalOpen(true);
  };

  const handleContentSave = async () => {
    if (editingContentId == null) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/${editingContentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentText.trim() }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || '저장에 실패했습니다.');
      }
      await loadLogs();
      setIsContentModalOpen(false);
      setEditingContentId(null);
      setContentText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContentCancel = () => {
    setIsContentModalOpen(false);
    setEditingContentId(null);
    setContentText('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('삭제에 실패했습니다.');
      await loadLogs();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const content = (
    <div className="min-h-screen bg-wealth-dark pb-20">
      <div className="max-w-[98%] mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* 헤더 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            <div className="flex justify-between items-center">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-wealth-gold to-yellow-200 whitespace-nowrap">
                국장매매일지
              </h1>
              <button
                onClick={handleAdd}
                disabled={loading || isAdding}
                className="px-6 py-3 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + 추가
              </button>
            </div>
            <div className="mt-4 flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer text-wealth-muted hover:text-wealth-text transition-colors">
                <input
                  type="checkbox"
                  checked={hideSold}
                  onChange={(e) => setHideSold(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-wealth-card text-wealth-gold focus:ring-wealth-gold focus:ring-offset-0"
                />
                <span className="text-sm">매도 완료 숨기기</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-wealth-muted">포지션</span>
                <select
                  value={filterPosition}
                  onChange={(e) => setFilterPosition(e.target.value)}
                  className="px-3 py-1.5 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold min-w-[120px]"
                >
                  <option value="">전체</option>
                  {positionOptions.map((opt) => (
                    <option key={opt.id} value={opt.detail_code}>
                      {opt.detail_code_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-wealth-muted">투자결과</span>
                <select
                  value={filterInvestResult}
                  onChange={(e) => setFilterInvestResult(e.target.value)}
                  className="px-3 py-1.5 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold min-w-[120px]"
                >
                  <option value="">전체</option>
                  {investResultOptions.map((opt) => (
                    <option key={opt.id} value={opt.detail_code}>
                      {opt.detail_code_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-wealth-muted">종목코드</span>
                <input
                  type="text"
                  value={filterTicker}
                  onChange={(e) => setFilterTicker(e.target.value)}
                  placeholder="종목코드 입력"
                  className="px-3 py-1.5 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold min-w-[120px] placeholder:text-gray-500"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-300">
              {error}
            </div>
          )}

          {/* 목록 테이블 */}
          <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
            {loading && !logs.length ? (
              <div className="text-center py-8 text-wealth-muted">로딩 중...</div>
            ) : logs.length === 0 && !isAdding ? (
              <div className="text-center py-8 text-wealth-muted">등록된 거래 내역이 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '130px' }} />
                    <col style={{ width: '130px' }} />
                    <col style={{ width: '300px' }} />
                    <col />
                    <col style={{ width: '130px' }} />
                    <col style={{ width: '130px' }} />
                    <col style={{ width: '150px' }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-center py-3 px-4 text-wealth-muted font-medium border-r border-gray-700/50 whitespace-nowrap">
                        매수일자
                      </th>
                      <th className="text-center py-3 px-4 text-wealth-muted font-medium border-r border-gray-700/50 whitespace-nowrap">
                        매도일자
                      </th>
                      <th className="text-center py-3 px-4 text-wealth-muted font-medium border-r border-gray-700/50 whitespace-nowrap">
                        종목
                      </th>
                      <th className="text-center py-3 px-4 text-wealth-muted font-medium border-r border-gray-700/50">
                        내용
                      </th>
                      <th className="text-center py-3 px-4 text-wealth-muted font-medium border-r border-gray-700/50 whitespace-nowrap">
                        포지션
                      </th>
                      <th className="text-center py-3 px-4 text-wealth-muted font-medium border-r border-gray-700/50 whitespace-nowrap">
                        투자결과
                      </th>
                      <th className="text-center py-3 px-4 text-wealth-muted font-medium whitespace-nowrap">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 추가 행 */}
                    {isAdding && (
                      <tr className="border-b border-gray-800/30 bg-wealth-card/30">
                        <td className="py-3 px-4 border-r border-gray-700/50">
                          <input
                            type="date"
                            value={newForm.purchase_date}
                            onChange={(e) => setNewForm({ ...newForm, purchase_date: e.target.value })}
                            className="w-full px-3 py-1.5 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                          />
                        </td>
                        <td className="py-3 px-4 border-r border-gray-700/50">
                          <input
                            type="date"
                            value={newForm.sale_date}
                            onChange={(e) => setNewForm({ ...newForm, sale_date: e.target.value })}
                            className="w-full px-3 py-1.5 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                          />
                        </td>
                        <td className="py-3 px-4 border-r border-gray-700/50">
                          <button
                            type="button"
                            onClick={() => {
                              setStockSelectorFor('new');
                              setIsStockSelectorOpen(true);
                            }}
                            className="w-full px-3 py-1.5 bg-wealth-card border border-gray-700 rounded text-white text-sm hover:border-wealth-gold/50 focus:outline-none focus:ring-2 focus:ring-wealth-gold text-left"
                          >
                            {newForm.stock_id ? (
                              <>
                                {getStockLabel(newForm.stock_id)}
                                {stocks.find((s) => s.id === newForm.stock_id)?.nxt_yn && (
                                  <span className="text-green-400 text-xs ml-2">NXT거래</span>
                                )}
                              </>
                            ) : (
                              '종목 선택'
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 border-r border-gray-700/50">
                          <textarea
                            value={newForm.content}
                            onChange={(e) => setNewForm({ ...newForm, content: e.target.value })}
                            rows={2}
                            placeholder="내용"
                            className="w-full px-3 py-1.5 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold resize-none"
                          />
                        </td>
                        <td className="py-3 px-4 border-r border-gray-700/50">
                          <select
                            value={newForm.position || ''}
                            onChange={(e) =>
                              setNewForm({
                                ...newForm,
                                position: e.target.value || null,
                              })
                            }
                            className="w-full px-3 py-1.5 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                          >
                            <option value="">선택</option>
                            {positionOptions.map((opt) => (
                              <option key={opt.id} value={opt.detail_code}>
                                {opt.detail_code_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4 border-r border-gray-700/50">
                          <select
                            value={newForm.invest_result || ''}
                            onChange={(e) =>
                              setNewForm({
                                ...newForm,
                                invest_result: e.target.value || null,
                              })
                            }
                            className="w-full px-3 py-1.5 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                          >
                            <option value="">선택</option>
                            {investResultOptions.map((opt) => (
                              <option key={opt.id} value={opt.detail_code}>
                                {opt.detail_code_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2 justify-center whitespace-nowrap">
                            <button
                              onClick={handleSaveNew}
                              disabled={loading}
                              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              저장
                            </button>
                            <button
                              onClick={handleCancelAdd}
                              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                            >
                              취소
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {logs
                      .filter((log) => !hideSold || !log.sale_date)
                      .filter((log) => !filterPosition || log.position === filterPosition)
                      .filter((log) => !filterInvestResult || log.invest_result === filterInvestResult)
                      .filter((log) => {
                        if (!filterTicker.trim()) return true;
                        const stock = stocks.find((s) => s.id === log.stock_id);
                        if (!stock) return false;
                        return (stock.ticker || '').toLowerCase().includes(filterTicker.trim().toLowerCase());
                      })
                      .map((log) =>
                        editingId === log.id ? (
                        <tr key={log.id} className="border-b border-gray-800/30 bg-wealth-card/30">
                          <td className="py-3 px-4 border-r border-gray-700/50">
                            <input
                              type="date"
                              value={editForm.purchase_date}
                              onChange={(e) =>
                                setEditForm({ ...editForm, purchase_date: e.target.value })
                              }
                              className="w-full px-3 py-1.5 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                            />
                          </td>
                          <td className="py-3 px-4 border-r border-gray-700/50">
                            <input
                              type="date"
                              value={editForm.sale_date}
                              onChange={(e) =>
                                setEditForm({ ...editForm, sale_date: e.target.value })
                              }
                              className="w-full px-3 py-1.5 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                            />
                          </td>
                          <td className="py-3 px-4 border-r border-gray-700/50">
                            <button
                              type="button"
                              onClick={() => {
                                setStockSelectorFor(editingId);
                                setIsStockSelectorOpen(true);
                              }}
                              className="w-full px-3 py-1.5 bg-wealth-card border border-gray-700 rounded text-white text-sm hover:border-wealth-gold/50 focus:outline-none focus:ring-2 focus:ring-wealth-gold text-left"
                            >
                              {editForm.stock_id ? (
                                <>
                                  {getStockLabel(editForm.stock_id)}
                                  {stocks.find((s) => s.id === editForm.stock_id)?.nxt_yn && (
                                    <span className="text-green-400 text-xs ml-2">NXT거래</span>
                                  )}
                                </>
                              ) : (
                                '종목 선택'
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4 border-r border-gray-700/50">
                            <textarea
                              value={editForm.content}
                              onChange={(e) =>
                                setEditForm({ ...editForm, content: e.target.value })
                              }
                              rows={2}
                              className="w-full px-3 py-1.5 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold resize-none"
                            />
                          </td>
                          <td className="py-3 px-4 border-r border-gray-700/50">
                            <select
                              value={editForm.position || ''}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  position: e.target.value || null,
                                })
                              }
                              className="w-full px-3 py-1.5 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                            >
                              <option value="">선택</option>
                              {positionOptions.map((opt) => (
                                <option key={opt.id} value={opt.detail_code}>
                                  {opt.detail_code_name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4 border-r border-gray-700/50">
                            <select
                              value={editForm.invest_result || ''}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  invest_result: e.target.value || null,
                                })
                              }
                              className="w-full px-3 py-1.5 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                            >
                              <option value="">선택</option>
                              {investResultOptions.map((opt) => (
                                <option key={opt.id} value={opt.detail_code}>
                                  {opt.detail_code_name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2 justify-center whitespace-nowrap">
                              <button
                                onClick={handleSaveEdit}
                                disabled={loading}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                              >
                                저장
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                              >
                                취소
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr
                          key={log.id}
                          className="border-b border-gray-800/30 hover:bg-wealth-card/30 transition-colors"
                        >
                          <td className="text-center py-3 px-4 text-wealth-text border-r border-gray-700/50 whitespace-nowrap">
                            {formatDate(log.purchase_date)}
                          </td>
                          <td className="text-center py-3 px-4 text-wealth-text border-r border-gray-700/50 whitespace-nowrap">
                            {formatDate(log.sale_date)}
                          </td>
                          <td className="text-left py-3 px-4 text-wealth-text border-r border-gray-700/50 whitespace-nowrap">
                            {getStockLabel(log.stock_id)}
                            {stocks.find((s) => s.id === log.stock_id)?.nxt_yn && (
                              <span className="text-green-400 text-xs ml-2">NXT거래</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-white text-sm border-r border-gray-700/50">
                            <button
                              type="button"
                              onClick={() => handleContentClick(log)}
                              className="text-left w-full hover:text-wealth-gold transition-colors break-words"
                              title="클릭하여 내용 편집"
                            >
                              {log.content ? (
                                <span className="line-clamp-3 break-words whitespace-pre-wrap">
                                  {log.content}
                                </span>
                              ) : (
                                <span className="text-wealth-muted italic">클릭하여 입력</span>
                              )}
                            </button>
                          </td>
                          <td className="text-center py-3 px-4 text-wealth-text border-r border-gray-700/50 whitespace-nowrap">
                            {getPositionLabel(log.position)}
                          </td>
                          <td className="text-center py-3 px-4 text-wealth-text border-r border-gray-700/50 whitespace-nowrap">
                            {getInvestResultLabel(log.invest_result)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2 justify-center whitespace-nowrap">
                              <button
                                onClick={() => handleEdit(log)}
                                className="px-3 py-1 text-sm text-wealth-gold hover:bg-wealth-gold/10 rounded transition-colors disabled:opacity-50"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDelete(log.id)}
                                className="px-3 py-1 text-sm text-red-400 hover:bg-red-400/10 rounded transition-colors disabled:opacity-50"
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 종목 선택 팝업 */}
      <KRStockSelector
        isOpen={isStockSelectorOpen}
        onClose={() => {
          setIsStockSelectorOpen(false);
          setStockSelectorFor(null);
        }}
        onSelect={handleStockSelect}
        selectedStockId={
          stockSelectorFor === 'new' ? newForm.stock_id : stockSelectorFor ? editForm.stock_id : null
        }
      />

      {/* 내용 편집 모달 */}
      {isContentModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-wealth-card border border-gray-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">내용 편집</h3>
              <textarea
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 bg-wealth-card border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                placeholder="내용을 입력하세요"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={handleContentCancel}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleContentSave}
                  disabled={loading}
                  className="px-4 py-2 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (embed) return content;
  return <AppLayout>{content}</AppLayout>;
}

export default StockTradingLog;
