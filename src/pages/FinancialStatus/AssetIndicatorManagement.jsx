import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  Fragment,
} from 'react';
import DataGrid from '../../components/DataGrid';
import CommonCodeSelector from '../../components/CommonCodeSelector';
import FinancialInstitutionSelector from '../../components/FinancialInstitutionSelector';
import KRStockSelector from '../../components/KRStockSelector';
import DomesticETFSelector from '../../components/DomesticETFSelector';
import USAStockSelector from '../../components/USAStockSelector';
import USAETFSelector from '../../components/USAETFSelector';
import { getApiUrl, getStocksRestApiUrl, API_ENDPOINTS } from '../../utils/api';
import {
  fetchDomesticEtfFilterCommonCodesCached,
  getPdfPortfolioEmptyMessage,
} from '../InvestmentIndicators/investmentIndicatorFilters';

const ACCOUNTS_API = getApiUrl(API_ENDPOINTS.ASSET_INDICATOR_ACCOUNTS);
const HOLDINGS_API = getApiUrl(API_ENDPOINTS.ASSET_INDICATOR_HOLDINGS);
const DOMESTIC_ETFS_URL = getStocksRestApiUrl(API_ENDPOINTS.DOMESTIC_ETFS);

const HOLDINGS_COL_COUNT = 13;

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

