import React, { useState, useEffect } from 'react';
import { getApiUrl, API_ENDPOINTS } from '../../utils/api';
import { ensureKRStockCache } from '../../components/KRStockSelector';
import DataGrid from '../../components/DataGrid';

const NEWS_HISTORY_API = getApiUrl(API_ENDPOINTS.KR_STOCKS_NEWS_HISTORY);

function formatDateForInput(d) {
  if (typeof d === 'string') return d;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function StockNewsHistory() {
  const [stocks, setStocks] = useState([]);
  const [stocksLoading, setStocksLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [marketFilter, setMarketFilter] = useState('');
  const [stock, setStock] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ date: '', contents: '' });
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setStocksLoading(true);
    ensureKRStockCache()
      .then((data) => {
        if (!cancelled) setStocks(data || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError('종목 목록을 불러오는데 실패했습니다: ' + err.message);
          setStocks([]);
        }
      })
      .finally(() => {
        if (!cancelled) setStocksLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filteredStocks = stocks.filter((s) => {
    const useYn = s.use_yn === true;
    const matchesSearch =
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.ticker?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMarket = !marketFilter || s.market === marketFilter;
    return useYn && matchesSearch && matchesMarket;
  });

  // 검색 결과가 1건일 때 자동 선택
  useEffect(() => {
    if (searchTerm.trim() && filteredStocks.length === 1) {
      const single = filteredStocks[0];
      if (stock?.id !== single.id) {
        handleSelectStock(single);
      }
    }
  }, [filteredStocks, searchTerm, stock?.id]);

  const loadHistory = async (stockId) => {
    if (!stockId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${NEWS_HISTORY_API}/stock/${stockId}`);
      if (res.ok) {
        const data = await res.json();
        setRows(
          (data || []).map((r) => ({
            id: r.id,
            date: formatDateForInput(r.date),
            contents: r.contents || '',
          }))
        );
      } else {
        setRows([]);
      }
    } catch (err) {
      console.error('Failed to load news history:', err);
      setError('뉴스 이력을 불러오는데 실패했습니다.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStock = (selected) => {
    setStock(selected);
    setError(null);
    setEditingId(null);
    if (selected) {
      loadHistory(selected.id);
    } else {
      setRows([]);
    }
  };

  const handleSave = async () => {
    if (!stock) return;
    if (!form.contents?.trim()) {
      setError('뉴스 요약 내용을 입력해주세요.');
      return;
    }
    if (form.contents.length > 500) {
      setError('내용은 500자 이내로 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(NEWS_HISTORY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock_id: stock.id,
          date: form.date,
          contents: form.contents.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || '저장에 실패했습니다.');
      }
      const saved = await res.json();
      if (editingId === 'new') {
        setRows((prev) => [
          { id: saved.id, date: formatDateForInput(saved.date), contents: saved.contents },
          ...prev,
        ]);
      } else {
        setRows((prev) =>
          prev.map((r) =>
            r.id === editingId
              ? { id: saved.id, date: formatDateForInput(saved.date), contents: saved.contents }
              : r
          )
        );
      }
      setForm({ date: '', contents: '' });
      setEditingId(null);
    } catch (err) {
      setError('저장에 실패했습니다: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (rowId) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`${NEWS_HISTORY_API}/${rowId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      setRows((prev) => prev.filter((r) => r.id !== rowId));
      if (editingId === rowId) setEditingId(null);
    } catch (err) {
      setError('삭제에 실패했습니다: ' + err.message);
    }
  };

  const handleCancel = () => {
    setForm({ date: '', contents: '' });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-wealth-gold to-yellow-200 mb-2">
          주식 뉴스 이력
        </h1>
        <p className="text-wealth-muted text-sm">
          왼쪽에서 종목을 선택하고, 오른쪽 그리드에서 뉴스 요약을 추가·수정하세요. (500자 이내)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 min-h-[500px]">
        {/* 왼쪽: 종목 목록 */}
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-800">
            <div className="flex gap-1.5 mb-2">
              <button
                type="button"
                onClick={() => setMarketFilter('')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  marketFilter === ''
                    ? 'bg-wealth-gold text-wealth-dark font-medium'
                    : 'bg-wealth-card/50 text-wealth-muted hover:text-white'
                }`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setMarketFilter('KOSPI')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  marketFilter === 'KOSPI'
                    ? 'bg-wealth-gold text-wealth-dark font-medium'
                    : 'bg-wealth-card/50 text-wealth-muted hover:text-white'
                }`}
              >
                KOSPI
              </button>
              <button
                type="button"
                onClick={() => setMarketFilter('KOSDAQ')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  marketFilter === 'KOSDAQ'
                    ? 'bg-wealth-gold text-wealth-dark font-medium'
                    : 'bg-wealth-card/50 text-wealth-muted hover:text-white'
                }`}
              >
                KOSDAQ
              </button>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="종목 검색..."
              className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded-lg text-white text-sm placeholder:text-wealth-muted focus:outline-none focus:ring-2 focus:ring-wealth-gold"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {stocksLoading ? (
              <div className="text-center py-8 text-wealth-muted text-sm">로딩 중...</div>
            ) : filteredStocks.length === 0 ? (
              <div className="text-center py-8 text-wealth-muted text-sm">검색 결과 없음</div>
            ) : (
              <div className="space-y-1">
                {filteredStocks.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectStock(s)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                      stock?.id === s.id
                        ? 'bg-wealth-gold/20 border border-wealth-gold text-wealth-gold'
                        : 'border border-transparent hover:bg-wealth-card/80 text-white'
                    }`}
                  >
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-xs text-wealth-muted font-mono">
                      {s.ticker} · {s.market}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 그리드 형식 */}
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
          {!stock ? (
            <div className="flex items-center justify-center py-24 text-wealth-muted">
              왼쪽에서 종목을 선택해주세요.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">
                  {stock.name} ({stock.ticker})
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    if (editingId !== null) return;
                    setForm({
                      date: formatDateForInput(new Date()),
                      contents: '',
                    });
                    setEditingId('new');
                  }}
                  disabled={editingId !== null}
                  className="px-4 py-2 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  추가
                </button>
              </div>
              {error && (
                <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <DataGrid
                columns={[
                  { key: 'date', label: '날짜', align: 'left', width: '120px', nowrap: true },
                  { key: 'contents', label: '뉴스 요약', align: 'left', width: 'auto', nowrap: false },
                ]}
                data={rows}
                editingId={editingId}
                selectedId={null}
                onRowClick={null}
                onEdit={(id) => {
                  const r = rows.find((x) => x.id === id);
                  if (r) {
                    setForm({ date: r.date, contents: r.contents || '' });
                    setEditingId(id);
                  }
                }}
                onDelete={(id) => handleDelete(id)}
                onSave={handleSave}
                onCancel={handleCancel}
                loading={loading}
                showRowNumber={true}
                showActions={true}
                renderNewRow={() => (
                  <>
                    <td className="py-3 px-4 border-r border-gray-700/50">
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                        className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                      />
                    </td>
                    <td className="py-3 px-4 align-top">
                      <textarea
                        value={form.contents}
                        onChange={(e) => setForm((prev) => ({ ...prev, contents: e.target.value }))}
                        placeholder="뉴스 요약 (500자 이내)"
                        rows={3}
                        maxLength={500}
                        className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold resize-y min-h-[80px]"
                      />
                      <div className="text-right text-xs text-wealth-muted mt-1">{form.contents.length} / 500</div>
                    </td>
                  </>
                )}
                renderEditRow={(row) => (
                  <>
                    <td className="py-3 px-4 border-r border-gray-700/50">
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                        className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                      />
                    </td>
                    <td className="py-3 px-4 align-top">
                      <textarea
                        value={form.contents}
                        onChange={(e) => setForm((prev) => ({ ...prev, contents: e.target.value }))}
                        placeholder="뉴스 요약 (500자 이내)"
                        rows={3}
                        maxLength={500}
                        className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold resize-y min-h-[80px]"
                      />
                      <div className="text-right text-xs text-wealth-muted mt-1">{form.contents.length} / 500</div>
                    </td>
                  </>
                )}
                renderViewRow={(row) => (
                  <>
                    <td className="py-3 px-4 text-white text-sm whitespace-nowrap border-r border-gray-700/50">
                      {row.date || '-'}
                    </td>
                    <td className="py-3 px-4 text-white text-sm break-words whitespace-pre-wrap">
                      {row.contents || '-'}
                    </td>
                  </>
                )}
                emptyMessage="등록된 뉴스 이력이 없습니다. 추가 버튼을 눌러 새로 추가하세요."
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default StockNewsHistory;
