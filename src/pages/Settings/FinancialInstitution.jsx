import React, { useState, useEffect } from 'react';
import { getApiUrl, API_ENDPOINTS } from '../../utils/api';

const API_BASE_URL = getApiUrl(API_ENDPOINTS.FINANCIAL_INSTITUTIONS);

function FinancialInstitution() {
  const [institutions, setInstitutions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [newRow, setNewRow] = useState({ name: '', code: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInstitutions();
  }, []);

  const loadInstitutions = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_BASE_URL);
      if (response.ok) {
        const data = await response.json();
        setInstitutions(data);
      } else {
        setError('데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('서버에 연결할 수 없습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setNewRow({ name: '', code: '' });
    setEditingId('new');
  };

  const handleSave = async (id, data) => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      if (id === 'new') {
        response = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } else {
        response = await fetch(`${API_BASE_URL}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }

      if (response.ok) {
        await loadInstitutions();
        setEditingId(null);
        setNewRow({ name: '', code: '' });
      } else {
        const errorData = await response.text();
        setError(errorData || '저장에 실패했습니다.');
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

      if (response.ok) {
        await loadInstitutions();
      } else {
        const errorData = await response.text();
        setError(errorData || '삭제에 실패했습니다.');
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
    setNewRow({ name: '', code: '' });
  };

  const handleInputChange = (id, field, value) => {
    if (id === 'new') {
      setNewRow({ ...newRow, [field]: value });
    } else {
      setInstitutions(institutions.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      ));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">금융기관 관리</h1>
        <p className="text-wealth-muted">연동할 금융기관을 등록하고 관리합니다.</p>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">금융기관 목록</h2>
          <button
            onClick={handleAdd}
            disabled={loading || editingId === 'new'}
            className="px-4 py-2 bg-gradient-to-r from-wealth-gold to-yellow-600 text-white font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            추가
          </button>
        </div>

        {loading && institutions.length === 0 ? (
          <div className="text-center py-8 text-wealth-muted">로딩 중...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-wealth-muted font-semibold text-sm">번호</th>
                  <th className="text-left py-3 px-4 text-wealth-muted font-semibold text-sm">금융기관명</th>
                  <th className="text-left py-3 px-4 text-wealth-muted font-semibold text-sm">코드</th>
                  <th className="text-right py-3 px-4 text-wealth-muted font-semibold text-sm">작업</th>
                </tr>
              </thead>
              <tbody>
                {editingId === 'new' && (
                  <tr className="border-b border-gray-800 hover:bg-wealth-card/30">
                    <td className="py-3 px-4 text-wealth-muted text-sm">-</td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={newRow.name}
                        onChange={(e) => handleInputChange('new', 'name', e.target.value)}
                        className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                        placeholder="금융기관명"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={newRow.code}
                        onChange={(e) => handleInputChange('new', 'code', e.target.value)}
                        className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                        placeholder="코드"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleSave('new', newRow)}
                          disabled={loading || !newRow.name || !newRow.code}
                          className="px-3 py-1 text-sm bg-wealth-gold text-white rounded hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          저장
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={loading}
                          className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                          취소
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {institutions.map((institution, index) => (
                  <tr key={institution.id} className="border-b border-gray-800 hover:bg-wealth-card/30">
                    <td className="py-3 px-4 text-wealth-muted text-sm">{index + 1}</td>
                    <td className="py-3 px-4">
                      {editingId === institution.id ? (
                        <input
                          type="text"
                          value={institution.name}
                          onChange={(e) => handleInputChange(institution.id, 'name', e.target.value)}
                          className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                        />
                      ) : (
                        <span className="text-white">{institution.name}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {editingId === institution.id ? (
                        <input
                          type="text"
                          value={institution.code}
                          onChange={(e) => handleInputChange(institution.id, 'code', e.target.value)}
                          className="w-full px-3 py-1 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                        />
                      ) : (
                        <span className="text-white font-mono">{institution.code}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        {editingId === institution.id ? (
                          <>
                            <button
                              onClick={() => handleSave(institution.id, institution)}
                              disabled={loading}
                              className="px-3 py-1 text-sm bg-wealth-gold text-white rounded hover:bg-yellow-600 transition-colors disabled:opacity-50"
                            >
                              저장
                            </button>
                            <button
                              onClick={handleCancel}
                              disabled={loading}
                              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(institution.id)}
                              disabled={loading || editingId !== null}
                              className="px-3 py-1 text-sm text-wealth-gold hover:bg-wealth-gold/10 rounded transition-colors disabled:opacity-50"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDelete(institution.id)}
                              disabled={loading || editingId !== null}
                              className="px-3 py-1 text-sm text-red-400 hover:bg-red-400/10 rounded transition-colors disabled:opacity-50"
                            >
                              삭제
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {institutions.length === 0 && !loading && (
          <div className="text-center py-8 text-wealth-muted">등록된 금융기관이 없습니다.</div>
        )}
      </div>

      {/* 통계 정보 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800">
          <div className="text-wealth-muted text-sm mb-1">전체 기관</div>
          <div className="text-2xl font-bold text-white">{institutions.length}</div>
        </div>
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800">
          <div className="text-wealth-muted text-sm mb-1">총 코드 수</div>
          <div className="text-2xl font-bold text-wealth-gold">{institutions.length}</div>
        </div>
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800">
          <div className="text-wealth-muted text-sm mb-1">데이터 상태</div>
          <div className="text-2xl font-bold text-green-400">
            {loading ? '...' : '정상'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinancialInstitution;

