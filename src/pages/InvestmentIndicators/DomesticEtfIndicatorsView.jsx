import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getStocksRestApiUrl, API_ENDPOINTS } from '../../utils/api';

const DOMESTIC_ETFS_URL = getStocksRestApiUrl(API_ENDPOINTS.DOMESTIC_ETFS);

function formatIntKO(v) {
  if (v === null || v === undefined || v === '') return '-';
  const n = Number(v);
  if (Number.isNaN(n)) return '-';
  return n.toLocaleString('ko-KR');
}

function formatTechDecimal(v, fractionDigits = 4) {
  if (v === null || v === undefined || v === '') return '-';
  const n = Number(v);
  if (Number.isNaN(n)) return '-';
  return n.toLocaleString('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  });
}

function formatCompensation(value) {
  if (value === null || value === undefined || value === '') return '-';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  if (n === 0) return '0%';
  // DB 값 그대로 %만 붙임 (×100 없음). 0.0500 → 0.05%, 0.3950 → 0.395%
  let s = n.toFixed(10);
  if (s.includes('.')) {
    s = s.replace(/0+$/, '').replace(/\.$/, '');
  }
  return `${s}%`;
}

function groupEtfsByBaseIndex(etfs) {
  const m = new Map();
  for (const e of etfs) {
    const raw = e.base_index;
    const key =
      raw != null && String(raw).trim() !== ''
        ? String(raw).trim()
        : '(기초지수 없음)';
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(e);
  }
  const entries = [...m.entries()];
  entries.sort((a, b) => {
    if (a[0] === '(기초지수 없음)') return 1;
    if (b[0] === '(기초지수 없음)') return -1;
    return a[0].localeCompare(b[0], 'ko');
  });
  for (const [, list] of entries) {
    list.sort((x, y) => String(x.ticker).localeCompare(String(y.ticker), 'ko'));
  }
  return entries;
}

function filterGroupsByLabel(groups, query) {
  const q = query.trim();
  if (!q) return groups;
  const lower = q.toLowerCase();
  return groups.filter(([label]) =>
    String(label).toLowerCase().includes(lower)
  );
}

export default function DomesticEtfIndicatorsView() {
  const [etfs, setEtfs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [groupFilter, setGroupFilter] = useState('');

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${DOMESTIC_ETFS_URL}?skip=0&limit=10000`);
      if (!res.ok) {
        throw new Error(`국내 ETF 조회 실패: ${res.status}`);
      }
      const data = await res.json();
      setEtfs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message || '데이터를 불러오지 못했습니다.');
      setEtfs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const groups = useMemo(() => groupEtfsByBaseIndex(etfs), [etfs]);

  const filteredGroups = useMemo(
    () => filterGroupsByLabel(groups, groupFilter),
    [groups, groupFilter]
  );

  const toggleGroup = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="max-w-[95%] mx-auto px-6 py-8">
      <h2 className="text-xl font-semibold text-white mb-4">국내 ETF 지표</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-wealth-muted">로딩 중...</div>
      ) : (
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6 flex flex-col max-h-[calc(100vh-180px)] min-h-0">
          <div className="shrink-0 mb-4 space-y-2">
            <label htmlFor="domestic-etf-group-filter" className="sr-only">
              기초지수 그룹명 필터
            </label>
            <input
              id="domestic-etf-group-filter"
              type="search"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              placeholder="기초지수 그룹명 검색…"
              autoComplete="off"
              className="w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-2.5 px-3 text-sm placeholder:text-wealth-muted/70 focus:outline-none focus:ring-2 focus:ring-wealth-gold/40"
            />
            {groups.length > 0 && (
              <p className="text-xs text-wealth-muted">
                그룹{' '}
                <span className="text-wealth-gold tabular-nums">{filteredGroups.length}</span>
                {groupFilter.trim() ? (
                  <>
                    {' '}
                    / 전체 <span className="text-wealth-muted tabular-nums">{groups.length}</span>
                  </>
                ) : null}
              </p>
            )}
          </div>
          <div className="space-y-1 flex-1 min-h-0 overflow-y-auto pr-1">
            {groups.length === 0 ? (
              <p className="text-wealth-muted text-sm py-4">표시할 ETF가 없습니다.</p>
            ) : filteredGroups.length === 0 ? (
              <p className="text-wealth-muted text-sm py-4">
                &quot;{groupFilter.trim()}&quot; 에 맞는 기초지수 그룹이 없습니다.
              </p>
            ) : (
              filteredGroups.map(([baseLabel, list]) => {
                const isOpen = expanded.has(baseLabel);
                return (
                  <div key={baseLabel} className="select-none">
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer group hover:bg-wealth-card/50">
                      <button
                        type="button"
                        onClick={() => toggleGroup(baseLabel)}
                        className="w-5 h-5 shrink-0 flex items-center justify-center rounded text-wealth-gold hover:text-yellow-300 hover:bg-wealth-gold/15 font-semibold text-[10px] leading-none border border-wealth-gold/40"
                        title={`ETF ${list.length}종목 — 펼치기/접기`}
                        aria-expanded={isOpen}
                        aria-label={isOpen ? '그룹 접기' : '그룹 펼치기'}
                      >
                        {isOpen ? '▼' : '▶'}
                      </button>
                      <span className="flex-1 text-white font-medium text-sm truncate min-w-0">
                        {baseLabel}
                      </span>
                      <span className="text-[10px] font-normal text-wealth-gold/90 whitespace-nowrap shrink-0 px-1.5 py-0.5 rounded bg-wealth-gold/10 border border-wealth-gold/25">
                        {list.length}
                      </span>
                    </div>
                    {isOpen && (
                      <div className="ml-6 mt-2 mb-4 border-l border-gray-700 pl-3">
                        <EtfMiniGrid rows={list} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EtfMiniGrid({ rows }) {
  if (!rows.length) {
    return <p className="text-wealth-muted text-sm p-4">종목이 없습니다.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700/50 bg-wealth-card/30">
      <table className="w-full text-sm border-collapse min-w-[1280px]">
        <thead>
          <tr className="border-b border-gray-700 text-left text-wealth-muted bg-wealth-card/40">
            <th className="py-2 px-3 font-medium whitespace-nowrap">티커</th>
            <th className="py-2 px-3 font-medium">종목명</th>
            <th className="py-2 px-3 font-medium text-right whitespace-nowrap">총보수</th>
            <th className="py-2 px-3 font-medium text-right whitespace-nowrap">종가</th>
            <th className="py-2 px-3 font-medium text-right whitespace-nowrap">거래량</th>
            <th className="py-2 px-3 font-medium text-right whitespace-nowrap">RSI(18)</th>
            <th className="py-2 px-3 font-medium text-right whitespace-nowrap">RSI(30)</th>
            <th className="py-2 px-3 font-medium text-right whitespace-nowrap">OBV</th>
            <th className="py-2 px-3 font-medium text-right whitespace-nowrap">MACD</th>
            <th className="py-2 px-3 font-medium text-right whitespace-nowrap">MACD Signal</th>
            <th className="py-2 px-3 font-medium text-right whitespace-nowrap">MACD Oscillator</th>
            <th className="py-2 px-3 font-medium text-right whitespace-nowrap">BB폭</th>
            <th className="py-2 px-3 font-medium text-right whitespace-nowrap">BB%B</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-gray-700/40 hover:bg-wealth-card/40"
            >
              <td className="py-2 px-3 text-wealth-gold font-mono whitespace-nowrap">
                {row.ticker}
              </td>
              <td className="py-2 px-3 text-white break-words">{row.name}</td>
              <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap">
                {formatCompensation(row.compensation)}
              </td>
              <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap tabular-nums">
                {formatIntKO(row.latest_close)}
              </td>
              <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap tabular-nums">
                {formatIntKO(row.latest_volume)}
              </td>
              <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap tabular-nums">
                {formatTechDecimal(row.rsi18, 2)}
              </td>
              <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap tabular-nums">
                {formatTechDecimal(row.rsi30, 2)}
              </td>
              <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap tabular-nums">
                {formatIntKO(
                  row.obv != null && row.obv !== ''
                    ? Math.round(Number(row.obv))
                    : null
                )}
              </td>
              <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap tabular-nums">
                {formatTechDecimal(row.macd_12_26, 4)}
              </td>
              <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap tabular-nums">
                {formatTechDecimal(row.macd_signal_9, 4)}
              </td>
              <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap tabular-nums">
                {formatTechDecimal(row.macd_histogram, 4)}
              </td>
              <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap tabular-nums">
                {formatTechDecimal(row.bb_width, 4)}
              </td>
              <td className="py-2 px-3 text-right text-wealth-muted whitespace-nowrap tabular-nums">
                {formatTechDecimal(row.bb_percent_b, 4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
