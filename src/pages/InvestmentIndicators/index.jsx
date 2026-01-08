import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout';
import DataGrid from '../../components/DataGrid';
import { getApiUrl, API_ENDPOINTS } from '../../utils/api';

const USA_INDICATOR_API_BASE_URL = getApiUrl(API_ENDPOINTS.USA_INDICATORS);

function InvestmentIndicators() {
  const [searchParams] = useSearchParams();
  const menuParam = searchParams.get('menu');
  // menu 파라미터가 없으면 기본값으로 usa-market-indicators 사용
  const menu = menuParam || 'usa-market-indicators';
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (menu === 'usa-market-indicators') {
      loadUSAIndicators();
    }
  }, [menu]);

  const loadUSAIndicators = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${USA_INDICATOR_API_BASE_URL}?skip=0&limit=10000`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`지표 조회 실패: ${response.status}`);
      }

      const data = await response.json();
      setIndicators(data || []);
    } catch (err) {
      console.error('Fetch Error:', err);
      setError(`데이터를 불러오는데 실패했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'indicator_nm',
      label: '지표명',
      align: 'left',
    },
    {
      key: 'ticker',
      label: '티커',
      align: 'center',
    },
    {
      key: 'weekly_macd_oscillator',
      label: '주봉MACD오실레이터',
      align: 'right',
    },
  ];

  const renderViewRow = (row, columns) => {
    return (
      <>
        {columns.map((col) => (
          <td
            key={col.key}
            className={`py-3 px-4 text-white text-sm border-r border-gray-700/50 last:border-r-0 break-words ${
              col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
            }`}
            style={{ width: `${100 / columns.length}%` }}
          >
            {row[col.key] || '-'}
          </td>
        ))}
      </>
    );
  };

  return (
    <AppLayout showSideNav={false}>
      <div className="space-y-6">
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">

          {menu === 'usa-market-indicators' && (
            <div className="mt-1">
              <h2 className="text-xl font-semibold text-white mb-4">미국시장지표</h2>
              
              {error && (
                <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="text-center py-8 text-wealth-muted">로딩 중...</div>
              ) : (
                <div className="bg-wealth-card/30 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
                  <div className="overflow-x-auto">
                    <DataGrid
                      columns={columns}
                      data={indicators}
                      loading={loading}
                      showActions={false}
                      showRowNumber={false}
                      renderViewRow={renderViewRow}
                      emptyMessage="등록된 종목이 없습니다."
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default InvestmentIndicators;

