import React, { useState, useEffect } from 'react';
import DataGrid from '../../components/DataGrid';

import { getApiUrl, API_ENDPOINTS } from '../../utils/api';

const MASTER_API_BASE_URL = getApiUrl(API_ENDPOINTS.COMMON_CODE_MASTERS);
const DETAIL_API_BASE_URL = getApiUrl(API_ENDPOINTS.COMMON_CODE_DETAILS);

function CommonCode() {
  const [masters, setMasters] = useState([]);
  const [details, setDetails] = useState([]);
  const [selectedMasterId, setSelectedMasterId] = useState(null);
  const [editingMasterId, setEditingMasterId] = useState(null);
  const [editingDetailId, setEditingDetailId] = useState(null);
  const [newMasterRow, setNewMasterRow] = useState({
    code: '',
    code_name: '',
    remark: '',
  });
  const [newDetailRow, setNewDetailRow] = useState({
    master_id: null,
    detail_code: '',
    detail_code_name: '',
    order_no: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMasters();
  }, []);

  useEffect(() => {
    if (selectedMasterId) {
      loadDetails(selectedMasterId);
    } else {
      setDetails([]);
    }
  }, [selectedMasterId]);

  const loadMasters = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(MASTER_API_BASE_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMasters(data);
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

  const loadDetails = async (masterId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${DETAIL_API_BASE_URL}?master_id=${masterId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDetails(data);
      } else {
        const errorText = await response.text();
        setError(`상세 데이터를 불러오는데 실패했습니다. (${response.status}): ${errorText}`);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
      setError(`서버에 연결할 수 없습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMasterAdd = () => {
    setNewMasterRow({
      code: '',
      code_name: '',
      remark: '',
    });
    setEditingMasterId('new');
  };

  const handleMasterSave = async (masterData) => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        code: masterData.code,
        code_name: masterData.code_name,
        remark: masterData.remark || null,
      };

      let response;
      if (masterData.id) {
        // 업데이트
        response = await fetch(`${MASTER_API_BASE_URL}/${masterData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } else {
        // 생성
        response = await fetch(MASTER_API_BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        await loadMasters();
        setEditingMasterId(null);
        setNewMasterRow({
          code: '',
          code_name: '',
          remark: '',
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

  const handleMasterDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까? 상세 코드도 함께 삭제됩니다.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${MASTER_API_BASE_URL}/${id}`, {
        method: 'DELETE',
      });

      if (response.ok || response.status === 204) {
        await loadMasters();
        if (selectedMasterId === id) {
          setSelectedMasterId(null);
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

  const handleMasterEdit = (id) => {
    setEditingMasterId(id);
  };

  const handleMasterCancel = () => {
    setEditingMasterId(null);
    setNewMasterRow({
      code: '',
      code_name: '',
      remark: '',
    });
  };

  const handleMasterInputChange = (id, field, value) => {
    if (id === 'new') {
      setNewMasterRow((prev) => ({ ...prev, [field]: value }));
    } else {
      setMasters((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
      );
    }
  };

  const handleMasterRowClick = (masterId) => {
    setSelectedMasterId(masterId);
  };

  const handleDetailAdd = () => {
    if (!selectedMasterId) {
      setError('마스터 코드를 먼저 선택해주세요.');
      return;
    }
    setNewDetailRow({
      master_id: selectedMasterId,
      detail_code: '',
      detail_code_name: '',
      order_no: 0,
    });
    setEditingDetailId('new');
  };

  const handleDetailSave = async (detailData) => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        master_id: detailData.master_id,
        detail_code: detailData.detail_code,
        detail_code_name: detailData.detail_code_name,
        order_no: detailData.order_no,
      };

      let response;
      if (detailData.id) {
        // 업데이트
        response = await fetch(`${DETAIL_API_BASE_URL}/${detailData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } else {
        // 생성
        response = await fetch(DETAIL_API_BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        await loadDetails(selectedMasterId);
        setEditingDetailId(null);
        setNewDetailRow({
          master_id: selectedMasterId,
          detail_code: '',
          detail_code_name: '',
          order_no: 0,
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

  const handleDetailDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${DETAIL_API_BASE_URL}/${id}`, {
        method: 'DELETE',
      });

      if (response.ok || response.status === 204) {
        await loadDetails(selectedMasterId);
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

  const handleDetailEdit = (id) => {
    setEditingDetailId(id);
  };

  const handleDetailCancel = () => {
    setEditingDetailId(null);
    setNewDetailRow({
      master_id: selectedMasterId,
      detail_code: '',
      detail_code_name: '',
      order_no: 0,
    });
  };

  const handleDetailInputChange = (id, field, value) => {
    if (id === 'new') {
      setNewDetailRow((prev) => ({ ...prev, [field]: value }));
    } else {
      setDetails((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
      );
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">공통코드</h1>
        <p className="text-wealth-muted">시스템에서 사용하는 공통코드를 관리합니다.</p>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* 마스터 그리드 */}
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">마스터 코드</h2>
            <button
              onClick={handleMasterAdd}
              disabled={loading || editingMasterId === 'new'}
              className="px-4 py-2 bg-gradient-to-r from-wealth-gold to-yellow-600 text-white font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + 마스터 추가
            </button>
          </div>

          <DataGrid
            columns={[
              { key: 'code', label: '코드', align: 'left' },
              { key: 'code_name', label: '코드명', align: 'left' },
              { key: 'remark', label: '비고', align: 'left' },
            ]}
            data={masters}
            editingId={editingMasterId}
            selectedId={selectedMasterId}
            onRowClick={handleMasterRowClick}
            onEdit={handleMasterEdit}
            onDelete={handleMasterDelete}
            onSave={(row) => handleMasterSave(row || newMasterRow)}
            onCancel={handleMasterCancel}
            loading={loading}
            showRowNumber={true}
            showActions={true}
            renderNewRow={() => (
              <>
                <td className="py-3 px-4">
                  <input
                    type="text"
                    value={newMasterRow.code}
                    onChange={(e) => handleMasterInputChange('new', 'code', e.target.value)}
                    className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    placeholder="코드"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="text"
                    value={newMasterRow.code_name}
                    onChange={(e) => handleMasterInputChange('new', 'code_name', e.target.value)}
                    className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    placeholder="코드명"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="text"
                    value={newMasterRow.remark}
                    onChange={(e) => handleMasterInputChange('new', 'remark', e.target.value)}
                    className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    placeholder="비고"
                  />
                </td>
              </>
            )}
            renderEditRow={(row) => (
              <>
                <td className="py-3 px-4">
                  <input
                    type="text"
                    value={row.code}
                    onChange={(e) => handleMasterInputChange(row.id, 'code', e.target.value)}
                    className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="text"
                    value={row.code_name}
                    onChange={(e) => handleMasterInputChange(row.id, 'code_name', e.target.value)}
                    className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="text"
                    value={row.remark || ''}
                    onChange={(e) => handleMasterInputChange(row.id, 'remark', e.target.value)}
                    className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                  />
                </td>
              </>
            )}
            renderViewRow={(row) => (
              <>
                <td className="py-3 px-4 text-white text-sm">{row.code}</td>
                <td className="py-3 px-4 text-white text-sm">{row.code_name}</td>
                <td className="py-3 px-4 text-white text-sm">{row.remark || '-'}</td>
              </>
            )}
            emptyMessage="등록된 마스터 코드가 없습니다."
          />
        </div>

        {/* 상세 그리드 */}
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">
              상세 코드 {selectedMasterId ? `(${masters.find(m => m.id === selectedMasterId)?.code || ''})` : ''}
            </h2>
            <button
              onClick={handleDetailAdd}
              disabled={loading || editingDetailId === 'new' || !selectedMasterId}
              className="px-4 py-2 bg-gradient-to-r from-wealth-gold to-yellow-600 text-white font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + 상세 추가
            </button>
          </div>

          {!selectedMasterId ? (
            <div className="text-center py-8 text-wealth-muted">
              마스터 코드를 선택해주세요.
            </div>
          ) : (
            <DataGrid
              columns={[
                { key: 'detail_code', label: '상세코드', align: 'left' },
                { key: 'detail_code_name', label: '상세코드명', align: 'left' },
                { key: 'order_no', label: '정렬순서', align: 'right' },
              ]}
              data={details}
              editingId={editingDetailId}
              selectedId={null}
              onRowClick={null}
              onEdit={handleDetailEdit}
              onDelete={handleDetailDelete}
              onSave={(row) => handleDetailSave(row || newDetailRow)}
              onCancel={handleDetailCancel}
              loading={loading}
              showRowNumber={true}
              showActions={true}
              renderNewRow={() => (
                <>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      value={newDetailRow.detail_code}
                      onChange={(e) => handleDetailInputChange('new', 'detail_code', e.target.value)}
                      className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                      placeholder="상세코드"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      value={newDetailRow.detail_code_name}
                      onChange={(e) => handleDetailInputChange('new', 'detail_code_name', e.target.value)}
                      className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                      placeholder="상세코드명"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      value={newDetailRow.order_no}
                      onChange={(e) => handleDetailInputChange('new', 'order_no', e.target.value)}
                      className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    />
                  </td>
                </>
              )}
              renderEditRow={(row) => (
                <>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      value={row.detail_code}
                      onChange={(e) => handleDetailInputChange(row.id, 'detail_code', e.target.value)}
                      className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      value={row.detail_code_name}
                      onChange={(e) => handleDetailInputChange(row.id, 'detail_code_name', e.target.value)}
                      className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      value={row.order_no}
                      onChange={(e) => handleDetailInputChange(row.id, 'order_no', e.target.value)}
                      className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    />
                  </td>
                </>
              )}
              renderViewRow={(row) => (
                <>
                  <td className="py-3 px-4 text-white text-sm">{row.detail_code}</td>
                  <td className="py-3 px-4 text-white text-sm">{row.detail_code_name}</td>
                  <td className="py-3 px-4 text-white text-sm text-right">{row.order_no}</td>
                </>
              )}
              emptyMessage="등록된 상세 코드가 없습니다."
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default CommonCode;