function fmtFluctuationRate(v) {
  if (v === null || v === undefined || v === '') return '-';
  const n = Number(v);
  if (Number.isNaN(n)) return '-';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function fluctuationRateColor(v) {
  if (v === null || v === undefined || v === '') return 'text-wealth-muted';
  const n = Number(v);
  if (Number.isNaN(n)) return 'text-wealth-muted';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-blue-400';
  return 'text-wealth-muted';
}

function resolveMarketClassName(code, marketClassNameByCode) {
  const c = String(code ?? '').trim();
  if (!c) return '-';
  if (marketClassNameByCode?.has(c)) {
    return marketClassNameByCode.get(c);
  }
  return c;
}

function assetKindLabel(kind) {
  if (kind === 'kr_stock') return '국내주식';
  if (kind === 'domestic_etf') return '국내ETF';
  if (kind === 'usa_stock') return '미장주식';
  if (kind === 'usa_etf') return '미국ETF';
  return kind || '-';
}

function sortableMetricValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function compareMetricRows(a, b, key, dir) {
  const va = sortableMetricValue(a[key]);
  const vb = sortableMetricValue(b[key]);
  if (va === null && vb === null) return 0;
  if (va === null) return 1;
  if (vb === null) return -1;
  const cmp = va - vb;
  if (cmp !== 0) return dir === 'asc' ? cmp : -cmp;
  return String(a.ticker || '').localeCompare(String(b.ticker || ''));
}

function SortableMetricTh({ label, field, sortKey, sortDir, onAsc, onDesc }) {
  const ascOn = sortKey === field && sortDir === 'asc';
  const descOn = sortKey === field && sortDir === 'desc';
  return (
    <th className="py-2 px-3 font-medium text-right whitespace-nowrap align-bottom text-wealth-muted">
      <div className="inline-flex items-center gap-1.5 justify-end w-full">
        <span>{label}</span>
        <div
          className="flex flex-col rounded border border-gray-600/70 overflow-hidden shrink-0 bg-wealth-card/40"
          role="group"
          aria-label={`${label} 정렬`}
        >
          <button
            type="button"
            onClick={() => onAsc(field)}
            className={`px-1 py-0.5 leading-none text-[10px] hover:bg-white/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-wealth-gold/50 ${
              ascOn ? 'text-wealth-gold bg-wealth-gold/15' : 'text-wealth-muted'
            }`}
            aria-label={`${label} 오름차순`}
            title="오름차순"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={() => onDesc(field)}
            className={`px-1 py-0.5 leading-none text-[10px] border-t border-gray-600/70 hover:bg-white/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-wealth-gold/50 ${
              descOn ? 'text-wealth-gold bg-wealth-gold/15' : 'text-wealth-muted'
            }`}
            aria-label={`${label} 내림차순`}
            title="내림차순"
          >
            ▼
          </button>
        </div>
      </div>
    </th>
  );
}

function PdfPortfolioIcon({ open }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`w-4 h-4 shrink-0 ${open ? 'text-wealth-gold' : 'text-wealth-muted'}`}
      aria-hidden
    >
      <title>편입 구성(domestic_etfs_pdf)</title>
      <path d="M4 6.75A.75.75 0 0 1 4.75 6h14.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 6.75ZM4 12a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 12Zm0 5.25a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1-.75-.75ZM17.25 16.5a.75.75 0 0 0 0 1.5h2.25a.75.75 0 0 0 0-1.5H17.25Z" />
    </svg>
  );
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
  const [showUsaStockSelector, setShowUsaStockSelector] = useState(false);
  const [showUsaEtfSelector, setShowUsaEtfSelector] = useState(false);
  const [openPdfHoldingId, setOpenPdfHoldingId] = useState(null);
  const [pdfState, setPdfState] = useState({
    status: 'idle',
    items: [],
    error: null,
  });
  const pdfFetchGenRef = useRef(0);
  const [techSortKey, setTechSortKey] = useState('rsi18');
  const [techSortDir, setTechSortDir] = useState('desc');
  const [marketClassOptions, setMarketClassOptions] = useState([]);

  const marketClassNameByCode = useMemo(() => {
    const m = new Map();
    for (const opt of marketClassOptions) {
      const code = String(opt.detail_code ?? '').trim();
      if (!code) continue;
      m.set(code, String(opt.detail_code_name ?? '').trim() || code);
    }
    return m;
  }, [marketClassOptions]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { marketClassDetails } = await fetchDomesticEtfFilterCommonCodesCached();
        if (!cancelled) setMarketClassOptions(marketClassDetails || []);
      } catch (e) {
        console.error('시장분류 공통코드 로드 실패:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedHoldings = useMemo(() => {
    if (!techSortKey) return holdings;
    const next = [...holdings];
    next.sort((a, b) => compareMetricRows(a, b, techSortKey, techSortDir));
    return next;
  }, [holdings, techSortKey, techSortDir]);

  const handleTechSortAsc = useCallback((field) => {
    setTechSortKey(field);
    setTechSortDir('asc');
  }, []);

  const handleTechSortDesc = useCallback((field) => {
    setTechSortKey(field);
    setTechSortDir('desc');
  }, []);

  const pdfItemsWithName = useMemo(
    () =>
      pdfState.items.filter((p) => String(p.stock_name ?? '').trim() !== ''),
    [pdfState.items]
  );

  const pdfItemsUsaMapped = useMemo(
    () =>
      pdfState.items.filter(
        (p) => String(p.display_ticker ?? '').trim() !== ''
      ),
    [pdfState.items]
  );

  const togglePdfPanel = useCallback(async (holdingId, etfRefId) => {
    if (openPdfHoldingId === holdingId) {
      setOpenPdfHoldingId(null);
      return;
    }
    const gen = ++pdfFetchGenRef.current;
    setOpenPdfHoldingId(holdingId);
    setPdfState({ status: 'loading', items: [], error: null });
    try {
      const res = await fetch(`${DOMESTIC_ETFS_URL}/${etfRefId}/pdf-portfolio`);
      if (!res.ok) {
        const raw = await res.text();
        let msg = raw;
        try {
          const j = JSON.parse(raw);
          msg = j.detail ?? raw;
        } catch {
          /* use raw */
        }
        throw new Error(
          res.status === 404 ? 'ETF를 찾을 수 없습니다.' : msg || res.statusText
        );
      }
      const data = await res.json();
      if (gen !== pdfFetchGenRef.current) return;
      setPdfState({
        status: 'done',
        items: Array.isArray(data) ? data : [],
        error: null,
      });
    } catch (e) {
      if (gen !== pdfFetchGenRef.current) return;
      setPdfState({
        status: 'error',
        items: [],
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }, [openPdfHoldingId]);

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
              <button
                type="button"
                onClick={() => setShowUsaStockSelector(true)}
                disabled={holdingsLoading}
                className="px-3 py-2 text-sm bg-wealth-card border border-gray-600 rounded-lg text-white hover:border-wealth-gold disabled:opacity-50"
              >
                + 미장주식
              </button>
              <button
                type="button"
                onClick={() => setShowUsaEtfSelector(true)}
                disabled={holdingsLoading}
                className="px-3 py-2 text-sm bg-wealth-card border border-gray-600 rounded-lg text-white hover:border-wealth-gold disabled:opacity-50"
              >
                + 미국ETF
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
                  <SortableMetricTh
                    label="종가"
                    field="latest_close"
                    sortKey={techSortKey}
                    sortDir={techSortDir}
                    onAsc={handleTechSortAsc}
                    onDesc={handleTechSortDesc}
                  />
                  <SortableMetricTh
                    label="등락률"
                    field="fluctuation_rate"
                    sortKey={techSortKey}
                    sortDir={techSortDir}
                    onAsc={handleTechSortAsc}
                    onDesc={handleTechSortDesc}
                  />
                  <SortableMetricTh
                    label="RSI(18)"
                    field="rsi18"
                    sortKey={techSortKey}
                    sortDir={techSortDir}
                    onAsc={handleTechSortAsc}
                    onDesc={handleTechSortDesc}
                  />
                  <SortableMetricTh
                    label="RSI(30)"
                    field="rsi30"
                    sortKey={techSortKey}
                    sortDir={techSortDir}
                    onAsc={handleTechSortAsc}
                    onDesc={handleTechSortDesc}
                  />
                  <SortableMetricTh
                    label="MACD"
                    field="macd_12_26"
                    sortKey={techSortKey}
                    sortDir={techSortDir}
                    onAsc={handleTechSortAsc}
                    onDesc={handleTechSortDesc}
                  />
                  <SortableMetricTh
                    label="Signal"
                    field="macd_signal_9"
                    sortKey={techSortKey}
                    sortDir={techSortDir}
                    onAsc={handleTechSortAsc}
                    onDesc={handleTechSortDesc}
                  />
                  <SortableMetricTh
                    label="MACD Oscillator"
                    field="macd_histogram"
                    sortKey={techSortKey}
                    sortDir={techSortDir}
                    onAsc={handleTechSortAsc}
                    onDesc={handleTechSortDesc}
                  />
                  <SortableMetricTh
                    label="BB폭"
                    field="bb_width"
                    sortKey={techSortKey}
                    sortDir={techSortDir}
                    onAsc={handleTechSortAsc}
                    onDesc={handleTechSortDesc}
                  />
                  <SortableMetricTh
                    label="BB%B"
                    field="bb_percent_b"
                    sortKey={techSortKey}
                    sortDir={techSortDir}
                    onAsc={handleTechSortAsc}
                    onDesc={handleTechSortDesc}
                  />
                  <th className="py-2 px-3 text-center text-wealth-muted">삭제</th>
                </tr>
              </thead>
              <tbody>
                {holdingsLoading && holdings.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-6 text-center text-wealth-muted">
                      불러오는 중…
                    </td>
                  </tr>
                ) : holdings.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-6 text-center text-wealth-muted">
                      보유종목이 없습니다. 국내주식, 국내ETF, 미장주식 또는 미국ETF를 추가하세요.
                    </td>
                  </tr>
                ) : (
                  sortedHoldings.map((h) => (
                    <Fragment key={h.id}>
                      <tr className="border-b border-gray-800/50">
                        <td className="py-2 px-3 text-white">{assetKindLabel(h.asset_kind)}</td>
                        <td className="py-2 px-3 font-mono text-wealth-gold">{h.ticker || '-'}</td>
                        <td className="py-2 px-3 text-white max-w-[12rem]">
                          <div className="flex items-center gap-1.5 min-w-0 w-full">
                            <span className="truncate min-w-0 flex-1" title={h.name}>
                              {h.name || '-'}
                            </span>
                            {h.asset_kind === 'domestic_etf' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePdfPanel(h.id, h.ref_id);
                                }}
                                className="shrink-0 p-0.5 rounded hover:bg-wealth-gold/15 focus:outline-none focus:ring-1 focus:ring-wealth-gold/50"
                                title="편입 구성 stock.domestic_etfs_pdf"
                                aria-expanded={openPdfHoldingId === h.id}
                                aria-label="편입 구성 보기/닫기"
                              >
                                <PdfPortfolioIcon open={openPdfHoldingId === h.id} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-white">
                          {fmtNum(h.latest_close)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right tabular-nums whitespace-nowrap ${fluctuationRateColor(h.fluctuation_rate)}`}
                        >
                          {fmtFluctuationRate(h.fluctuation_rate)}
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
                      {h.asset_kind === 'domestic_etf' && openPdfHoldingId === h.id && (() => {
                        const marketClassName = resolveMarketClassName(
                          h.kr_etf_market_classification,
                          marketClassNameByCode
                        );
                        const isOverseasEtf = marketClassName === '해외';
                        const pdfItems = isOverseasEtf ? pdfItemsUsaMapped : pdfItemsWithName;
                        return (
                        <tr className="bg-wealth-card/25 border-b border-gray-800/50">
                          <td colSpan={HOLDINGS_COL_COUNT} className="px-3 py-3 pl-6 align-top">
                            <div className={`w-fit max-w-full rounded-lg border border-gray-700/50 bg-wealth-dark/40 overflow-hidden ${isOverseasEtf ? 'min-w-[1000px]' : 'min-w-[860px]'}`}>
                              {pdfState.status === 'loading' && (
                                <p className="text-sm text-wealth-muted px-3 py-4">불러오는 중…</p>
                              )}
                              {pdfState.status === 'error' && (
                                <p className="text-sm text-red-400/90 px-3 py-4">{pdfState.error}</p>
                              )}
                              {pdfState.status === 'done' && pdfItems.length === 0 && (
                                <p className="text-sm text-wealth-muted px-3 py-4">
                                  {getPdfPortfolioEmptyMessage(marketClassName)}
                                </p>
                              )}
                              {pdfState.status === 'done' && pdfItems.length > 0 && (
                                <div className="w-fit max-w-full overflow-x-auto">
                                  <table className={`text-xs sm:text-sm border-collapse max-w-full ${isOverseasEtf ? 'min-w-[1000px]' : 'min-w-[860px]'}`}>
                                    <thead>
                                      <tr className="border-b border-gray-700/60 text-left bg-wealth-card/30">
                                        <th className="py-2 px-3 font-medium text-wealth-muted">티커</th>
                                        <th className="py-2 px-3 font-medium text-wealth-muted">종목명</th>
                                        <th className="py-2 px-3 font-medium text-wealth-muted whitespace-nowrap">
                                          시장구분
                                        </th>
                                        {isOverseasEtf && (
                                          <th className="py-2 px-3 font-medium text-wealth-muted whitespace-nowrap">
                                            업종명
                                          </th>
                                        )}
                                        <th className="py-2 px-3 font-medium text-right whitespace-nowrap text-wealth-muted">
                                          종가
                                        </th>
                                        <th className="py-2 px-3 font-medium text-right whitespace-nowrap text-wealth-muted">
                                          등락률
                                        </th>
                                        <th className="py-2 px-3 font-medium text-right whitespace-nowrap text-wealth-muted">
                                          거래량
                                        </th>
                                        <th className="py-2 px-3 font-medium text-right whitespace-nowrap text-wealth-muted">
                                          RSI(18)
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {pdfItems.map((p) => (
                                        <tr
                                          key={p.id}
                                          className="border-b border-gray-700/30 text-white"
                                        >
                                          <td className="py-1.5 px-3 font-mono text-wealth-gold">
                                            {isOverseasEtf
                                              ? p.display_ticker
                                              : (p.display_ticker ?? p.pdf_ticker)}
                                          </td>
                                          <td
                                            className="py-1.5 px-3 text-wealth-muted min-w-[12rem] truncate"
                                            title={p.stock_name}
                                          >
                                            {p.stock_name || '-'}
                                          </td>
                                          <td className="py-1.5 px-3 text-wealth-muted whitespace-nowrap">
                                            {p.stock_market || '-'}
                                          </td>
                                          {isOverseasEtf && (
                                            <td
                                              className="py-1.5 px-3 text-wealth-muted min-w-[8rem] max-w-[10rem] truncate"
                                              title={p.stock_industry_name}
                                            >
                                              {p.stock_industry_name || '-'}
                                            </td>
                                          )}
                                          <td className="py-1.5 px-3 text-right tabular-nums text-wealth-muted whitespace-nowrap">
                                            {isOverseasEtf
                                              ? fmtDec(p.stock_latest_close, 2)
                                              : fmtNum(p.stock_latest_close)}
                                          </td>
                                          <td
                                            className={`py-1.5 px-3 text-right tabular-nums whitespace-nowrap ${fluctuationRateColor(p.stock_fluctuation_rate)}`}
                                          >
                                            {fmtFluctuationRate(p.stock_fluctuation_rate)}
                                          </td>
                                          <td className="py-1.5 px-3 text-right tabular-nums text-wealth-muted whitespace-nowrap">
                                            {fmtNum(p.stock_latest_volume)}
                                          </td>
                                          <td className="py-1.5 px-3 text-right tabular-nums text-wealth-muted whitespace-nowrap">
                                            {fmtDec(p.stock_rsi18, 2)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })()}
                    </Fragment>
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

      <USAStockSelector
        isOpen={showUsaStockSelector}
        onClose={() => setShowUsaStockSelector(false)}
        onSelect={(stock) => {
          addHolding('usa_stock', stock.id);
          setShowUsaStockSelector(false);
        }}
      />

      <USAETFSelector
        isOpen={showUsaEtfSelector}
        onClose={() => setShowUsaEtfSelector(false)}
        onSelect={(etf) => {
          addHolding('usa_etf', etf.id);
          setShowUsaEtfSelector(false);
        }}
      />
    </div>
  );
}
