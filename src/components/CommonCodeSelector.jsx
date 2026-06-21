import React, { useState, useEffect } from 'react';

import { getApiUrl, API_ENDPOINTS } from '../utils/api';

const MASTER_API_BASE_URL = getApiUrl(API_ENDPOINTS.COMMON_CODE_MASTERS);
const DETAIL_API_BASE_URL = getApiUrl(API_ENDPOINTS.COMMON_CODE_DETAILS);

function CommonCodeSelector({ masterCode, value, onChange, placeholder = '선택하세요', disabled = false }) {
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (masterCode) {
      loadCommonCodeDetails(masterCode);
    } else {
      setDetails([]);
    }
  }, [masterCode]);

  const loadCommonCodeDetails = async (code) => {
    try {
      setLoading(true);
      setError(null);
      
      // 먼저 마스터 코드로 마스터 ID 찾기
      const masterResponse = await fetch(`${MASTER_API_BASE_URL}?skip=0&limit=100`);
      if (!masterResponse.ok) {
        throw new Error('마스터 코드를 불러오는데 실패했습니다.');
      }
      const masters = await masterResponse.json();
      const master = masters.find(m => m.code === code);
      
      if (!master) {
        setDetails([]);
        return;
      }
      
      // 마스터 ID로 상세 코드 조회
      const detailResponse = await fetch(`${DETAIL_API_BASE_URL}?master_id=${master.id}`);
      if (detailResponse.ok) {
        const data = await detailResponse.json();
        setDetails(data);
      } else {
        throw new Error('상세 코드를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const selectedValue = e.target.value;
    onChange({
      target: {
        value: selectedValue === '' ? null : selectedValue,
      },
    });
  };

  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={handleChange}
        disabled={disabled || loading || !masterCode}
        className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-wealth-gold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">{placeholder}</option>
        {details.map((detail) => (
          <option key={detail.id} value={detail.detail_code} className="bg-wealth-card text-white">
            {detail.detail_code_name} ({detail.detail_code})
          </option>
        ))}
      </select>
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-wealth-gold"></div>
        </div>
      )}
      {error && (
        <div className="text-red-400 text-xs mt-1">{error}</div>
      )}
    </div>
  );
}

export default CommonCodeSelector;


