import React, { useState, useEffect } from 'react';
import { getApiUrl, API_ENDPOINTS } from '../../utils/api';
import DataGrid from '../../components/DataGrid';
import KRStockSelector, { ensureKRStockCache } from '../../components/KRStockSelector';

const FOLLOW_UP_STOCKS_API = getApiUrl('/api/v1/follow-up-stocks');
const KR_STOCKS_API = getApiUrl(API_ENDPOINTS.KR_STOCKS);

function FollowUpStock() {
  const [allStocks, setAllStocks] = useState([]); // 전체 주식 목록
  const [leaderStocks, setLeaderStocks] = useState([]); // 대장주 목록 (그룹화된)
  const [followerStocks, setFollowerStocks] = useState([]); // 현재 선택된 대장주의 후속주 목록
  const [selectedLeaderId, setSelectedLeaderId] = useState(null);
  const [selectedFollowerIds, setSelectedFollowerIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [followerSearchQuery, setFollowerSearchQuery] = useState('');
  const [isLeaderSelectorOpen, setIsLeaderSelectorOpen] = useState(false);
  const [isFollowerSelectorOpen, setIsFollowerSelectorOpen] = useState(false);

  useEffect(() => {
    loadAllStocks();
    loadFollowUpStocks();
  }, []);

  useEffect(() => {
    if (selectedLeaderId) {
      loadFollowerStocks(selectedLeaderId);
    } else {
      setFollowerStocks([]);
      setSelectedFollowerIds(new Set());
    }
  }, [selectedLeaderId]);

  const loadAllStocks = async () => {
    try {
      const data = await ensureKRStockCache();
      setAllStocks(data);
    } catch (err) {
      console.error('Error loading stocks:', err);
    }
  };

  const loadFollowUpStocks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(FOLLOW_UP_STOCKS_API);
      if (!response.ok) throw new Error('후속주 목록을 불러오는데 실패했습니다.');
      const data = await response.json();
      
      // 대장주별로 그룹화
      const grouped = data.reduce((acc, item) => {
        const leaderId = item.leader_stock_id;
        if (!acc[leaderId]) {
          acc[leaderId] = {
            id: leaderId,
            leader_stock: item.leader_stock,
            followers: [],
          };
        }
        acc[leaderId].followers.push(item);
        return acc;
      }, {});
      
      setLeaderStocks(Object.values(grouped));
    } catch (err) {
      setError(err.message);
      console.error('Error loading follow-up stocks:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowerStocks = async (leaderStockId) => {
    try {
      const response = await fetch(`${FOLLOW_UP_STOCKS_API}/leader/${leaderStockId}`);
      if (!response.ok) throw new Error('후속주 목록을 불러오는데 실패했습니다.');
      const data = await response.json();
      const followers = data.map(item => item.follower_stock);
      setFollowerStocks(followers);
      setSelectedFollowerIds(new Set(followers.map(f => f.id)));
    } catch (err) {
      console.error('Error loading follower stocks:', err);
      setFollowerStocks([]);
      setSelectedFollowerIds(new Set());
    }
  };

  const handleLeaderRowClick = (leaderId) => {
    setSelectedLeaderId(leaderId);
  };

  const handleAddLeader = () => {
    setIsLeaderSelectorOpen(true);
  };

  const handleLeaderSelect = (stock) => {
    setIsLeaderSelectorOpen(false);
    // 선택한 주식을 대장주로 설정
    setSelectedLeaderId(stock.id);
    // 해당 대장주의 후속주가 이미 있는지 확인
    const existingLeader = leaderStocks.find(l => l.id === stock.id);
    if (existingLeader) {
      loadFollowerStocks(stock.id);
    } else {
      // 새로운 대장주이므로 후속주 목록 초기화
      setFollowerStocks([]);
      setSelectedFollowerIds(new Set());
      // 그리드에 즉시 표시되도록 추가 (후속주가 없어도 대장주는 표시)
      setLeaderStocks(prev => {
        const exists = prev.find(l => l.id === stock.id);
        if (!exists) {
          return [...prev, {
            id: stock.id,
            leader_stock: stock,
            followers: [],
          }];
        }
        return prev;
      });
    }
  };

  const handleFollowerCheckboxChange = (followerId, checked) => {
    setSelectedFollowerIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(followerId);
      } else {
        newSet.delete(followerId);
      }
      return newSet;
    });
    
    // followerStocks도 업데이트
    if (checked) {
      const stock = allStocks.find(s => s.id === followerId);
      if (stock && !followerStocks.find(f => f.id === followerId)) {
        setFollowerStocks(prev => [...prev, stock]);
      }
    } else {
      setFollowerStocks(prev => prev.filter(f => f.id !== followerId));
    }
  };

  const handleAddFollower = () => {
    setIsFollowerSelectorOpen(true);
  };

  const handleFollowerSelect = (stock) => {
    setIsFollowerSelectorOpen(false);
    // 이미 선택된 후속주인지 확인
    if (!selectedFollowerIds.has(stock.id) && stock.id !== selectedLeaderId) {
      handleFollowerCheckboxChange(stock.id, true);
    }
  };

  // handleAddFollower는 제거 - 그리드에서 직접 체크박스로 선택 가능

  const handleSave = async () => {
    if (!selectedLeaderId) {
      setError('대장주를 선택해주세요.');
      return;
    }

    if (selectedFollowerIds.size === 0) {
      setError('후속주를 최소 1개 이상 선택해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 기존 후속주 관계 삭제
      await fetch(`${FOLLOW_UP_STOCKS_API}/leader/${selectedLeaderId}/all`, {
        method: 'DELETE',
      });

      // 새로운 후속주 관계 생성
      const promises = Array.from(selectedFollowerIds).map(followerId =>
        fetch(FOLLOW_UP_STOCKS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leader_stock_id: selectedLeaderId,
            follower_stock_id: followerId,
          }),
        })
      );

      await Promise.all(promises);
      await loadFollowUpStocks();
      // 선택된 후속주 목록도 다시 로드
      await loadFollowerStocks(selectedLeaderId);
      setError(null);
    } catch (err) {
      setError(err.message || '저장에 실패했습니다.');
      console.error('Error saving follow-up stocks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLeader = async (leaderId) => {
    if (!confirm('정말 삭제하시겠습니까? 해당 대장주의 모든 후속주 관계가 삭제됩니다.')) return;

    setLoading(true);
    setError(null);

    try {
      await fetch(`${FOLLOW_UP_STOCKS_API}/leader/${leaderId}/all`, {
        method: 'DELETE',
      });
      await loadFollowUpStocks();
      if (selectedLeaderId === leaderId) {
        setSelectedLeaderId(null);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error deleting leader:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFollower = async (followerId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    setLoading(true);
    setError(null);

    try {
      // 해당 후속주 관계 찾기
      const response = await fetch(`${FOLLOW_UP_STOCKS_API}/leader/${selectedLeaderId}`);
      if (!response.ok) throw new Error('후속주 목록을 불러오는데 실패했습니다.');
      const data = await response.json();
      const followUpStock = data.find(item => item.follower_stock_id === followerId);
      
      if (followUpStock) {
        await fetch(`${FOLLOW_UP_STOCKS_API}/${followUpStock.id}`, {
          method: 'DELETE',
        });
        await loadFollowerStocks(selectedLeaderId);
        await loadFollowUpStocks();
      }
    } catch (err) {
      setError(err.message);
      console.error('Error deleting follower:', err);
    } finally {
      setLoading(false);
    }
  };

  // 필터링된 대장주 목록
  const filteredLeaderStocks = leaderStocks.filter(group => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      group.leader_stock.name.toLowerCase().includes(query) ||
      group.leader_stock.ticker.toLowerCase().includes(query)
    );
  });

  // 필터링된 후속주 목록 (선택된 후속주만 표시)
  const filteredFollowerStocks = Array.from(selectedFollowerIds)
    .map(id => {
      const stock = allStocks.find(s => s.id === id);
      return stock;
    })
    .filter(Boolean)
    .filter(stock => {
      if (!followerSearchQuery.trim()) return true;
      const query = followerSearchQuery.toLowerCase();
      return (
        stock.name.toLowerCase().includes(query) ||
        stock.ticker.toLowerCase().includes(query)
      );
    });

  const leaderColumns = [
    { key: 'ticker', label: '종목코드', width: '100px' },
    { key: 'name', label: '종목명', width: '200px' },
    { key: 'market', label: '시장구분', width: '100px' },
    { key: 'followers_count', label: '후속주 수', width: '100px', align: 'center' },
  ];

  const followerColumns = [
    { key: 'ticker', label: '종목코드', width: '100px' },
    { key: 'name', label: '종목명', width: '200px' },
    { key: 'market', label: '시장구분', width: '100px' },
  ];

  const handleDeleteFollowerFromGrid = async (followerId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await handleDeleteFollower(followerId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">후속주 관리</h1>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* 왼쪽/오른쪽 그리드 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽: 대장주 그리드 */}
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">대장주</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색..."
                className="px-3 py-1 bg-wealth-card border border-gray-700 rounded-lg text-white text-sm placeholder:text-wealth-muted focus:outline-none focus:ring-2 focus:ring-wealth-gold"
              />
              <button
                onClick={handleAddLeader}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
              >
                추가
              </button>
            </div>
          </div>

          <DataGrid
            columns={leaderColumns}
            data={filteredLeaderStocks.map(group => ({
              id: group.id,
              ticker: group.leader_stock.ticker,
              name: group.leader_stock.name,
              market: group.leader_stock.market,
              followers_count: group.followers.length,
            }))}
            selectedId={selectedLeaderId}
            onRowClick={handleLeaderRowClick}
            onDelete={handleDeleteLeader}
            loading={loading}
            showActions={true}
            renderViewRow={(row, columns) => (
              <>
                {columns.map((col) => {
                  if (col.key === 'followers_count') {
                    return (
                      <td
                        key={col.key}
                        className="py-3 px-4 text-white text-sm text-center border-r border-gray-700/50"
                      >
                        {row[col.key]}
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
            emptyMessage="등록된 대장주가 없습니다."
          />
        </div>

        {/* 오른쪽: 후속주 그리드 */}
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              후속주 {selectedLeaderId ? `(${selectedFollowerIds.size}개 선택됨)` : ''}
            </h2>
            <div className="flex gap-2">
              {selectedLeaderId && (
                <>
                  <input
                    type="text"
                    value={followerSearchQuery}
                    onChange={(e) => setFollowerSearchQuery(e.target.value)}
                    placeholder="검색..."
                    className="px-3 py-1 bg-wealth-card border border-gray-700 rounded-lg text-white text-sm placeholder:text-wealth-muted focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                  />
                  <button
                    onClick={handleAddFollower}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                  >
                    추가
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading || selectedFollowerIds.size === 0}
                    className="px-3 py-1 bg-wealth-gold hover:bg-yellow-500 text-wealth-dark text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    저장
                  </button>
                </>
              )}
            </div>
          </div>

          {!selectedLeaderId ? (
            <div className="text-center py-8 text-wealth-muted">
              왼쪽에서 대장주를 선택하세요.
            </div>
          ) : (
            <DataGrid
              columns={followerColumns}
              data={filteredFollowerStocks
                .filter(stock => stock.id !== selectedLeaderId) // 대장주는 제외
                .map(stock => ({
                  id: stock.id,
                  ticker: stock.ticker,
                  name: stock.name,
                  market: stock.market,
                  isCurrentFollower: followerStocks.some(f => f.id === stock.id),
                }))}
              loading={loading}
              showActions={true}
              showRowNumber={false}
              onDelete={(id) => {
                handleFollowerCheckboxChange(id, false);
              }}
              renderViewRow={(row, columns) => (
                <>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-3 px-4 text-white text-sm border-r border-gray-700/50 ${
                        row.isCurrentFollower ? 'text-wealth-gold font-medium' : ''
                      }`}
                    >
                      {row[col.key]}
                    </td>
                  ))}
                </>
              )}
              emptyMessage="후속주를 추가하세요."
            />
          )}
        </div>
      </div>

      {/* 대장주 선택 모달 */}
      <KRStockSelector
        isOpen={isLeaderSelectorOpen}
        onClose={() => setIsLeaderSelectorOpen(false)}
        onSelect={handleLeaderSelect}
      />

      {/* 후속주 선택 모달 */}
      <KRStockSelector
        isOpen={isFollowerSelectorOpen}
        onClose={() => setIsFollowerSelectorOpen(false)}
        onSelect={handleFollowerSelect}
        selectedStockId={null}
      />
    </div>
  );
}

export default FollowUpStock;
