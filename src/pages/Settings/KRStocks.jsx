import React, { useState, useEffect } from 'react';
import DataGrid from '../../components/DataGrid';
import { getApiUrl, API_ENDPOINTS } from '../../utils/api';

const API_BASE_URL = getApiUrl(API_ENDPOINTS.KR_STOCKS);
const COMMON_CODE_DETAILS_API = getApiUrl(API_ENDPOINTS.COMMON_CODE_DETAILS);

function KRStocks() {
  const [allStocks, setAllStocks] = useState([]); // 전체 데이터 (DB에서 한 번만 읽음)
  const [stocks, setStocks] = useState([]); // 필터링된 데이터
  const [searchQuery, setSearchQuery] = useState(''); // 검색어
  const [selectedMarket, setSelectedMarket] = useState(''); // 선택된 시장구분
  const [selectedIndustry, setSelectedIndustry] = useState(''); // 선택된 업종구분
  const [industryOptions, setIndustryOptions] = useState([]); // 업종 코드/명 목록
  const [industryMap, setIndustryMap] = useState({}); // 업종코드 -> 업종명
  const [editingId, setEditingId] = useState(null);
  const [isOpinionModalOpen, setIsOpinionModalOpen] = useState(false);
  const [editingOpinionId, setEditingOpinionId] = useState(null);
  const [opinionText, setOpinionText] = useState('');
  const [newRow, setNewRow] = useState({
    ticker: '',
    name: '',
    market: 'KOSPI',
    opinion: '',
    short_play_yn: false,
    nxt_yn: false,
    use_yn: true,
    suspend_yn: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStocks();
    loadIndustryTypes();
  }, []);

  // 검색어 및 시장구분/업종구분 변경 시 필터링
  useEffect(() => {
    let filtered = allStocks;

    // 검색어 필터링
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(stock => 
        stock.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 시장구분 필터링
    if (selectedMarket !== '') {
      filtered = filtered.filter(stock => stock.market === selectedMarket);
    }

    // 업종구분 필터링
    if (selectedIndustry !== '') {
      filtered = filtered.filter(stock => stock.kr_industry_type === selectedIndustry);
    }

    setStocks(filtered);
  }, [searchQuery, selectedMarket, selectedIndustry, allStocks]);

  const loadStocks = async () => {
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
        setAllStocks(data); // 전체 데이터 저장
        setStocks(data); // 초기에는 전체 데이터 표시
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

  const loadIndustryTypes = async () => {
    try {
      const response = await fetch(`${COMMON_CODE_DETAILS_API}?master_id=10&skip=0&limit=10000`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const options = data
          .filter(item => item.detail_code && item.detail_code_name)
          .map(item => ({
            code: item.detail_code,
            name: item.detail_code_name,
          }));

        const map = {};
        options.forEach(item => {
          map[item.code] = item.name;
        });

        setIndustryOptions(options);
        setIndustryMap(map);
      }
    } catch (err) {
      console.error('업종구분 로드 실패:', err);
    }
  };

  const handleAdd = () => {
    setNewRow({
      ticker: '',
      name: '',
      market: 'KOSPI',
      kr_industry_type: '',
      opinion: '',
      short_play_yn: false,
      nxt_yn: false,
      use_yn: true,
      suspend_yn: false,
    });
    setEditingId('new');
  };

  const handleOpinionClick = (stock) => {
    setEditingOpinionId(stock.id);
    setOpinionText(stock.opinion || '');
    setIsOpinionModalOpen(true);
  };

  const handleOpinionSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const stock = stocks.find(s => s.id === editingOpinionId) || 
                    allStocks.find(s => s.id === editingOpinionId);
      
      if (!stock) {
        setError('주식을 찾을 수 없습니다.');
        setLoading(false);
        return;
      }

      const trimmedText = opinionText.trim();
      const payload = {
        opinion: trimmedText === '' ? null : trimmedText,
      };

      const response = await fetch(`${API_BASE_URL}/${editingOpinionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // 저장 후 전체 데이터 다시 로드
        const reloadResponse = await fetch(`${API_BASE_URL}?skip=0&limit=10000`);
        if (reloadResponse.ok) {
          const data = await reloadResponse.json();
          setAllStocks(data);
        }
        setIsOpinionModalOpen(false);
        setEditingOpinionId(null);
        setOpinionText('');
      } else {
        let errorMessage = '저장에 실패했습니다.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          const errorText = await response.text();
          errorMessage = `저장 실패 (${response.status}): ${errorText}`;
        }
        setError(errorMessage);
        console.error('Save error:', response.status, errorMessage);
      }
    } catch (err) {
      setError(`저장 중 오류가 발생했습니다: ${err.message}`);
      console.error('Save error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpinionCancel = () => {
    setIsOpinionModalOpen(false);
    setEditingOpinionId(null);
    setOpinionText('');
  };

  const handleSave = async (stockData) => {
    try {
      setLoading(true);
      setError(null);

      // 필수 필드 검증
      if (!stockData.ticker || stockData.ticker.trim() === '') {
        setError('종목코드를 입력해주세요.');
        setLoading(false);
        return;
      }
      if (!stockData.name || stockData.name.trim() === '') {
        setError('종목명을 입력해주세요.');
        setLoading(false);
        return;
      }
      if (!stockData.market || stockData.market.trim() === '') {
        setError('시장구분을 선택해주세요.');
        setLoading(false);
        return;
      }

      const payload = {
        ticker: stockData.ticker.trim(),
        name: stockData.name.trim(),
        market: stockData.market,
        business_summary: stockData.business_summary || null,
        kr_industry_type: stockData.kr_industry_type || null,
        opinion: stockData.opinion || null,
        short_play_yn: typeof stockData.short_play_yn === 'boolean' ? stockData.short_play_yn : false,
        nxt_yn: typeof stockData.nxt_yn === 'boolean' ? stockData.nxt_yn : false,
        use_yn: typeof stockData.use_yn === 'boolean' ? stockData.use_yn : true,
        suspend_yn: typeof stockData.suspend_yn === 'boolean' ? stockData.suspend_yn : false,
      };

      let response;
      if (stockData.id) {
        // 업데이트
        response = await fetch(`${API_BASE_URL}/${stockData.id}`, {
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
          setAllStocks(data);
        }
        setEditingId(null);
        setNewRow({
          ticker: '',
          name: '',
          market: 'KOSPI',
          kr_industry_type: '',
          opinion: '',
          short_play_yn: false,
          nxt_yn: false,
          use_yn: true,
          suspend_yn: false,
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
          setAllStocks(data);
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
      market: 'KOSPI',
      kr_industry_type: '',
      opinion: '',
      short_play_yn: false,
      nxt_yn: false,
      use_yn: true,
      suspend_yn: false,
      });
  };

  const handleInputChange = (id, field, value) => {
    if (id === 'new') {
      setNewRow((prev) => ({ ...prev, [field]: value }));
    } else {
      setStocks((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
      );
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-wealth-gold to-yellow-200 mb-2 whitespace-nowrap">
          국내 주식
        </h1>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">주식 목록</h2>
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
          <div className="flex items-end gap-4 flex-wrap">
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
                시장구분
              </label>
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="w-full max-w-xs px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-wealth-gold focus:border-transparent"
              >
                <option value="">전체</option>
                <option value="KOSPI">KOSPI</option>
                <option value="KOSDAQ">KOSDAQ</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-wealth-muted mb-2">
                업종구분
              </label>
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="w-full max-w-xs px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-wealth-gold focus:border-transparent"
              >
                <option value="">전체</option>
                {industryOptions
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(option => (
                  <option key={option.code} value={option.code}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DataGrid
          columns={[
            { key: 'ticker', label: '종목코드', align: 'left', width: '120px', nowrap: true },
            { key: 'name', label: '종목명', align: 'left', width: '150px', nowrap: true },
            { key: 'market', label: '시장구분', align: 'left', width: '100px', nowrap: true },
            {
              key: 'kr_industry_type',
              label: '업종명',
              align: 'left',
              width: '160px',
              nowrap: true,
              render: (value) => industryMap[value] || '-',
            },
            { key: 'opinion', label: '의견', align: 'left', width: '300px', maxWidth: '400px', nowrap: false },
            {
              key: 'short_play_yn',
              label: '공매도play여부',
              align: 'center',
              width: '110px',
              nowrap: true,
              render: (value) => (value ? 'Y' : 'N'),
            },
            {
              key: 'nxt_yn',
              label: 'nxt거래여부',
              align: 'center',
              width: '110px',
              nowrap: true,
              render: (value) => (value ? 'Y' : 'N'),
            },
            {
              key: 'use_yn',
              label: '사용여부',
              align: 'center',
              width: '110px',
              nowrap: true,
              render: (value) => (value ? '사용' : '미사용'),
            },
            {
              key: 'suspend_yn',
              label: '거래정지여부',
              align: 'center',
              width: '110px',
              nowrap: true,
              render: (value) => (value ? 'Y' : 'N'),
            },
          ]}
          data={stocks}
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
              <td className="py-3 px-4 whitespace-nowrap" style={{ width: '120px' }}>
                <input
                  type="text"
                  value={newRow.ticker}
                  onChange={(e) => handleInputChange('new', 'ticker', e.target.value)}
                  className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                  placeholder="종목코드"
                />
              </td>
              <td className="py-3 px-4 whitespace-nowrap" style={{ width: '150px' }}>
                <input
                  type="text"
                  value={newRow.name}
                  onChange={(e) => handleInputChange('new', 'name', e.target.value)}
                  className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                  placeholder="종목명"
                />
              </td>
              <td className="py-3 px-4 whitespace-nowrap" style={{ width: '100px' }}>
                <select
                  value={newRow.market}
                  onChange={(e) => handleInputChange('new', 'market', e.target.value)}
                  className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                >
                  <option value="KOSPI">KOSPI</option>
                  <option value="KOSDAQ">KOSDAQ</option>
                </select>
              </td>
              <td className="py-3 px-4 whitespace-nowrap" style={{ width: '160px' }}>
                <select
                  value={newRow.kr_industry_type || ''}
                  onChange={(e) => handleInputChange('new', 'kr_industry_type', e.target.value)}
                  className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                >
                  <option value="">선택</option>
                  {industryOptions
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.name}
                      </option>
                    ))}
                </select>
              </td>
              <td className="py-3 px-4" style={{ width: '300px', maxWidth: '400px' }}>
                <input
                  type="text"
                  value={newRow.opinion || ''}
                  onChange={(e) => handleInputChange('new', 'opinion', e.target.value)}
                  className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                  placeholder="의견"
                />
              </td>
              <td className="py-3 px-4 whitespace-nowrap" style={{ width: '110px' }}>
                <select
                  value={newRow.short_play_yn ? 'true' : 'false'}
                  onChange={(e) => handleInputChange('new', 'short_play_yn', e.target.value === 'true')}
                  className="w-full px-2 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                >
                  <option value="true">Y</option>
                  <option value="false">N</option>
                </select>
              </td>
              <td className="py-3 px-4 whitespace-nowrap" style={{ width: '110px' }}>
                <select
                  value={newRow.nxt_yn ? 'true' : 'false'}
                  onChange={(e) => handleInputChange('new', 'nxt_yn', e.target.value === 'true')}
                  className="w-full px-2 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                >
                  <option value="true">Y</option>
                  <option value="false">N</option>
                </select>
              </td>
              <td className="py-3 px-4 whitespace-nowrap" style={{ width: '110px' }}>
                <select
                  value={newRow.use_yn ? 'true' : 'false'}
                  onChange={(e) => handleInputChange('new', 'use_yn', e.target.value === 'true')}
                  className="w-full px-2 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                >
                  <option value="true">사용</option>
                  <option value="false">미사용</option>
                </select>
              </td>
              <td className="py-3 px-4 whitespace-nowrap" style={{ width: '110px' }}>
                <select
                  value={newRow.suspend_yn ? 'true' : 'false'}
                  onChange={(e) => handleInputChange('new', 'suspend_yn', e.target.value === 'true')}
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
              <td className="py-3 px-4 whitespace-nowrap" style={{ width: '120px' }}>
                <input
                  type="text"
                  value={row.ticker}
                  onChange={(e) => handleInputChange(row.id, 'ticker', e.target.value)}
                  className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                />
              </td>
              <td className="py-3 px-4 whitespace-nowrap" style={{ width: '150px' }}>
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => handleInputChange(row.id, 'name', e.target.value)}
                  className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                />
              </td>
              <td className="py-3 px-4 whitespace-nowrap" style={{ width: '100px' }}>
                <select
                  value={row.market}
                  onChange={(e) => handleInputChange(row.id, 'market', e.target.value)}
                  className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                >
                  <option value="KOSPI">KOSPI</option>
                  <option value="KOSDAQ">KOSDAQ</option>
                </select>
              </td>
              <td className="py-3 px-4 whitespace-nowrap" style={{ width: '160px' }}>
                <select
                  value={row.kr_industry_type || ''}
                  onChange={(e) => handleInputChange(row.id, 'kr_industry_type', e.target.value)}
                  className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                >
                  <option value="">선택</option>
                  {industryOptions
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.name}
                      </option>
                    ))}
                </select>
              </td>
              <td className="py-3 px-4" style={{ width: '300px', maxWidth: '400px' }}>
                <input
                  type="text"
                  value={row.opinion || ''}
                  onChange={(e) => handleInputChange(row.id, 'opinion', e.target.value)}
                  className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                  placeholder="의견"
                />
              </td>
              <td className="py-3 px-4 whitespace-nowrap" style={{ width: '110px' }}>
                <select
                  value={row.short_play_yn === true ? 'true' : 'false'}
                  onChange={(e) => handleInputChange(row.id, 'short_play_yn', e.target.value === 'true')}
                  className="w-full px-2 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                >
                  <option value="true">Y</option>
                  <option value="false">N</option>
                </select>
              </td>
              <td className="py-3 px-4 whitespace-nowrap" style={{ width: '110px' }}>
                <select
                  value={row.nxt_yn ? 'true' : 'false'}
                  onChange={(e) => handleInputChange(row.id, 'nxt_yn', e.target.value === 'true')}
                  className="w-full px-2 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                >
                  <option value="true">Y</option>
                  <option value="false">N</option>
                </select>
              </td>
              <td className="py-3 px-4 whitespace-nowrap" style={{ width: '110px' }}>
                <select
                  value={row.use_yn ? 'true' : 'false'}
                  onChange={(e) => handleInputChange(row.id, 'use_yn', e.target.value === 'true')}
                  className="w-full px-2 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                >
                  <option value="true">사용</option>
                  <option value="false">미사용</option>
                </select>
              </td>
              <td className="py-3 px-4 whitespace-nowrap" style={{ width: '110px' }}>
                <select
                  value={row.suspend_yn ? 'true' : 'false'}
                  onChange={(e) => handleInputChange(row.id, 'suspend_yn', e.target.value === 'true')}
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
              <td className="py-3 px-4 text-white text-sm whitespace-nowrap" style={{ width: '120px' }}>{row.ticker}</td>
              <td className="py-3 px-4 text-white text-sm whitespace-nowrap" style={{ width: '150px' }}>{row.name}</td>
              <td className="py-3 px-4 text-white text-sm whitespace-nowrap" style={{ width: '100px' }}>{row.market}</td>
              <td className="py-3 px-4 text-white text-sm whitespace-nowrap" style={{ width: '160px' }}>
                {industryMap[row.kr_industry_type] || '-'}
              </td>
              <td className="py-3 px-4 text-white text-sm" style={{ width: '300px', maxWidth: '400px' }}>
                <button
                  onClick={() => handleOpinionClick(row)}
                  className="text-left w-full hover:text-wealth-gold transition-colors break-words"
                  title="클릭하여 의견 편집"
                >
                  {row.opinion ? (
                    <span className="line-clamp-2 break-words">{row.opinion}</span>
                  ) : (
                    <span className="text-wealth-muted italic">클릭하여 입력</span>
                  )}
                </button>
              </td>
              <td className="py-3 px-4 text-white text-sm whitespace-nowrap text-center" style={{ width: '110px' }}>
                {row.short_play_yn ? 'Y' : 'N'}
              </td>
              <td className="py-3 px-4 text-white text-sm whitespace-nowrap text-center" style={{ width: '110px' }}>
                {row.nxt_yn ? 'Y' : 'N'}
              </td>
              <td className="py-3 px-4 text-white text-sm whitespace-nowrap text-center" style={{ width: '110px' }}>
                {row.use_yn ? '사용' : '미사용'}
              </td>
              <td className="py-3 px-4 text-white text-sm whitespace-nowrap text-center" style={{ width: '110px' }}>
                {row.suspend_yn ? 'Y' : 'N'}
              </td>
            </>
          )}
          emptyMessage="등록된 주식이 없습니다."
        />
      </div>

      {/* 의견 모달 */}
      {isOpinionModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-wealth-card rounded-xl p-6 w-full max-w-2xl">
            <h3 className="text-xl font-bold text-white mb-4">의견 편집</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-wealth-muted mb-2">
                의견
              </label>
              <textarea
                value={opinionText}
                onChange={(e) => setOpinionText(e.target.value)}
                className="w-full px-4 py-3 bg-wealth-card border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                rows={8}
                placeholder="의견을 입력하세요"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleOpinionCancel}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleOpinionSave}
                disabled={loading}
                className="px-4 py-2 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KRStocks;
