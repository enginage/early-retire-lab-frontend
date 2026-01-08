import React, { useState, useEffect } from 'react';
import DataGrid from '../../components/DataGrid';
import { getApiUrl, API_ENDPOINTS } from '../../utils/api';

const USA_INDICATOR_API_BASE_URL = getApiUrl(API_ENDPOINTS.USA_INDICATORS);

function InvestmentIndicatorsSettings() {
  const [activeTab, setActiveTab] = useState('usa-indicators'); // 'usa-indicators' or 'domestic-indicators'
  const [indicators, setIndicators] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [newRow, setNewRow] = useState({
    ticker: '',
    indicator_nm: '',
    order_no: 0,
    weekly_macd_oscillator: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'usa-indicators') {
      loadIndicators();
    }
  }, [activeTab]);

  const loadIndicators = async () => {
    try {
      setLoading(true);
      console.log('Loading indicators from:', USA_INDICATOR_API_BASE_URL);
      const response = await fetch(`${USA_INDICATOR_API_BASE_URL}?skip=0&limit=10000`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status, response.ok);
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded indicators:', data);
        setIndicators(data || []);
      } else {
        const errorText = await response.text();
        console.error('Failed to load indicators:', response.status, errorText);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
      // 에러 발생 시 조용히 처리 (화면에 표시하지 않음)
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setNewRow({
      ticker: '',
      indicator_nm: '',
      order_no: 0,
      weekly_macd_oscillator: '',
    });
    setEditingId('new');
  };

  const handleSave = async (indicatorData) => {
    try {
      setLoading(true);

      if (!indicatorData.ticker || indicatorData.ticker.trim() === '') {
        alert('종목코드를 입력해주세요.');
        setLoading(false);
        return;
      }
      if (!indicatorData.indicator_nm || indicatorData.indicator_nm.trim() === '') {
        alert('지표명을 입력해주세요.');
        setLoading(false);
        return;
      }

      const payload = {
        ticker: indicatorData.ticker,
        indicator_nm: indicatorData.indicator_nm,
        order_no: indicatorData.order_no || 0,
        weekly_macd_oscillator: indicatorData.weekly_macd_oscillator ? parseFloat(indicatorData.weekly_macd_oscillator) : null,
      };

      let response;
      if (indicatorData.id) {
        // 업데이트
        response = await fetch(`${USA_INDICATOR_API_BASE_URL}/${indicatorData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } else {
        // 생성
        response = await fetch(USA_INDICATOR_API_BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        const savedData = await response.json();
        console.log('Saved indicator:', savedData);
        // 저장 후 목록 다시 로드
        await loadIndicators();
        setEditingId(null);
        setNewRow({
          ticker: '',
          indicator_nm: '',
          order_no: 0,
          weekly_macd_oscillator: '',
        });
      } else {
        const errorData = await response.json().catch(() => ({ detail: '저장에 실패했습니다.' }));
        console.error('Save failed:', response.status, errorData);
        alert(errorData.detail || '저장에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${USA_INDICATOR_API_BASE_URL}/${id}`, {
        method: 'DELETE',
      });

      if (response.ok || response.status === 204) {
        await loadIndicators();
      } else {
        const errorData = await response.json();
        alert(errorData.detail || '삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id) => {
    setEditingId(id);
  };

  const handleCancel = () => {
    setEditingId(null);
    setNewRow({
      ticker: '',
      indicator_nm: '',
      order_no: 0,
      weekly_macd_oscillator: '',
    });
  };

  const handleInputChange = (id, field, value) => {
    if (id === 'new') {
      setNewRow((prev) => ({ ...prev, [field]: value }));
    } else {
      setIndicators((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
      );
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">투자지표 설정</h1>
        <p className="text-wealth-muted">투자지표 종목을 관리합니다.</p>
      </div>

      <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl">
        {/* 탭 헤더 */}
        <div className="border-b border-gray-800">
          <nav className="flex space-x-1 px-6 pt-4">
            <button
              onClick={() => setActiveTab('usa-indicators')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'usa-indicators'
                  ? 'text-wealth-gold border-wealth-gold'
                  : 'text-wealth-muted border-transparent hover:text-white hover:border-gray-700'
              }`}
            >
              미장지표
            </button>
            <button
              onClick={() => setActiveTab('domestic-indicators')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'domestic-indicators'
                  ? 'text-wealth-gold border-wealth-gold'
                  : 'text-wealth-muted border-transparent hover:text-white hover:border-gray-700'
              }`}
            >
              국장지표
            </button>
          </nav>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="p-6">
          {activeTab === 'usa-indicators' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">미국시장지표</h2>
                <button
                  onClick={handleAdd}
                  disabled={loading || editingId === 'new'}
                  className="px-4 py-2 bg-wealth-gold text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + 추가
                </button>
              </div>

              <DataGrid
                columns={[
                  { key: 'ticker', label: '종목코드(티커)', align: 'left' },
                  { key: 'indicator_nm', label: '지표명', align: 'left' },
                  { key: 'order_no', label: '정렬순서', align: 'center' },
                  { key: 'weekly_macd_oscillator', label: '주봉MACD오실레이터', align: 'right' },
                ]}
                data={indicators}
                editingId={editingId}
                selectedId={null}
                onRowClick={null}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSave={(row) => handleSave(row || newRow)}
                onCancel={handleCancel}
                loading={loading}
                showRowNumber={true}
                showActions={true}
                renderNewRow={() => (
                  <>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={newRow.ticker}
                        onChange={(e) => handleInputChange('new', 'ticker', e.target.value)}
                        className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                        placeholder="종목코드"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={newRow.indicator_nm}
                        onChange={(e) => handleInputChange('new', 'indicator_nm', e.target.value)}
                        className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                        placeholder="지표명"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        value={newRow.order_no}
                        onChange={(e) => handleInputChange('new', 'order_no', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                        placeholder="정렬순서"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        step="0.0001"
                        value={newRow.weekly_macd_oscillator}
                        onChange={(e) => handleInputChange('new', 'weekly_macd_oscillator', e.target.value)}
                        className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                        placeholder="주봉MACD오실레이터"
                      />
                    </td>
                  </>
                )}
                renderEditRow={(row) => (
                  <>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={row.ticker}
                        onChange={(e) => handleInputChange(row.id, 'ticker', e.target.value)}
                        className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={row.indicator_nm}
                        onChange={(e) => handleInputChange(row.id, 'indicator_nm', e.target.value)}
                        className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        value={row.order_no}
                        onChange={(e) => handleInputChange(row.id, 'order_no', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        step="0.0001"
                        value={row.weekly_macd_oscillator || ''}
                        onChange={(e) => handleInputChange(row.id, 'weekly_macd_oscillator', e.target.value)}
                        className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                      />
                    </td>
                  </>
                )}
                renderViewRow={(row) => (
                  <>
                    <td className="py-3 px-4 text-white text-sm">{row.ticker}</td>
                    <td className="py-3 px-4 text-white text-sm">{row.indicator_nm}</td>
                    <td className="py-3 px-4 text-white text-sm text-center">{row.order_no}</td>
                    <td className="py-3 px-4 text-white text-sm text-right">{row.weekly_macd_oscillator || '-'}</td>
                  </>
                )}
                emptyMessage="등록된 지표가 없습니다."
              />
            </div>
          )}

          {activeTab === 'domestic-indicators' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white">국내시장지표</h2>
              <div className="text-wealth-muted">
                국장지표 기능이 준비 중입니다.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InvestmentIndicatorsSettings;

