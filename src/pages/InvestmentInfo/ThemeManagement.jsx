import React, { useState, useEffect } from 'react';
import { getApiUrl, API_ENDPOINTS } from '../../utils/api';
import KRStockSelector from '../../components/KRStockSelector';

const THEMES_API = getApiUrl(API_ENDPOINTS.THEMES);
const KR_STOCKS_API = getApiUrl(API_ENDPOINTS.KR_STOCKS);

function ThemeManagement() {
  const [themes, setThemes] = useState([]);
  const [themeCategoriesMap, setThemeCategoriesMap] = useState({}); // themeId -> categories[]
  const [expandedThemeIds, setExpandedThemeIds] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null); // { type: 'theme'|'category', id, themeId }
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null);
  const [themeFormData, setThemeFormData] = useState({ name: '', description: '', cycle_info: '' });
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' });
  const [isKRStockSelectorOpen, setIsKRStockSelectorOpen] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [reasonFormData, setReasonFormData] = useState({ reason: '' });
  const [stockListRefreshKey, setStockListRefreshKey] = useState(0);

  useEffect(() => {
    loadThemes();
    loadStocks();
  }, []);

  const searchLower = searchQuery.trim().toLowerCase();

  // 카테고리 검색에 걸린 테마는 펼쳐서 하위 카테고리가 보이게
  useEffect(() => {
    if (!searchLower) return;
    setExpandedThemeIds((prev) => {
      const next = new Set(prev);
      themes.forEach((t) => {
        const cats = themeCategoriesMap[t.id] || [];
        const catMatch = cats.some(
          (c) =>
            (c.name && c.name.toLowerCase().includes(searchLower)) ||
            (c.description && c.description.toLowerCase().includes(searchLower))
        );
        if (catMatch) next.add(t.id);
      });
      return next;
    });
  }, [searchLower, themes, themeCategoriesMap]);

  /** themes + theme_categories 한 번에 로드 (DB joinedload와 동일) */
  const loadThemes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${THEMES_API}/with-categories?skip=0&limit=10000`);
      if (!response.ok) throw new Error('테마·카테고리 목록을 불러오는데 실패했습니다.');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('잘못된 응답 형식입니다.');
      const map = {};
      const themeRows = data.map((t) => {
        const raw = t.theme_categories || [];
        map[t.id] = [...raw].sort((a, b) => {
          const oa = a.order_no ?? 0;
          const ob = b.order_no ?? 0;
          if (oa !== ob) return oa - ob;
          return (a.name || '').localeCompare(b.name || '', 'ko');
        });
        const { theme_categories: _c, ...rest } = t;
        return rest;
      });
      setThemes(themeRows);
      setThemeCategoriesMap(map);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStocks = async () => {
    try {
      const response = await fetch(`${KR_STOCKS_API}?limit=1000`);
      if (!response.ok) throw new Error('종목 목록을 불러오는데 실패했습니다.');
      const data = await response.json();
      setStocks(data);
    } catch (err) {
      console.error('Error loading stocks:', err);
    }
  };

  const handleExpandTheme = (themeId) => {
    setExpandedThemeIds((prev) => {
      const next = new Set(prev);
      if (next.has(themeId)) next.delete(themeId);
      else next.add(themeId);
      return next;
    });
  };

  const handleSelectNode = (node) => {
    setSelectedNode(node);
  };

  const handleAddTheme = () => {
    setEditingTheme(null);
    setThemeFormData({ name: '', description: '', cycle_info: '' });
    setIsThemeModalOpen(true);
  };

  const handleEditTheme = (e, theme) => {
    e.stopPropagation();
    setEditingTheme(theme);
    setThemeFormData({
      name: theme.name,
      description: theme.description || '',
      cycle_info: theme.cycle_info || '',
    });
    setIsThemeModalOpen(true);
  };

  const handleSubmitTheme = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const url = editingTheme ? `${THEMES_API}/${editingTheme.id}` : THEMES_API;
      const method = editingTheme ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(themeFormData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '저장에 실패했습니다.');
      }
      await loadThemes();
      setIsThemeModalOpen(false);
      setEditingTheme(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTheme = async (e, themeId) => {
    e.stopPropagation();
    if (!window.confirm('정말 삭제하시겠습니까? 하위 카테고리와 종목도 함께 삭제됩니다.')) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${THEMES_API}/${themeId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('삭제에 실패했습니다.');
      await loadThemes();
      if (selectedNode?.type === 'theme' && selectedNode?.id === themeId) setSelectedNode(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = (e, themeId) => {
    e.stopPropagation();
    setEditingCategory(null);
    setCategoryFormData({ name: '', description: '' });
    setSelectedNode({ type: 'theme', id: themeId, themeId });
    setIsCategoryModalOpen(true);
  };

  const handleEditCategory = (e, category, themeId) => {
    e.stopPropagation();
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
    });
    setIsCategoryModalOpen(true);
  };

  const handleSubmitCategory = async (e) => {
    e.preventDefault();
    const themeId = editingCategory ? editingCategory.theme_id : selectedNode?.themeId;
    if (!themeId) return;

    setLoading(true);
    setError(null);
    try {
      const url = editingCategory
        ? `${THEMES_API}/categories/${editingCategory.id}`
        : `${THEMES_API}/${themeId}/categories`;
      const method = editingCategory ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryFormData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '저장에 실패했습니다.');
      }
      await loadThemes();
      setExpandedThemeIds((prev) => new Set([...prev, themeId]));
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (e, categoryId, themeId) => {
    e.stopPropagation();
    if (!window.confirm('정말 삭제하시겠습니까? 하위 종목도 함께 삭제됩니다.')) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${THEMES_API}/categories/${categoryId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('삭제에 실패했습니다.');
      await loadThemes();
      if (selectedNode?.type === 'category' && selectedNode?.id === categoryId) setSelectedNode(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = () => {
    if (!selectedNode) return;
    setEditingStock(null);
    setIsKRStockSelectorOpen(true);
  };

  const handleStockSelect = async (stock) => {
    if (!selectedNode) return;
    setLoading(true);
    setError(null);
    try {
      const themeId = selectedNode.type === 'theme' ? selectedNode.id : selectedNode.themeId;
      const categoryId = selectedNode.type === 'category' ? selectedNode.id : null;
      const payload = { theme_id: themeId, stock_id: stock.id, category_id: categoryId };

      let url, method;
      if (editingStock) {
        url = `${THEMES_API}/stocks/${editingStock.id}`;
        method = 'PUT';
      } else if (categoryId) {
        url = `${THEMES_API}/categories/${categoryId}/stocks`;
        method = 'POST';
      } else {
        url = `${THEMES_API}/${themeId}/stocks`;
        method = 'POST';
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '저장에 실패했습니다.');
      }
      await loadThemes();
      setStockListRefreshKey((k) => k + 1);
      setIsKRStockSelectorOpen(false);
      setEditingStock(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditStock = (themeStock) => {
    setEditingStock(themeStock);
    setReasonFormData({ reason: themeStock.reason || '' });
    setIsReasonModalOpen(true);
  };

  const handleSubmitReason = async (e) => {
    e.preventDefault();
    if (!editingStock) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${THEMES_API}/stocks/${editingStock.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reasonFormData.reason }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '저장에 실패했습니다.');
      }
      await loadThemes();
      setStockListRefreshKey(k => k + 1);
      setIsReasonModalOpen(false);
      setEditingStock(null);
      setReasonFormData({ reason: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStock = async (themeStockId, themeId) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${THEMES_API}/stocks/${themeStockId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('삭제에 실패했습니다.');
      await loadThemes();
      setStockListRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredThemes = (searchLower
    ? themes.filter((t) => {
        const themeHit =
          (t.name && t.name.toLowerCase().includes(searchLower)) ||
          (t.description && t.description.toLowerCase().includes(searchLower)) ||
          (t.cycle_info && String(t.cycle_info).toLowerCase().includes(searchLower));
        const cats = themeCategoriesMap[t.id] || [];
        const categoryHit = cats.some(
          (c) =>
            (c.name && c.name.toLowerCase().includes(searchLower)) ||
            (c.description && c.description.toLowerCase().includes(searchLower))
        );
        return themeHit || categoryHit;
      })
    : themes
  ).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-4 text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 flex-1 lg:items-stretch">
        {/* 왼쪽: 테마/카테고리 트리 */}
        <div className="lg:col-span-1 bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6 flex flex-col max-h-[calc(100vh-200px)] min-h-0">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h2 className="text-xl font-bold text-white">테마 / 카테고리</h2>
            <button
              onClick={handleAddTheme}
              className="px-3 py-1.5 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium text-sm rounded-lg transition-colors"
            >
              + 테마 추가
            </button>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="테마·카테고리 검색…"
            className="w-full px-3 py-2 mb-4 bg-wealth-card border border-gray-700 rounded-lg text-white text-sm placeholder:text-wealth-muted focus:outline-none focus:ring-2 focus:ring-wealth-gold shrink-0"
          />
          {loading && <div className="text-wealth-muted text-sm shrink-0">로딩 중...</div>}
          <div className="space-y-1 flex-1 min-h-0 overflow-y-auto">
            {filteredThemes.map((theme) => (
              <ThemeTreeNode
                key={theme.id}
                theme={theme}
                categories={[...(themeCategoriesMap[theme.id] || [])].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'))}
                isExpanded={expandedThemeIds.has(theme.id)}
                onExpand={() => handleExpandTheme(theme.id)}
                onSelectTheme={() => handleSelectNode({ type: 'theme', id: theme.id, themeId: theme.id })}
                onSelectCategory={(cat) => handleSelectNode({ type: 'category', id: cat.id, themeId: theme.id })}
                selectedNode={selectedNode}
                onEditTheme={(e) => handleEditTheme(e, theme)}
                onDeleteTheme={(e) => handleDeleteTheme(e, theme.id)}
                onAddCategory={(e) => handleAddCategory(e, theme.id)}
                onEditCategory={(e, cat) => handleEditCategory(e, cat, theme.id)}
                onDeleteCategory={(e, cat) => handleDeleteCategory(e, cat.id, theme.id)}
              />
            ))}
            {filteredThemes.length === 0 && !loading && (
              <p className="text-wealth-muted text-sm py-4">등록된 테마가 없습니다.</p>
            )}
          </div>
        </div>

        {/* 오른쪽: 종목 등록 */}
        <div className="lg:col-span-2 bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6 flex flex-col max-h-[calc(100vh-200px)] min-h-0">
          <StockPanel
            selectedNode={selectedNode}
            themes={themes}
            themeCategoriesMap={themeCategoriesMap}
            THEMES_API={THEMES_API}
            refreshKey={stockListRefreshKey}
            onAddStock={handleAddStock}
            onEditStock={handleEditStock}
            onDeleteStock={handleDeleteStock}
            loading={loading}
          />
        </div>
      </div>

      {/* 테마 모달 */}
      {isThemeModalOpen && (
        <ThemeModal
          themeFormData={themeFormData}
          setThemeFormData={setThemeFormData}
          onSubmit={handleSubmitTheme}
          onClose={() => { setIsThemeModalOpen(false); setEditingTheme(null); }}
          editingTheme={editingTheme}
          loading={loading}
        />
      )}

      {/* 카테고리 모달 */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <CategoryModal
            categoryFormData={categoryFormData}
            setCategoryFormData={setCategoryFormData}
            onSubmit={handleSubmitCategory}
            onClose={() => { setIsCategoryModalOpen(false); setEditingCategory(null); }}
            editingCategory={editingCategory}
            loading={loading}
          />
        </div>
      )}

      {/* 종목 선택 모달 */}
      {isKRStockSelectorOpen && (
        <KRStockSelector
          isOpen={isKRStockSelectorOpen}
          onClose={() => { setIsKRStockSelectorOpen(false); setEditingStock(null); }}
          onSelect={handleStockSelect}
          selectedStockId={editingStock ? editingStock.stock_id : null}
        />
      )}

      {/* 사유 모달 */}
      {isReasonModalOpen && editingStock && (
        <ReasonModal
          reasonFormData={reasonFormData}
          setReasonFormData={setReasonFormData}
          onSubmit={handleSubmitReason}
          onClose={() => { setIsReasonModalOpen(false); setEditingStock(null); setReasonFormData({ reason: '' }); }}
          editingStock={editingStock}
          loading={loading}
        />
      )}
    </div>
  );
}

function ThemeTreeNode({
  theme,
  categories,
  isExpanded,
  onExpand,
  onSelectTheme,
  onSelectCategory,
  selectedNode,
  onEditTheme,
  onDeleteTheme,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}) {
  const isThemeSelected = selectedNode?.type === 'theme' && selectedNode?.id === theme.id;
  const hasCategories = categories.length > 0;
  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer group ${
          isThemeSelected ? 'bg-wealth-gold/20 border border-wealth-gold' : 'hover:bg-wealth-card/50'
        }`}
        onClick={() => onSelectTheme()}
      >
        {hasCategories ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            className="w-5 h-5 shrink-0 flex items-center justify-center rounded text-wealth-gold hover:text-yellow-300 hover:bg-wealth-gold/15 font-semibold text-[10px] leading-none border border-wealth-gold/40"
            title={`카테고리 ${categories.length}개 — 펼치기/접기`}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? '카테고리 접기' : '카테고리 펼치기'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        ) : (
          <span
            className="w-5 h-5 shrink-0 flex items-center justify-center rounded border border-dashed border-gray-600 text-gray-500 text-xs font-mono select-none"
            title="등록된 카테고리 없음"
            aria-label="카테고리 없음"
          >
            —
          </span>
        )}
        <span className="flex-1 text-white font-medium truncate flex items-center gap-1.5 min-w-0">
          {theme.name}
          {hasCategories && (
            <span className="text-[10px] font-normal text-wealth-gold/90 whitespace-nowrap shrink-0 px-1.5 py-0.5 rounded bg-wealth-gold/10 border border-wealth-gold/25">
              {categories.length}
            </span>
          )}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => onEditTheme(e)}
            className="px-2 py-0.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            수정
          </button>
          <button
            onClick={(e) => onDeleteTheme(e)}
            className="px-2 py-0.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
          >
            삭제
          </button>
          <button
            onClick={(e) => onAddCategory(e)}
            className="px-2 py-0.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded"
          >
            + 카테고리
          </button>
        </div>
      </div>
      {isExpanded && categories.length > 0 && (
        <div className="ml-6 mt-1 space-y-1 border-l border-gray-700 pl-2">
          {categories.map((cat) => {
            const isCatSelected = selectedNode?.type === 'category' && selectedNode?.id === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => onSelectCategory(cat)}
                className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer group ${
                  isCatSelected ? 'bg-wealth-gold/20 border border-wealth-gold' : 'hover:bg-wealth-card/50'
                }`}
              >
                <span className="flex-1 text-wealth-muted text-sm truncate">{cat.name}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => onEditCategory(e, cat)}
                    className="px-1.5 py-0.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                  >
                    수정
                  </button>
                  <button
                    onClick={(e) => onDeleteCategory(e, cat)}
                    className="px-1.5 py-0.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                  >
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StockPanel({
  selectedNode,
  themes,
  themeCategoriesMap,
  THEMES_API,
  refreshKey,
  onAddStock,
  onEditStock,
  onDeleteStock,
  loading,
}) {
  const [themeStocks, setThemeStocks] = useState([]);
  const [loadingStocks, setLoadingStocks] = useState(false);

  useEffect(() => {
    if (!selectedNode) {
      setThemeStocks([]);
      return;
    }
    const fetchStocks = async () => {
      setLoadingStocks(true);
      try {
        const themeId = selectedNode.type === 'theme' ? selectedNode.id : selectedNode.themeId;
        const categoryId = selectedNode.type === 'category' ? selectedNode.id : null;
        const url = categoryId
          ? `${THEMES_API}/${themeId}/stocks?category_id=${categoryId}`
          : `${THEMES_API}/${themeId}/stocks`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          const filtered = categoryId ? list : list.filter(ts => !ts.category_id);
          setThemeStocks(filtered);
        } else {
          setThemeStocks([]);
        }
      } catch (err) {
        setThemeStocks([]);
      } finally {
        setLoadingStocks(false);
      }
    };
    fetchStocks();
  }, [selectedNode, THEMES_API, refreshKey]);

  if (!selectedNode) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-wealth-muted">
        <p className="text-lg">왼쪽에서 테마 또는 카테고리를 선택하세요.</p>
        <p className="text-sm mt-2">선택한 테마/카테고리에 속하는 종목을 등록할 수 있습니다.</p>
      </div>
    );
  }

  const theme = themes.find(t => t.id === (selectedNode.type === 'theme' ? selectedNode.id : selectedNode.themeId));
  const category = selectedNode.type === 'category'
    ? (themeCategoriesMap[selectedNode.themeId] || []).find(c => c.id === selectedNode.id)
    : null;
  const title = category ? `${theme?.name || ''} - ${category?.name || ''}` : (theme?.name || '상위 테마 종목');

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h2 className="text-xl font-bold text-white">
          {title} ({themeStocks.length}개)
        </h2>
        <button
          onClick={onAddStock}
          disabled={loading}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          + 종목 추가
        </button>
      </div>

      {loadingStocks ? (
        <div className="text-wealth-muted py-8 flex-1">로딩 중...</div>
      ) : themeStocks.length === 0 ? (
        <div className="text-wealth-muted py-8 text-center flex-1">
          등록된 종목이 없습니다. 종목 추가 버튼을 눌러 등록하세요.
        </div>
      ) : (
        <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
          {themeStocks.map((ts) => (
            <div
              key={ts.id}
              className="bg-wealth-card/30 rounded-lg p-4 flex justify-between items-start border border-gray-700"
            >
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium">
                  {ts.stock?.name} ({ts.stock?.ticker})
                </p>
                {ts.stock?.business_summary && (
                  <p className="text-wealth-muted text-sm mt-1 line-clamp-2">{ts.stock.business_summary}</p>
                )}
                {ts.reason && (
                  <p className="text-wealth-gold text-sm mt-2 italic">선정 사유: {ts.reason}</p>
                )}
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                <button
                  onClick={() => onEditStock(ts)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                >
                  수정
                </button>
                <button
                  onClick={() => onDeleteStock(ts.id, ts.theme_id)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeModal({ themeFormData, setThemeFormData, onSubmit, onClose, editingTheme, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-wealth-card rounded-xl p-6 w-full max-w-md">
        <h3 className="text-xl font-bold text-white mb-4">{editingTheme ? '테마 수정' : '테마 추가'}</h3>
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-wealth-muted mb-2">테마명 *</label>
              <input
                type="text"
                value={themeFormData.name}
                onChange={(e) => setThemeFormData({ ...themeFormData, name: e.target.value })}
                className="w-full bg-wealth-card border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-wealth-muted mb-2">설명</label>
              <textarea
                value={themeFormData.description}
                onChange={(e) => setThemeFormData({ ...themeFormData, description: e.target.value })}
                className="w-full bg-wealth-card border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-wealth-muted mb-2">주기 정보</label>
              <input
                type="text"
                value={themeFormData.cycle_info}
                onChange={(e) => setThemeFormData({ ...themeFormData, cycle_info: e.target.value })}
                placeholder="예: 연 2회, 3월/9월"
                className="w-full bg-wealth-card border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-wealth-gold"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg">
              취소
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium rounded-lg disabled:opacity-50">
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CategoryModal({ categoryFormData, setCategoryFormData, onSubmit, onClose, editingCategory, loading }) {
  return (
    <div className="bg-wealth-card rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">{editingCategory ? '카테고리 수정' : '카테고리 추가'}</h3>
      <form onSubmit={onSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-wealth-muted mb-2">카테고리명 *</label>
            <input
              type="text"
              value={categoryFormData.name}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
              className="w-full bg-wealth-card border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-wealth-gold"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-wealth-muted mb-2">설명</label>
            <textarea
              value={categoryFormData.description}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
              className="w-full bg-wealth-card border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-wealth-gold"
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg">
            취소
          </button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium rounded-lg disabled:opacity-50">
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ReasonModal({ reasonFormData, setReasonFormData, onSubmit, onClose, editingStock, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-wealth-card rounded-xl p-6 w-full max-w-md">
        <h3 className="text-xl font-bold text-white mb-4">테마 종목 선정 사유</h3>
        {editingStock?.stock && (
          <p className="text-wealth-muted mb-4">종목: {editingStock.stock.name} ({editingStock.stock.ticker})</p>
        )}
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-wealth-muted mb-2">선정 사유</label>
              <textarea
                value={reasonFormData.reason}
                onChange={(e) => setReasonFormData({ ...reasonFormData, reason: e.target.value })}
                className="w-full bg-wealth-card border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                rows={5}
                placeholder="이 종목을 테마 종목으로 선정한 사유를 입력하세요."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg">
              취소
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium rounded-lg disabled:opacity-50">
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ThemeManagement;
