import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../utils/api';
import DataGrid from '../../components/DataGrid';
import KRStockSelector, { ensureKRStockCache } from '../../components/KRStockSelector';

const RELATED_STOCKS_API = getApiUrl('/api/v1/related-stocks');
const KR_STOCKS_API = getApiUrl('/api/v1/kr-stocks');

function RelatedStock() {
  const [groups, setGroups] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [allStocks, setAllStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [isGroupAddOpen, setIsGroupAddOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isItemSelectorOpen, setIsItemSelectorOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  useEffect(() => {
    loadGroups();
    loadAllStocks();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      loadItems(selectedGroupId);
    } else {
      setItems([]);
    }
  }, [selectedGroupId]);

  const loadGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${RELATED_STOCKS_API}/groups`);
      if (!res.ok) throw new Error('관련주 그룹을 불러오는데 실패했습니다.');
      const data = await res.json();
      setGroups(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async (groupId) => {
    try {
      const res = await fetch(`${RELATED_STOCKS_API}/groups/${groupId}/items`);
      if (!res.ok) throw new Error('관련주 종목을 불러오는데 실패했습니다.');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error('Error loading items:', err);
      setItems([]);
    }
  };

  const loadAllStocks = async () => {
    try {
      const data = await ensureKRStockCache();
      setAllStocks(data);
    } catch (err) {
      console.error('Error loading stocks:', err);
    }
  };

  const handleGroupRowClick = (groupId) => {
    setSelectedGroupId(groupId);
  };

  const handleAddGroup = () => {
    setIsGroupAddOpen(true);
    setNewGroupName('');
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setError('그룹명을 입력해주세요.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${RELATED_STOCKS_API}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || '그룹 추가에 실패했습니다.');
      }
      await loadGroups();
      const created = await res.json();
      setSelectedGroupId(created.id);
      setIsGroupAddOpen(false);
      setNewGroupName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditGroup = (groupId) => {
    const group = groups.find((g) => g.id === groupId);
    if (group) {
      setEditingGroupId(groupId);
      setEditingGroupName(group.name);
    }
  };

  const handleSaveGroup = async (row) => {
    if (!editingGroupName.trim()) {
      setError('그룹명을 입력해주세요.');
      return;
    }
    const groupId = row?.id ?? editingGroupId;
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${RELATED_STOCKS_API}/groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingGroupName.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || '수정에 실패했습니다.');
      }
      await loadGroups();
      setEditingGroupId(null);
      setEditingGroupName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEditGroup = () => {
    setEditingGroupId(null);
    setEditingGroupName('');
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm('정말 삭제하시겠습니까? 해당 그룹의 모든 종목이 삭제됩니다.')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${RELATED_STOCKS_API}/groups/${groupId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('삭제에 실패했습니다.');
      await loadGroups();
      if (selectedGroupId === groupId) setSelectedGroupId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setIsItemSelectorOpen(true);
  };

  const handleItemSelect = async (stock) => {
    setIsItemSelectorOpen(false);
    if (!selectedGroupId) return;
    const existing = items.find((i) => i.stock_id === stock.id);
    if (existing) {
      setError('이미 등록된 종목입니다.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${RELATED_STOCKS_API}/groups/${selectedGroupId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_id: stock.id, is_leader: null }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || '종목 추가에 실패했습니다.');
      }
      await loadItems(selectedGroupId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLeader = async (itemId, currentValue) => {
    const newValue = currentValue === true ? false : currentValue === false ? null : true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${RELATED_STOCKS_API}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_leader: newValue }),
      });
      if (!res.ok) throw new Error('수정에 실패했습니다.');
      await loadItems(selectedGroupId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${RELATED_STOCKS_API}/items/${itemId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('삭제에 실패했습니다.');
      await loadItems(selectedGroupId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groups.filter((g) => {
    if (!searchQuery.trim()) return true;
    return g.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredItems = items.filter((item) => {
    if (!item.stock) return false;
    if (!itemSearchQuery.trim()) return true;
    const q = itemSearchQuery.toLowerCase();
    return (
      item.stock.ticker?.toLowerCase().includes(q) ||
      item.stock.name?.toLowerCase().includes(q)
    );
  });

  const groupColumns = [
    { key: 'name', label: '그룹명', width: '100%' },
  ];

  const itemColumns = [
    { key: 'ticker', label: '종목코드', width: '100px' },
    { key: 'name', label: '종목명', width: '200px' },
    { key: 'market', label: '시장구분', width: '100px' },
    { key: 'is_leader', label: '주도주', width: '80px', align: 'center' },
  ];

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">관련주 관리</h1>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽: 관련주 그룹 */}
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">관련주 그룹</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색..."
                className="px-3 py-1 bg-wealth-card border border-gray-700 rounded-lg text-white text-sm placeholder:text-wealth-muted focus:outline-none focus:ring-2 focus:ring-wealth-gold"
              />
              <button
                onClick={handleAddGroup}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
              >
                추가
              </button>
            </div>
          </div>

          <DataGrid
            columns={groupColumns}
            data={filteredGroups.map((g) => ({ id: g.id, name: g.name }))}
            selectedId={selectedGroupId}
            editingId={editingGroupId}
            onRowClick={handleGroupRowClick}
            onEdit={handleEditGroup}
            onDelete={handleDeleteGroup}
            onSave={handleSaveGroup}
            onCancel={handleCancelEditGroup}
            loading={loading}
            showActions={true}
            renderEditRow={(row, columns) => (
              <td colSpan={columns.length} className="py-3 px-4 border-r border-gray-700/50">
                <input
                  type="text"
                  value={editingGroupName}
                  onChange={(e) => setEditingGroupName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-wealth-card border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                  placeholder="그룹명"
                  autoFocus
                />
              </td>
            )}
            emptyMessage="등록된 관련주 그룹이 없습니다."
          />
        </div>

        {/* 오른쪽: 관련주 종목 */}
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              {selectedGroupId ? `${selectedGroup?.name || ''} - ${items.length}개` : ''}
            </h2>
            <div className="flex gap-2">
              {selectedGroupId && (
                <>
                  <input
                    type="text"
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    placeholder="검색..."
                    className="px-3 py-1 bg-wealth-card border border-gray-700 rounded-lg text-white text-sm placeholder:text-wealth-muted focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                  />
                  <button
                    onClick={handleAddItem}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                  >
                    추가
                  </button>
                </>
              )}
            </div>
          </div>

          {!selectedGroupId ? (
            <div className="text-center py-8 text-wealth-muted">
              왼쪽에서 관련주 그룹을 선택하세요.
            </div>
          ) : (
            <DataGrid
              columns={itemColumns}
              data={filteredItems.map((item) => ({
                id: item.id,
                ticker: item.stock?.ticker || '-',
                name: item.stock?.name || '-',
                market: item.stock?.market || '-',
                is_leader: item.is_leader,
              }))}
              loading={loading}
              showActions={true}
              showRowNumber={false}
              onDelete={(id) => handleDeleteItem(id)}
              renderViewRow={(row, columns) => (
                <>
                  {columns.map((col) => {
                    if (col.key === 'is_leader') {
                      const item = items.find((i) => i.id === row.id);
                      return (
                        <td
                          key={col.key}
                          className="py-3 px-4 text-white text-sm text-center border-r border-gray-700/50"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleLeader(row.id, item?.is_leader)}
                            className={`px-2 py-0.5 rounded text-xs ${
                              item?.is_leader === true
                                ? 'bg-wealth-gold/30 text-wealth-gold'
                                : 'bg-gray-700 text-wealth-muted hover:bg-gray-600'
                            }`}
                          >
                            {item?.is_leader === true ? 'Y' : item?.is_leader === false ? 'N' : '-'}
                          </button>
                        </td>
                      );
                    }
                    return (
                      <td
                        key={col.key}
                        className="py-3 px-4 text-white text-sm border-r border-gray-700/50"
                      >
                        {row[col.key]}
                      </td>
                    );
                  })}
                </>
              )}
              emptyMessage="관련주 종목을 추가하세요."
            />
          )}
        </div>
      </div>

      {/* 그룹 추가 모달 */}
      {isGroupAddOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-wealth-card border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">관련주 그룹 추가</h3>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="그룹명 입력"
              className="w-full px-4 py-2 bg-wealth-card border border-gray-700 rounded-lg text-white mb-4 focus:outline-none focus:ring-2 focus:ring-wealth-gold"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsGroupAddOpen(false)}
                className="px-4 py-2 text-wealth-muted hover:text-white"
              >
                취소
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={loading || !newGroupName.trim()}
                className="px-4 py-2 bg-wealth-gold hover:bg-yellow-500 text-wealth-dark font-medium rounded disabled:opacity-50"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      <KRStockSelector
        isOpen={isItemSelectorOpen}
        onClose={() => setIsItemSelectorOpen(false)}
        onSelect={handleItemSelect}
      />
    </div>
  );
}

export default RelatedStock;
