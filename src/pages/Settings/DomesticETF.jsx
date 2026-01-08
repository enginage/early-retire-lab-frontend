import React, { useState, useEffect } from 'react';
import DataGrid from '../../components/DataGrid';

import { getApiUrl, API_ENDPOINTS } from '../../utils/api';

const API_BASE_URL = getApiUrl(API_ENDPOINTS.DOMESTIC_ETFS);
const MASTER_API_BASE_URL = getApiUrl(API_ENDPOINTS.COMMON_CODE_MASTERS);
const DETAIL_API_BASE_URL = getApiUrl(API_ENDPOINTS.COMMON_CODE_DETAILS);

function DomesticETF() {
  const [allEtfs, setAllEtfs] = useState([]); // 전체 데이터 (DB에서 한 번만 읽음)
  const [etfs, setEtfs] = useState([]); // 필터링된 데이터
  const [searchQuery, setSearchQuery] = useState(''); // 검색어
  const [selectedTaxType, setSelectedTaxType] = useState(''); // 선택된 과세유형
  const [editingId, setEditingId] = useState(null);
  const [newRow, setNewRow] = useState({
    ticker: '',
    name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // 초기 로드 여부
  const [etfTypeOptions, setEtfTypeOptions] = useState([]); // ETF 유형 옵션
  const [etfTypeMasterId, setEtfTypeMasterId] = useState(null); // ETF 유형 마스터 ID
  const [etfTaxTypeOptions, setEtfTaxTypeOptions] = useState([]); // 과세유형 옵션
  const [etfTaxTypeMasterId, setEtfTaxTypeMasterId] = useState(null); // 과세유형 마스터 ID

  useEffect(() => {
    if (isInitialLoad) {
      loadEtfTypeOptions();
      loadEtfTaxTypeOptions();
      loadETFs();
      setIsInitialLoad(false);
    }
  }, [isInitialLoad]);

  // ETF 유형 공통코드 로드
  const loadEtfTypeOptions = async () => {
    try {
      // 먼저 마스터 코드 찾기 (ETF_TYPE 또는 etf_type)
      const masterResponse = await fetch(MASTER_API_BASE_URL);
      if (masterResponse.ok) {
        const masters = await masterResponse.json();
        
        // 여러 패턴으로 마스터 찾기
        const etfTypeMaster = masters.find(m => 
          m.code === 'ETF_TYPE' || 
          m.code === 'etf_type' || 
          m.code === 'ETF_TP' ||
          (m.code_name?.toLowerCase().includes('etf') && m.code_name?.toLowerCase().includes('type')) ||
          (m.code_name?.toLowerCase().includes('etf') && m.code_name?.toLowerCase().includes('유형'))
        );
        
        if (etfTypeMaster) {
          setEtfTypeMasterId(etfTypeMaster.id);
          // 상세 코드 로드
          const detailResponse = await fetch(`${DETAIL_API_BASE_URL}?master_id=${etfTypeMaster.id}`);
          if (detailResponse.ok) {
            const details = await detailResponse.json();
            setEtfTypeOptions(details);
          }
        }
      }
    } catch (err) {
      console.error('ETF 유형 옵션 로드 실패:', err);
    }
  };

  // 과세유형 공통코드 로드
  const loadEtfTaxTypeOptions = async () => {
    try {
      // 먼저 마스터 코드 찾기 (etf_tax_type만 정확히 찾기)
      const masterResponse = await fetch(MASTER_API_BASE_URL);
      if (masterResponse.ok) {
        const masters = await masterResponse.json();
        
        // etf_tax_type만 정확히 찾기
        const etfTaxTypeMaster = masters.find(m => 
          m.code === 'etf_tax_type'
        );
        
        if (etfTaxTypeMaster) {
          setEtfTaxTypeMasterId(etfTaxTypeMaster.id);
          // 상세 코드 로드
          const detailResponse = await fetch(`${DETAIL_API_BASE_URL}?master_id=${etfTaxTypeMaster.id}`);
          if (detailResponse.ok) {
            const details = await detailResponse.json();
            setEtfTaxTypeOptions(details);
          }
        }
      }
    } catch (err) {
      console.error('과세유형 옵션 로드 실패:', err);
    }
  };

  // 검색어 및 과세유형 변경 시 필터링
  useEffect(() => {
    let filtered = allEtfs;

    // 검색어 필터링
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(etf => 
        etf.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        etf.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 과세유형 필터링
    if (selectedTaxType !== '') {
      filtered = filtered.filter(etf => etf.etf_tax_type === selectedTaxType);
    }

    setEtfs(filtered);
  }, [searchQuery, selectedTaxType, allEtfs]);

  const loadETFs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}?skip=0&limit=10000`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAllEtfs(data); // 전체 데이터 저장
        setEtfs(data); // 초기에는 전체 데이터 표시
      } else {
        const errorText = await response.text();
        setError(`데이터를 불러오는데 실패했습니다. (${response.status}): ${errorText}`);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
      setError(`서버에 연결할 수 없습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setNewRow({
      ticker: '',
      name: '',
      etf_type: '',
      etf_tax_type: '',
    });
    setEditingId('new');
  };

  const handleSave = async (etfData) => {
    try {
      setLoading(true);
      setError(null);

      // 필수 필드 검증
      if (!etfData.ticker || etfData.ticker.trim() === '') {
        setError('종목코드를 입력해주세요.');
        setLoading(false);
        return;
      }
      if (!etfData.name || etfData.name.trim() === '') {
        setError('종목명을 입력해주세요.');
        setLoading(false);
        return;
      }

      const payload = {
        ticker: etfData.ticker,
        name: etfData.name,
        etf_type: etfData.etf_type || null,
        etf_tax_type: etfData.etf_tax_type || null,
      };

      let response;
      if (etfData.id) {
        // 업데이트
        response = await fetch(`${API_BASE_URL}/${etfData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } else {
        // 생성
        response = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        // 저장 후 전체 데이터 다시 로드 (useEffect에서 자동으로 필터링됨)
        const reloadResponse = await fetch(`${API_BASE_URL}?skip=0&limit=10000`);
        if (reloadResponse.ok) {
          const data = await reloadResponse.json();
          setAllEtfs(data);
        }
        setEditingId(null);
        setNewRow({
          ticker: '',
          name: '',
          etf_type: '',
          etf_tax_type: '',
        });
      } else {
        const errorData = await response.json();
        setError(errorData.detail || '저장에 실패했습니다.');
      }
    } catch (err) {
      setError('저장 중 오류가 발생했습니다.');
      console.error(err);
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
      setError(null);
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
      });

      if (response.ok || response.status === 204) {
        // 삭제 후 전체 데이터 다시 로드 (useEffect에서 자동으로 필터링됨)
        const reloadResponse = await fetch(`${API_BASE_URL}?skip=0&limit=10000`);
        if (reloadResponse.ok) {
          const data = await reloadResponse.json();
          setAllEtfs(data);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.detail || '삭제에 실패했습니다.');
      }
    } catch (err) {
      setError('삭제 중 오류가 발생했습니다.');
      console.error(err);
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
      name: '',
      etf_type: '',
      etf_tax_type: '',
    });
  };

  const handleInputChange = (id, field, value) => {
    if (id === 'new') {
      setNewRow((prev) => ({ ...prev, [field]: value }));
    } else {
      setEtfs((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
      );
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">국내 ETF</h1>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">ETF 목록</h2>
          <button
            onClick={handleAdd}
            disabled={loading || editingId === 'new'}
            className="px-4 py-2 bg-wealth-gold text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + 추가
          </button>
        </div>

        {/* 검색 컴포넌트 */}
        <div className="mb-6">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-wealth-muted mb-2">
                종목
              </label>
              <div className="relative max-w-xs">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-wealth-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-full text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-wealth-gold focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-wealth-muted mb-2">
                과세유형
              </label>
              <select
                value={selectedTaxType}
                onChange={(e) => setSelectedTaxType(e.target.value)}
                className="w-full max-w-xs px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-wealth-gold focus:border-transparent"
              >
                <option value="">전체</option>
                {etfTaxTypeOptions.map((option) => (
                  <option key={option.id} value={option.detail_code}>
                    {option.detail_code_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DataGrid
          columns={[
            { key: 'ticker', label: '종목코드', align: 'left' },
            { key: 'name', label: '종목명', align: 'left' },
            { key: 'etf_type', label: 'ETF유형', align: 'left' },
            { key: 'etf_tax_type', label: '과세유형', align: 'left' },
          ]}
          data={etfs}
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
                  value={newRow.name}
                  onChange={(e) => handleInputChange('new', 'name', e.target.value)}
                  className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                  placeholder="종목명"
                />
              </td>
              <td className="py-3 px-4">
                <select
                  value={newRow.etf_type || ''}
                  onChange={(e) => handleInputChange('new', 'etf_type', e.target.value)}
                  className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                >
                  <option value="">선택하세요</option>
                  {etfTypeOptions.map((option) => (
                    <option key={option.id} value={option.detail_code}>
                      {option.detail_code_name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-3 px-4">
                <select
                  value={newRow.etf_tax_type || ''}
                  onChange={(e) => handleInputChange('new', 'etf_tax_type', e.target.value)}
                  className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                >
                  <option value="">선택하세요</option>
                  {etfTaxTypeOptions.map((option) => (
                    <option key={option.id} value={option.detail_code}>
                      {option.detail_code_name}
                    </option>
                  ))}
                </select>
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
                  value={row.name}
                  onChange={(e) => handleInputChange(row.id, 'name', e.target.value)}
                  className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                />
              </td>
              <td className="py-3 px-4">
                <select
                  value={row.etf_type || ''}
                  onChange={(e) => handleInputChange(row.id, 'etf_type', e.target.value)}
                  className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                >
                  <option value="">선택하세요</option>
                  {etfTypeOptions && etfTypeOptions.length > 0 ? (
                    etfTypeOptions.map((option) => (
                      <option key={option.id} value={option.detail_code}>
                        {option.detail_code_name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>옵션 로딩 중...</option>
                  )}
                </select>
              </td>
              <td className="py-3 px-4">
                <select
                  value={row.etf_tax_type || ''}
                  onChange={(e) => handleInputChange(row.id, 'etf_tax_type', e.target.value)}
                  className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                >
                  <option value="">선택하세요</option>
                  {etfTaxTypeOptions && etfTaxTypeOptions.length > 0 ? (
                    etfTaxTypeOptions.map((option) => (
                      <option key={option.id} value={option.detail_code}>
                        {option.detail_code_name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>옵션 로딩 중...</option>
                  )}
                </select>
              </td>
            </>
          )}
          renderViewRow={(row) => {
            const etfTypeName = etfTypeOptions.find(opt => opt.detail_code === row.etf_type)?.detail_code_name || row.etf_type || '';
            const etfTaxTypeName = etfTaxTypeOptions.find(opt => opt.detail_code === row.etf_tax_type)?.detail_code_name || row.etf_tax_type || '';
            return (
              <>
                <td className="py-3 px-4 text-white text-sm">{row.ticker}</td>
                <td className="py-3 px-4 text-white text-sm">{row.name}</td>
                <td className="py-3 px-4 text-white text-sm">{etfTypeName}</td>
                <td className="py-3 px-4 text-white text-sm">{etfTaxTypeName}</td>
              </>
            );
          }}
          emptyMessage="등록된 ETF가 없습니다."
        />
      </div>
    </div>
  );
}

export default DomesticETF;

