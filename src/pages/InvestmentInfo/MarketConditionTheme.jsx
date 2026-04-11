import React, { useState, useEffect } from 'react';
import { getApiUrl, API_ENDPOINTS } from '../../utils/api';
import DataGrid from '../../components/DataGrid';
import ThemeCategorySelector from '../../components/ThemeCategorySelector';

const MARKET_CONDITION_API = getApiUrl(API_ENDPOINTS.MARKET_CONDITION);
const COMMON_CODE_MASTERS_API = getApiUrl(API_ENDPOINTS.COMMON_CODE_MASTERS);
const COMMON_CODE_DETAILS_API = getApiUrl(API_ENDPOINTS.COMMON_CODE_DETAILS);

function formatDateForInput(d) {
  if (!d) return '';
  if (typeof d === 'string') return d;
  const dateObj = d instanceof Date ? d : new Date(d);
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function MarketConditionTheme() {
  const [conditions, setConditions] = useState([]);
  const [themes, setThemes] = useState([]);
  const [selectedConditionId, setSelectedConditionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingConditionId, setEditingConditionId] = useState(null);
  const [editingThemeId, setEditingThemeId] = useState(null);
  const [editingConditionDate, setEditingConditionDate] = useState('');
  const [editingConditionName, setEditingConditionName] = useState('');
  const [themeForm, setThemeForm] = useState({ theme_id: null, category_id: null, theme: null, category: null, direction: '' });
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [directionOptions, setDirectionOptions] = useState([]);

  useEffect(() => {
    loadConditions();
    loadDirectionOptions();
  }, []);

  const loadDirectionOptions = async () => {
    try {
      const masterRes = await fetch(`${COMMON_CODE_MASTERS_API}?skip=0&limit=100`);
      if (!masterRes.ok) return;
      const masters = await masterRes.json();
      const directionMaster = masters.find((m) => m.code === 'direction');
      if (!directionMaster) return;
      const detailRes = await fetch(`${COMMON_CODE_DETAILS_API}?master_id=${directionMaster.id}&skip=0&limit=100`);
      if (!detailRes.ok) return;
      const details = await detailRes.json();
      setDirectionOptions(details);
    } catch {
      setDirectionOptions([]);
    }
  };

  useEffect(() => {
    if (selectedConditionId) {
      loadThemes(selectedConditionId);
    } else {
      setThemes([]);
    }
  }, [selectedConditionId]);

  const loadConditions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${MARKET_CONDITION_API}?skip=0&limit=200`);
      if (!res.ok) {
        const errText = await res.text();
        let msg = '시황 목록을 불러오는데 실패했습니다.';
        try {
          const errJson = JSON.parse(errText);
          msg = errJson.detail || msg;
        } catch {
          if (errText) msg += ` (${errText.slice(0, 100)})`;
        }
        throw new Error(msg);
      }
      const data = await res.json();
      setConditions(data);
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setError('API 연결 실패. 백엔드 서버가 실행 중인지 확인하고, market_condition 테이블에 date 컬럼이 있는지 마이그레이션(add_market_condition_date.sql)을 실행해주세요.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadThemes = async (conditionId) => {
    try {
      const res = await fetch(`${MARKET_CONDITION_API}/${conditionId}/themes`);
      if (!res.ok) return setThemes([]);
      const data = await res.json();
      setThemes(data);
    } catch {
      setThemes([]);
    }
  };

  const handleAddCondition = () => {
    if (editingConditionId !== null) return;
    setEditingConditionDate('');
    setEditingConditionName('');
    setEditingConditionId('new');
  };

  const handleEditCondition = (id) => {
    const c = conditions.find((x) => x.id === id);
    if (c) {
      setEditingConditionId(id);
      setEditingConditionDate(formatDateForInput(c.date) || '');
      setEditingConditionName(c.name);
    }
  };

  const handleSaveCondition = async () => {
    if (!editingConditionName.trim()) {
      setError('시황을 입력해주세요.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const isNew = editingConditionId === 'new' || editingConditionId === null;
      const payload = {
        name: editingConditionName.trim(),
        date: editingConditionDate?.trim() || null,
      };
      const res = isNew
        ? await fetch(MARKET_CONDITION_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`${MARKET_CONDITION_API}/${editingConditionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || (isNew ? '시황 추가에 실패했습니다.' : '수정에 실패했습니다.'));
      }
      const created = isNew ? await res.json() : null;
      await loadConditions();
      if (isNew && created) setSelectedConditionId(created.id);
      setEditingConditionId(null);
      setEditingConditionDate('');
      setEditingConditionName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCondition = async (id) => {
    if (!confirm('정말 삭제하시겠습니까? 해당 시황의 모든 테마가 삭제됩니다.')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${MARKET_CONDITION_API}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제에 실패했습니다.');
      await loadConditions();
      if (selectedConditionId === id) setSelectedConditionId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTheme = () => {
    if (editingThemeId !== null) return;
    setThemeForm({ theme_id: null, category_id: null, theme: null, category: null, direction: '' });
    setEditingThemeId('new');
  };

  const handleThemeSelect = (selection) => {
    setThemeForm((prev) => ({
      ...prev,
      theme_id: selection.theme_id,
      category_id: selection.category_id,
      theme: selection.theme,
      category: selection.category,
    }));
  };

  const handleSaveTheme = async () => {
    if (!selectedConditionId) {
      setError('시황을 먼저 선택해주세요.');
      return;
    }
    if (!themeForm.theme_id) {
      setError('테마를 선택해주세요.');
      return;
    }
    setError(null);
    try {
      const payload = {
        theme_id: themeForm.theme_id,
        category_id: themeForm.category_id || null,
        direction: themeForm.direction || null,
      };
      const isNew = editingThemeId === 'new' || editingThemeId === null;
      const res = isNew
        ? await fetch(`${MARKET_CONDITION_API}/${selectedConditionId}/themes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`${MARKET_CONDITION_API}/${selectedConditionId}/themes/${editingThemeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`저장 실패: ${res.status} ${errText}`);
      }
      setThemeForm({ theme_id: null, category_id: null, theme: null, category: null, direction: '' });
      setEditingThemeId(null);
      setIsThemeModalOpen(false);
      await loadThemes(selectedConditionId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditTheme = (id) => {
    const t = themes.find((x) => x.id === id);
    if (t) {
      setThemeForm({
        theme_id: t.theme_id,
        category_id: t.category_id ?? null,
        theme: t.theme || null,
        category: t.category || null,
        direction: t.direction || '',
      });
      setEditingThemeId(id);
    }
  };

  const handleDeleteTheme = async (id) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`${MARKET_CONDITION_API}/${selectedConditionId}/themes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제에 실패했습니다.');
      await loadThemes(selectedConditionId);
    } catch (err) {
      setError(err.message);
    }
  };

  const themeDisplay = (t) => {
    if (t.category) return `${t.theme?.name || '-'} - ${t.category.name}`;
    return t.theme?.name || '-';
  };

  const selectedCondition = conditions.find((c) => c.id === selectedConditionId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">시황별 테마관리</h1>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽: 시황 */}
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">시황</h2>
            <button
              onClick={handleAddCondition}
              disabled={editingConditionId !== null}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors disabled:opacity-50"
            >
              추가
            </button>
          </div>

          <DataGrid
            columns={[
              { key: 'date', label: '날짜', align: 'left', width: '120px', nowrap: true },
              { key: 'name', label: '시황', align: 'left', width: '100%', nowrap: false },
            ]}
            data={conditions.map((c) => ({
              id: c.id,
              date: c.date ? formatDateForInput(c.date) : '',
              name: c.name,
            }))}
            selectedId={selectedConditionId}
            editingId={editingConditionId}
            onRowClick={(id) => setSelectedConditionId(id)}
            onEdit={handleEditCondition}
            onDelete={handleDeleteCondition}
            onSave={handleSaveCondition}
            onCancel={() => { setEditingConditionId(null); setEditingConditionDate(''); setEditingConditionName(''); }}
            loading={loading}
            showActions={true}
            showRowNumber={true}
            renderNewRow={() => (
              <>
                <td className="py-3 px-4 align-top border-r border-gray-700/50">
                  <input
                    type="date"
                    value={editingConditionDate}
                    onChange={(e) => setEditingConditionDate(e.target.value)}
                    className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                  />
                </td>
                <td className="py-3 px-4 align-top border-r border-gray-700/50">
                  <textarea
                    value={editingConditionName}
                    onChange={(e) => setEditingConditionName(e.target.value)}
                    placeholder="시황 정보를 입력하세요"
                    rows={4}
                    className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold resize-y min-h-[80px]"
                  />
                </td>
              </>
            )}
            renderEditRow={(row, columns) => (
              <>
                <td className="py-3 px-4 align-top border-r border-gray-700/50">
                  <input
                    type="date"
                    value={editingConditionDate}
                    onChange={(e) => setEditingConditionDate(e.target.value)}
                    className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                  />
                </td>
                <td className="py-3 px-4 align-top border-r border-gray-700/50">
                  <textarea
                    value={editingConditionName}
                    onChange={(e) => setEditingConditionName(e.target.value)}
                    placeholder="시황 정보를 입력하세요"
                    rows={4}
                    className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold resize-y min-h-[80px]"
                  />
                </td>
              </>
            )}
            renderViewRow={(row) => (
              <>
                <td className="py-3 px-4 text-white text-sm whitespace-nowrap border-r border-gray-700/50">{row.date || '-'}</td>
                <td className="py-3 px-4 text-white text-sm break-words whitespace-pre-wrap border-r border-gray-700/50">{row.name}</td>
              </>
            )}
            emptyMessage="등록된 시황이 없습니다."
          />
        </div>

        {/* 오른쪽: 테마 · 카테고리 */}
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              {selectedConditionId ? `${(selectedCondition?.name || '').slice(0, 30) + ((selectedCondition?.name || '').length > 30 ? '...' : '')} - ${themes.length}개` : ''}
            </h2>
            {selectedConditionId && (
              <button
                onClick={handleAddTheme}
                disabled={editingThemeId !== null}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors disabled:opacity-50"
              >
                추가
              </button>
            )}
          </div>

          {!selectedConditionId ? (
            <div className="text-center py-8 text-wealth-muted">
              왼쪽에서 시황을 선택하세요.
            </div>
          ) : (
            <DataGrid
              columns={[
                { key: 'theme_display', label: '테마 · 카테고리', align: 'left', width: '60%', nowrap: false },
                { key: 'direction_display', label: 'direction', align: 'left', width: '40%', nowrap: false },
              ]}
              data={themes}
              editingId={editingThemeId}
              selectedId={null}
              onRowClick={null}
              onEdit={handleEditTheme}
              onDelete={handleDeleteTheme}
              onSave={handleSaveTheme}
              onCancel={() => {
                setEditingThemeId(null);
                setThemeForm({ theme_id: null, category_id: null, theme: null, category: null, direction: '' });
                setIsThemeModalOpen(false);
              }}
              loading={false}
              showRowNumber={true}
              showActions={true}
              renderNewRow={() => (
                <>
                  <td className="py-3 px-4 border-r border-gray-700/50">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setIsThemeModalOpen(true); }}
                      className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-left text-white text-sm hover:border-wealth-gold focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    >
                      {themeForm.theme_id
                        ? (themeForm.category ? `${themeForm.theme?.name || '-'} - ${themeForm.category.name}` : themeForm.theme?.name || '선택됨')
                        : '테마 선택'}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={themeForm.direction || ''}
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, direction: e.target.value || '' }))}
                      className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    >
                      <option value="">선택하세요</option>
                      {directionOptions.map((d) => (
                        <option key={d.id} value={d.detail_code} className="bg-wealth-card text-white">
                          {d.detail_code_name} ({d.detail_code})
                        </option>
                      ))}
                    </select>
                  </td>
                </>
              )}
              renderEditRow={(row) => (
                <>
                  <td className="py-3 px-4 border-r border-gray-700/50">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setIsThemeModalOpen(true); }}
                      className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-left text-white text-sm hover:border-wealth-gold focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    >
                      {themeForm.theme_id
                        ? (themeForm.category ? `${themeForm.theme?.name || '-'} - ${themeForm.category.name}` : themeForm.theme?.name || '선택됨')
                        : '테마 선택'}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={themeForm.direction || ''}
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, direction: e.target.value || '' }))}
                      className="w-full px-3 py-2 bg-wealth-card border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    >
                      <option value="">선택하세요</option>
                      {directionOptions.map((d) => (
                        <option key={d.id} value={d.detail_code} className="bg-wealth-card text-white">
                          {d.detail_code_name} ({d.detail_code})
                        </option>
                      ))}
                    </select>
                  </td>
                </>
              )}
              renderViewRow={(row) => (
                <>
                  <td className="py-3 px-4 text-white text-sm border-r border-gray-700/50">{themeDisplay(row)}</td>
                  <td className="py-3 px-4 text-white text-sm border-r border-gray-700/50">
                    {directionOptions.find((d) => d.detail_code === row.direction)?.detail_code_name || row.direction || '-'}
                  </td>
                </>
              )}
              emptyMessage="등록된 테마가 없습니다."
            />
          )}
        </div>
      </div>

      <ThemeCategorySelector
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        onSelect={handleThemeSelect}
        selectedThemeId={themeForm.theme_id}
        selectedCategoryId={themeForm.category_id}
      />
    </div>
  );
}

export default MarketConditionTheme;
