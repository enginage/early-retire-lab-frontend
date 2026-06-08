import React, { useState, useEffect, useCallback } from 'react';
import DataGrid from '../../components/DataGrid';
import CommonCodeSelector from '../../components/CommonCodeSelector';
import FinancialInstitutionSelector from '../../components/FinancialInstitutionSelector';
import KRStockSelector from '../../components/KRStockSelector';
import DomesticETFSelector from '../../components/DomesticETFSelector';
import { getApiUrl, API_ENDPOINTS } from '../../utils/api';

const ACCOUNTS_API = getApiUrl(API_ENDPOINTS.ASSET_INDICATOR_ACCOUNTS);
const HOLDINGS_API = getApiUrl(API_ENDPOINTS.ASSET_INDICATOR_HOLDINGS);

function fmtNum(v) {
  if (v === null || v === undefined || v === '') return '-';
  const n = Number(v);
  if (Number.isNaN(n)) return '-';
  return n.toLocaleString('ko-KR');
}

function fmtDec(v, d = 2) {
  if (v === null || v === undefined || v === '') return '-';
  const n = Number(v);
  if (Number.isNaN(n)) return '-';
  return n.toLocaleString('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  });
}

function assetKindLabel(kind) {
  if (kind === 'kr_stock') return '국내주식';
  if (kind === 'domestic_etf') return '국내ETF';
  return kind || '-';
}

export default function AssetIndicatorManagement() {
  const [accounts, setAccounts] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [newRow, setNewRow] = useState({
    account_type_code: '',
    financial_institution_code: '',
    financial_institution_name: '',
    account_number: '',
  });
  const [loading, setLoading] = useState(false);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFiSelector, setShowFiSelector] = useState(false);
  const [selectingFiFor, setSelectingFiFor] = useState(null);
  const [showKrSelector, setShowKrSelector] = useState(false);
  const [showEtfSelector, setShowEtfSelector] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(ACCOUNTS_API);
      if (!res.ok) throw new Error(await res.text());
      setAccounts(await res.json());
    } catch (e) {
      setError(e.message || '계좌 목록 로드 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHoldings = useCallback(async (accountId) => {
    if (!accountId) {
      setHoldings([]);
      return;
    }
    try {
      setHoldingsLoading(true);
      const res = await fetch(`${HOLDINGS_API}/account/${accountId}`);
      if (!res.ok) throw new Error(await res.text());
      setHoldings(await res.json());
    } catch (e) {
      setError(e.message || '보유종목 로드 실패');
    } finally {
      setHoldingsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId && editingId === null) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId, editingId]);

  useEffect(() => {
    loadHoldings(selectedAccountId);
  }, [selectedAccountId, loadHoldings]);

  const handleInputChange = (id, field, value) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const handleAdd = () => {
    setNewRow({
      account_type_code: '',
      financial_institution_code: '',
      financial_institution_name: '',
      account_number: '',
    });
    setEditingId('new');
  };

  const handleCancel = () => {
    setEditingId(null);
    loadAccounts();
  };

  const handleSave = async (row) => {
    const src = row?.id ? row : newRow;
    if (!src.account_type_code || !src.financial_institution_code || !src.account_number?.trim()) {
      setError('계좌유형, 금융기관, 계좌번호는 필수입니다.');
      return;
    }
    const payload = {
      account_type_code: src.account_type_code,
      financial_institution_code: src.financial_institution_code,
      account_number: String(src.account_number).trim(),
    };
    try {
      setLoading(true);
      setError(null);
      const url = row?.id ? `${ACCOUNTS_API}/${row.id}` : ACCOUNTS_API;
      const method = row?.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || res.statusText);
      }
      setEditingId(null);
      await loadAccounts();
    } catch (e) {
      setError(e.message || '저장 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('계좌와 보유종목을 모두 삭제하시겠습니까?')) return;
    try {
      setLoading(true);
      const res = await fetch(`${ACCOUNTS_API}/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error(await res.text());
      if (selectedAccountId === id) setSelectedAccountId(null);
      await loadAccounts();
    } catch (e) {
      setError(e.message || '삭제 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (accountId) => {
    if (editingId === null) setSelectedAccountId(accountId);
  };

  const handleFiSelect = (inst) => {
    if (selectingFiFor === 'new') {
      setNewRow((p) => ({
        ...p,
        financial_institution_code: inst.code,
        financial_institution_name: inst.name,
      }));
    } else if (selectingFiFor) {
      handleInputChange(selectingFiFor, 'financial_institution_code', inst.code);
      handleInputChange(selectingFiFor, 'financial_institution_name', inst.name);
    }
    setShowFiSelector(false);
    setSelectingFiFor(null);
  };

  const addHolding = async (assetKind, refId) => {
    if (!selectedAccountId) return;
    try {
      setHoldingsLoading(true);
      setError(null);
      const res = await fetch(HOLDINGS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedAccountId,
          asset_kind: assetKind,
          ref_id: refId,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || res.statusText);
      }
      await loadHoldings(selectedAccountId);
    } catch (e) {
      setError(e.message || '보유종목 추가 실패');
    } finally {
      setHoldingsLoading(false);
    }
  };

  const deleteHolding = async (holding) => {
    const label = holding.name || holding.ticker || '보유종목';
    if (!window.confirm(`"${label}" 을 삭제하시겠습니까?`)) return;
    try {
      setHoldingsLoading(true);
      const res = await fetch(`${HOLDINGS_API}/${holding.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error(await res.text());
      await loadHoldings(selectedAccountId);
    } catch (e) {
      setError(e.message || '삭제 실패');
    } finally {
      setHoldingsLoading(false);
    }
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">보유자산 기술지표</h1>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">계좌 목록</h2>
          <button
            type="button"
            onClick={handleAdd}
            disabled={loading || editingId === 'new'}
            className="px-4 py-2 bg-wealth-gold text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
          >
            + 추가
          </button>
        </div>

        <div className="overflow-x-auto -mx-6 px-6">
          <DataGrid
            columns={[
              { key: 'account_type', label: '계좌유형', align: 'left' },
              { key: 'financial_institution', label: '금융기관', align: 'left' },
              { key: 'account_number', label: '계좌번호', align: 'left' },
            ]}
            data={accounts}
            editingId={editingId}
            selectedId={selectedAccountId}
            onRowClick={handleRowClick}
            onEdit={setEditingId}
            onDelete={handleDelete}
            onSave={(row) => handleSave(row)}
            onCancel={handleCancel}
            loading={loading}
            renderNewRow={() => (
              <>
                <td className="py-3 px-4">
                  <CommonCodeSelector
                    masterCode="account_type"
                    value={newRow.account_type_code}
                    onChange={(e) =>
                      setNewRow({ ...newRow, account_type_code: e.target.value })
                    }
                    placeholder="계좌유형"
                  />
                </td>
                <td className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectingFiFor('new');
                      setShowFiSelector(true);
                    }}
                    className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded-lg text-white text-left hover:bg-gray-700"
                  >
                    {newRow.financial_institution_name || '금융기관 선택'}
                  </button>
                </td>
                <td className="py-3 px-4">
                  <input
                    type="text"
                    value={newRow.account_number}
                    onChange={(e) =>
                      setNewRow({ ...newRow, account_number: e.target.value })
                    }
                    placeholder="계좌번호"
                    className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded-lg text-white"
                  />
                </td>
              </>
            )}
            renderEditRow={(row) => (
              <>
                <td className="py-3 px-4">
                  <CommonCodeSelector
                    masterCode="account_type"
                    value={row.account_type_code}
                    onChange={(e) =>
                      handleInputChange(row.id, 'account_type_code', e.target.value)
                    }
                  />
                </td>
                <td className="py-3 px-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectingFiFor(row.id);
                      setShowFiSelector(true);
                    }}
                    className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded-lg text-white text-left"
                  >
                    {row.financial_institution_name || row.financial_institution_code}
                  </button>
                </td>
                <td className="py-3 px-4">
                  <input
                    type="text"
                    value={row.account_number}
                    onChange={(e) =>
                      handleInputChange(row.id, 'account_number', e.target.value)
                    }
                    className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded-lg text-white"
                  />
                </td>
              </>
            )}
            renderViewRow={(row) => (
              <>
                <td className="py-3 px-4 text-white">
                  {row.account_type_name || row.account_type_code || '-'}
                </td>
                <td className="py-3 px-4 text-white">
                  {row.financial_institution_name || '-'}
                </td>
                <td className="py-3 px-4 text-white">{row.account_number}</td>
              </>
            )}
            emptyMessage="등록된 계좌가 없습니다."
          />
        </div>
      </div>

      {selectedAccountId && (
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">보유종목 · 기술지표</h2>
              {selectedAccount && (
                <p className="text-sm text-wealth-muted mt-1">
                  {selectedAccount.financial_institution_name} / {selectedAccount.account_number}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowKrSelector(true)}
                disabled={holdingsLoading}
                className="px-3 py-2 text-sm bg-wealth-card border border-gray-600 rounded-lg text-white hover:border-wealth-gold disabled:opacity-50"
              >
                + 국내주식
              </button>
              <button
                type="button"
                onClick={() => setShowEtfSelector(true)}
                disabled={holdingsLoading}
                className="px-3 py-2 text-sm bg-wealth-card border border-gray-600 rounded-lg text-white hover:border-wealth-gold disabled:opacity-50"
              >
                + 국내ETF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[960px]">
              <thead>
                <tr className="border-b border-gray-700 text-left">
                  <th className="py-2 px-3 text-wealth-muted">구분</th>
                  <th className="py-2 px-3 text-wealth-muted">티커</th>
                  <th className="py-2 px-3 text-wealth-muted">종목명</th>
                  <th className="py-2 px-3 text-right text-wealth-muted">종가</th>
                  <th className="py-2 px-3 text-right text-wealth-muted">RSI(18)</th>
                  <th className="py-2 px-3 text-right text-wealth-muted">RSI(30)</th>
                  <th className="py-2 px-3 text-right text-wealth-muted">MACD</th>
                  <th className="py-2 px-3 text-right text-wealth-muted">Signal</th>
                  <th className="py-2 px-3 text-right text-wealth-muted">MACD Oscillator</th>
                  <th className="py-2 px-3 text-right text-wealth-muted">BB폭</th>
                  <th className="py-2 px-3 text-right text-wealth-muted">BB%B</th>
                  <th className="py-2 px-3 text-center text-wealth-muted">삭제</th>
                </tr>
              </thead>
              <tbody>
                {holdingsLoading && holdings.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-6 text-center text-wealth-muted">
                      불러오는 중…
                    </td>
                  </tr>
                ) : holdings.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-6 text-center text-wealth-muted">
                      보유종목이 없습니다. 국내주식 또는 국내ETF를 추가하세요.
                    </td>
                  </tr>
                ) : (
                  holdings.map((h) => (
                    <tr key={h.id} className="border-b border-gray-800/50">
                      <td className="py-2 px-3 text-white">{assetKindLabel(h.asset_kind)}</td>
                      <td className="py-2 px-3 font-mono text-wealth-gold">{h.ticker || '-'}</td>
                      <td className="py-2 px-3 text-white max-w-[12rem] truncate" title={h.name}>
                        {h.name || '-'}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-white">
                        {fmtNum(h.latest_close)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-wealth-muted">
                        {fmtDec(h.rsi18, 2)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-wealth-muted">
                        {fmtDec(h.rsi30, 2)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-wealth-muted">
                        {fmtDec(h.macd_12_26, 4)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-wealth-muted">
                        {fmtDec(h.macd_signal_9, 4)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-wealth-muted">
                        {fmtDec(h.macd_histogram, 4)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-wealth-muted">
                        {fmtDec(h.bb_width, 4)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-wealth-muted">
                        {fmtDec(h.bb_percent_b, 4)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => deleteHolding(h)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <FinancialInstitutionSelector
        isOpen={showFiSelector}
        onClose={() => {
          setShowFiSelector(false);
          setSelectingFiFor(null);
        }}
        onSelect={handleFiSelect}
      />

      <KRStockSelector
        isOpen={showKrSelector}
        onClose={() => setShowKrSelector(false)}
        onSelect={(stock) => {
          addHolding('kr_stock', stock.id);
          setShowKrSelector(false);
        }}
      />

      <DomesticETFSelector
        isOpen={showEtfSelector}
        onClose={() => setShowEtfSelector(false)}
        onSelect={(etf) => {
          addHolding('domestic_etf', etf.id);
          setShowEtfSelector(false);
        }}
      />
    </div>
  );
}
