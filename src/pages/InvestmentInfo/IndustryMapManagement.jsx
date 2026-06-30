import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getApiUrl, API_ENDPOINTS } from '../../utils/api';
import KRStockSelector from '../../components/KRStockSelector';

const API = getApiUrl(API_ENDPOINTS.INDUSTRY_MAPS);

const NODE_TYPE_LABEL = {
  sector: '섹터',
  sub1: '소분류1',
  sub2: '소분류2',
  sub3: '소분류3',
  sub4: '소분류4',
};

const CHILD_BUTTON_LABEL = {
  industry: '+ 섹터',
  sector: '+ 소분류1',
  sub1: '+ 소분류2',
  sub2: '+ 소분류3',
  sub3: '+ 소분류4',
};

function nodeMatchesSearch(node, q) {
  if (!q) return true;
  const nameHit = String(node.name || '').toLowerCase().includes(q);
  const childHit = (node.children || []).some((c) => nodeMatchesSearch(c, q));
  return nameHit || childHit;
}

function industryMatchesSearch(industry, q) {
  if (!q) return true;
  const nameHit =
    String(industry.name || '').toLowerCase().includes(q) ||
    String(industry.description || '').toLowerCase().includes(q);
  const nodeHit = (industry.nodes || []).some((n) => nodeMatchesSearch(n, q));
  return nameHit || nodeHit;
}

function collectExpandNodeIds(nodes, q, prefix = '') {
  const ids = new Set();
  if (!q) return ids;
  for (const n of nodes || []) {
    const key = `${prefix}${n.id}`;
    if (nodeMatchesSearch(n, q)) {
      ids.add(n.id);
      for (const c of n.children || []) {
        ids.add(c.id);
      }
    }
    for (const cid of collectExpandNodeIds(n.children, q, prefix)) {
      ids.add(cid);
    }
  }
  return ids;
}

/** 업종 → … → 선택 노드까지 경로 (breadcrumb) */
function buildNodeBreadcrumb(industry, nodeId) {
  if (!industry) return [];
  const findPath = (nodes, acc) => {
    for (const n of nodes || []) {
      const seg = {
        label: NODE_TYPE_LABEL[n.node_type] || n.node_type,
        name: n.name,
      };
      if (n.id === nodeId) return [...acc, seg];
      const found = findPath(n.children, [...acc, seg]);
      if (found) return found;
    }
    return null;
  };
  const nodePath = findPath(industry.nodes, []);
  if (!nodePath) return [];
  return [{ label: '업종', name: industry.name }, ...nodePath];
}

function MapNodeRow({
  node,
  depth,
  industryId,
  selectedNode,
  expandedNodeIds,
  onToggleExpand,
  onSelectNode,
  onEditNode,
  onDeleteNode,
  onAddChild,
}) {
  const hasChildren = (node.children || []).length > 0;
  const isExpanded = expandedNodeIds.has(node.id);
  const isSelected =
    selectedNode?.type === 'node' &&
    selectedNode.id === node.id &&
    selectedNode.industryId === industryId;
  const canAddChild = node.node_type !== 'sub4';
  const childLabel = CHILD_BUTTON_LABEL[node.node_type] || '+ 하위';

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer group ${
          isSelected ? 'bg-wealth-gold/20 border border-wealth-gold' : 'hover:bg-wealth-card/50'
        }`}
        style={{ marginLeft: depth * 12 }}
        onClick={() =>
          onSelectNode({
            type: 'node',
            id: node.id,
            industryId,
            nodeType: node.node_type,
            name: node.name,
          })
        }
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            className="w-5 h-5 shrink-0 flex items-center justify-center rounded text-wealth-gold hover:bg-wealth-gold/15 text-[10px] border border-wealth-gold/40"
            aria-expanded={isExpanded}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className="w-5 h-5 shrink-0" />
        )}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-wealth-muted shrink-0">
          {NODE_TYPE_LABEL[node.node_type] || node.node_type}
        </span>
        <span className="flex-1 text-sm text-white truncate">{node.name}</span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            type="button"
            onClick={(e) => onEditNode(e, node, industryId)}
            className="px-1.5 py-0.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            수정
          </button>
          <button
            type="button"
            onClick={(e) => onDeleteNode(e, node.id, industryId)}
            className="px-1.5 py-0.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
          >
            삭제
          </button>
          {canAddChild && (
            <button
              type="button"
              onClick={(e) => onAddChild(e, node, industryId)}
              className="px-1.5 py-0.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded whitespace-nowrap"
            >
              {childLabel}
            </button>
          )}
        </div>
      </div>
      {isExpanded &&
        (node.children || []).map((child) => (
          <MapNodeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            industryId={industryId}
            selectedNode={selectedNode}
            expandedNodeIds={expandedNodeIds}
            onToggleExpand={onToggleExpand}
            onSelectNode={onSelectNode}
            onEditNode={onEditNode}
            onDeleteNode={onDeleteNode}
            onAddChild={onAddChild}
          />
        ))}
    </div>
  );
}

function IndustryMapManagement() {
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndustryIds, setExpandedIndustryIds] = useState(new Set());
  const [expandedNodeIds, setExpandedNodeIds] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  const [stockRefreshKey, setStockRefreshKey] = useState(0);

  const [isIndustryModalOpen, setIsIndustryModalOpen] = useState(false);
  const [editingIndustry, setEditingIndustry] = useState(null);
  const [industryForm, setIndustryForm] = useState({ name: '', description: '', order_no: 0 });

  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [nodeParent, setNodeParent] = useState(null);
  const [nodeIndustryId, setNodeIndustryId] = useState(null);
  const [nodeForm, setNodeForm] = useState({ name: '', order_no: 0 });

  const [isStockSelectorOpen, setIsStockSelectorOpen] = useState(false);

  const industryNameInputRef = useRef(null);
  const nodeNameInputRef = useRef(null);

  useEffect(() => {
    if (!isIndustryModalOpen) return;
    requestAnimationFrame(() => {
      industryNameInputRef.current?.focus({ preventScroll: true });
    });
  }, [isIndustryModalOpen]);

  useEffect(() => {
    if (!isNodeModalOpen) return;
    requestAnimationFrame(() => {
      nodeNameInputRef.current?.focus({ preventScroll: true });
    });
  }, [isNodeModalOpen]);

  const loadIndustries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/with-tree?skip=0&limit=1000`);
      if (!res.ok) throw new Error('업종 지도 목록을 불러오지 못했습니다.');
      const data = await res.json();
      setIndustries(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setIndustries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIndustries();
  }, [loadIndustries]);

  const searchLower = searchQuery.trim().toLowerCase();

  useEffect(() => {
    if (!searchLower) return;
    setExpandedIndustryIds((prev) => {
      const next = new Set(prev);
      industries.forEach((ind) => {
        if (industryMatchesSearch(ind, searchLower)) next.add(ind.id);
      });
      return next;
    });
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      industries.forEach((ind) => {
        collectExpandNodeIds(ind.nodes, searchLower).forEach((id) => next.add(id));
      });
      return next;
    });
  }, [searchLower, industries]);

  const filteredIndustries = useMemo(() => {
    const list = searchLower
      ? industries.filter((ind) => industryMatchesSearch(ind, searchLower))
      : industries;
    return [...list].sort((a, b) => {
      const oa = a.order_no ?? 0;
      const ob = b.order_no ?? 0;
      if (oa !== ob) return oa - ob;
      return String(a.name || '').localeCompare(String(b.name || ''), 'ko');
    });
  }, [industries, searchLower]);

  const findNodeInTree = useCallback((industryId, nodeId) => {
    const ind = industries.find((i) => i.id === industryId);
    if (!ind) return null;
    const walk = (nodes) => {
      for (const n of nodes || []) {
        if (n.id === nodeId) return n;
        const found = walk(n.children);
        if (found) return found;
      }
      return null;
    };
    return walk(ind.nodes);
  }, [industries]);

  const selectedStocks = useMemo(() => {
    if (selectedNode?.type !== 'node') return [];
    const node = findNodeInTree(selectedNode.industryId, selectedNode.id);
    return node?.stocks || [];
  }, [selectedNode, findNodeInTree, stockRefreshKey, industries]);

  const selectedNodeBreadcrumb = useMemo(() => {
    if (selectedNode?.type !== 'node') return [];
    const ind = industries.find((i) => i.id === selectedNode.industryId);
    return buildNodeBreadcrumb(ind, selectedNode.id);
  }, [selectedNode, industries]);

  const parseDetail = async (res) => {
    try {
      const body = await res.json();
      if (typeof body.detail === 'string') return body.detail;
      if (Array.isArray(body.detail)) return body.detail.map((e) => e.msg || JSON.stringify(e)).join('; ');
      return JSON.stringify(body.detail || body);
    } catch {
      return res.statusText || '요청 실패';
    }
  };

  const handleToggleIndustry = (id) => {
    setExpandedIndustryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleNode = (id) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddIndustry = () => {
    setEditingIndustry(null);
    setIndustryForm({ name: '', description: '', order_no: 0 });
    setIsIndustryModalOpen(true);
  };

  const handleEditIndustryClick = (e, industry) => {
    e.stopPropagation();
    setEditingIndustry(industry);
    setIndustryForm({
      name: industry.name || '',
      description: industry.description || '',
      order_no: industry.order_no ?? 0,
    });
    setIsIndustryModalOpen(true);
  };

  const handleSubmitIndustry = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const url = editingIndustry ? `${API}/${editingIndustry.id}` : API;
      const method = editingIndustry ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(industryForm),
      });
      if (!res.ok) throw new Error(await parseDetail(res));
      await loadIndustries();
      setIsIndustryModalOpen(false);
      setEditingIndustry(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIndustry = async (e, industryId) => {
    e.stopPropagation();
    if (!window.confirm('업종과 하위 섹터·종목 매핑이 모두 삭제됩니다. 계속할까요?')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/${industryId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await parseDetail(res));
      await loadIndustries();
      if (selectedNode?.industryId === industryId) setSelectedNode(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openNodeModal = (parent, industryId, editing = null) => {
    setNodeParent(parent);
    setNodeIndustryId(industryId);
    setEditingNode(editing);
    setNodeForm({
      name: editing?.name || '',
      order_no: editing?.order_no ?? 0,
    });
    setIsNodeModalOpen(true);
  };

  const handleAddSector = (e, industryId) => {
    e.stopPropagation();
    openNodeModal(null, industryId, null);
  };

  const handleAddChild = (e, parentNode, industryId) => {
    e.stopPropagation();
    openNodeModal(parentNode, industryId, null);
  };

  const handleEditNode = (e, node, industryId) => {
    e.stopPropagation();
    openNodeModal(null, industryId, node);
  };

  const handleSubmitNode = async (e) => {
    e.preventDefault();
    if (!nodeIndustryId) return;
    setLoading(true);
    setError(null);
    try {
      if (editingNode) {
        const res = await fetch(`${API}/nodes/${editingNode.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: nodeForm.name, order_no: nodeForm.order_no }),
        });
        if (!res.ok) throw new Error(await parseDetail(res));
      } else {
        const payload = {
          name: nodeForm.name,
          order_no: nodeForm.order_no,
          parent_id: nodeParent?.id ?? null,
        };
        const res = await fetch(`${API}/${nodeIndustryId}/nodes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await parseDetail(res));
      }
      await loadIndustries();
      setExpandedIndustryIds((prev) => new Set([...prev, nodeIndustryId]));
      if (nodeParent?.id) setExpandedNodeIds((prev) => new Set([...prev, nodeParent.id]));
      setIsNodeModalOpen(false);
      setEditingNode(null);
      setNodeParent(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNode = async (e, nodeId, industryId) => {
    e.stopPropagation();
    if (!window.confirm('노드와 하위 분류·종목 매핑이 삭제됩니다. 계속할까요?')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/nodes/${nodeId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await parseDetail(res));
      await loadIndustries();
      if (selectedNode?.type === 'node' && selectedNode.id === nodeId) setSelectedNode(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStockSelect = async (stock) => {
    if (selectedNode?.type !== 'node') return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/nodes/${selectedNode.id}/stocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_id: stock.id }),
      });
      if (!res.ok) throw new Error(await parseDetail(res));
      await loadIndustries();
      setStockRefreshKey((k) => k + 1);
      setIsStockSelectorOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStock = async (mappingId) => {
    if (selectedNode?.type !== 'node') return;
    if (!window.confirm('종목을 이 노드에서 제거할까요?')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API}/nodes/${selectedNode.id}/stocks/${mappingId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error(await parseDetail(res));
      await loadIndustries();
      setStockRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const nodeModalTitle = () => {
    if (editingNode) return `${NODE_TYPE_LABEL[editingNode.node_type] || '노드'} 수정`;
    if (nodeParent) {
      const next = CHILD_BUTTON_LABEL[nodeParent.node_type]?.replace('+ ', '') || '하위 노드';
      return `${next} 추가`;
    }
    return '섹터 추가';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-wealth-gold to-yellow-200 mb-1">
          업종 지도 관리
        </h1>
        <p className="text-wealth-muted text-sm">
          업종 → 섹터 → 소분류1~4 계층에 국내 주식을 배치합니다. 업종에는 종목을 등록할 수 없습니다.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-4 text-red-300">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 lg:items-stretch">
        <div className="lg:col-span-1 bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6 flex flex-col max-h-[calc(100vh-200px)] min-h-0">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h2 className="text-xl font-bold text-white">업종 / 분류</h2>
            <button
              type="button"
              onClick={handleAddIndustry}
              className="px-3 py-1.5 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium text-sm rounded-lg"
            >
              + 업종
            </button>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="업종·섹터·소분류 검색…"
            className="w-full px-3 py-2 mb-4 bg-wealth-card border border-gray-700 rounded-lg text-white text-sm placeholder:text-wealth-muted focus:outline-none focus:ring-2 focus:ring-wealth-gold shrink-0"
          />
          {loading && industries.length === 0 && (
            <div className="text-wealth-muted text-sm shrink-0">로딩 중…</div>
          )}
          <div className="space-y-1 flex-1 min-h-0 overflow-y-auto">
            {filteredIndustries.map((ind) => {
              const isExpanded = expandedIndustryIds.has(ind.id);
              const isSelected =
                selectedNode?.type === 'industry' && selectedNode.id === ind.id;
              const nodes = ind.nodes || [];
              return (
                <div key={ind.id} className="select-none">
                  <div
                    className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer group ${
                      isSelected ? 'bg-wealth-gold/20 border border-wealth-gold' : 'hover:bg-wealth-card/50'
                    }`}
                    onClick={() =>
                      setSelectedNode({ type: 'industry', id: ind.id, industryId: ind.id })
                    }
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleIndustry(ind.id);
                      }}
                      className="w-5 h-5 shrink-0 flex items-center justify-center rounded text-wealth-gold border border-wealth-gold/40 text-[10px]"
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-wealth-gold/20 text-wealth-gold shrink-0">
                      업종
                    </span>
                    <span className="flex-1 text-white font-medium truncate">{ind.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleEditIndustryClick(e, ind)}
                        className="px-2 py-0.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteIndustry(e, ind.id)}
                        className="px-2 py-0.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                      >
                        삭제
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleAddSector(e, ind.id)}
                        className="px-2 py-0.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded whitespace-nowrap"
                      >
                        + 섹터
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l border-gray-700 pl-2">
                      {nodes.length === 0 ? (
                        <p className="text-wealth-muted text-xs py-2 px-2">섹터가 없습니다.</p>
                      ) : (
                        nodes.map((node) => (
                          <MapNodeRow
                            key={node.id}
                            node={node}
                            depth={0}
                            industryId={ind.id}
                            selectedNode={selectedNode}
                            expandedNodeIds={expandedNodeIds}
                            onToggleExpand={handleToggleNode}
                            onSelectNode={setSelectedNode}
                            onEditNode={handleEditNode}
                            onDeleteNode={handleDeleteNode}
                            onAddChild={handleAddChild}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredIndustries.length === 0 && !loading && (
              <p className="text-wealth-muted text-sm py-4">등록된 업종이 없습니다.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl p-6 flex flex-col max-h-[calc(100vh-200px)] min-h-0">
          {!selectedNode ? (
            <div className="flex flex-col items-center justify-center h-64 text-wealth-muted">
              <p className="text-lg">왼쪽에서 업종 또는 분류 노드를 선택하세요.</p>
              <p className="text-sm mt-2">섹터·소분류에 국내 주식을 등록할 수 있습니다.</p>
            </div>
          ) : selectedNode.type === 'industry' ? (
            <div className="flex flex-col h-full">
              <h2 className="text-xl font-bold text-white mb-4 shrink-0">업종 정보</h2>
              {(() => {
                const ind = industries.find((i) => i.id === selectedNode.id);
                if (!ind) return <p className="text-wealth-muted">업종을 찾을 수 없습니다.</p>;
                return (
                  <div className="space-y-4">
                    <div>
                      <p className="text-wealth-muted text-sm mb-1">업종명</p>
                      <p className="text-white text-lg font-medium">{ind.name}</p>
                    </div>
                    {ind.description && (
                      <div>
                        <p className="text-wealth-muted text-sm mb-1">설명</p>
                        <p className="text-white whitespace-pre-wrap">{ind.description}</p>
                      </div>
                    )}
                    <p className="text-wealth-muted text-sm">
                      업종에는 종목을 직접 등록할 수 없습니다. 섹터 또는 소분류를 선택하세요.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleEditIndustryClick({ stopPropagation: () => {} }, ind)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm w-fit"
                    >
                      업종 수정
                    </button>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="flex flex-col h-full min-h-0">
              <div className="flex justify-between items-start gap-4 mb-4 shrink-0">
                <h2 className="text-xl font-bold text-white min-w-0">
                  {selectedNodeBreadcrumb.map((seg, idx) => (
                    <span key={`${seg.label}-${seg.name}-${idx}`}>
                      {idx > 0 && (
                        <span className="text-wealth-muted font-normal mx-1.5">·</span>
                      )}
                      <span className="text-wealth-muted text-sm font-normal">{seg.label}</span>{' '}
                      <span className="text-white">{seg.name}</span>
                    </span>
                  ))}
                  <span className="text-wealth-muted text-base font-normal ml-2 whitespace-nowrap">
                    ({selectedStocks.length}종목)
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={() => setIsStockSelectorOpen(true)}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg disabled:opacity-50"
                >
                  + 종목 추가
                </button>
              </div>
              {selectedStocks.length === 0 ? (
                <div className="text-wealth-muted py-8 text-center flex-1">
                  등록된 종목이 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 flex-1 min-h-0 overflow-y-auto content-start">
                  {selectedStocks.map((row) => (
                    <div
                      key={row.id}
                      className="bg-wealth-card/30 rounded-lg p-3.5 flex flex-col border border-gray-700 min-h-[8rem]"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-base leading-snug line-clamp-2">
                          {row.stock?.name || '-'}
                        </p>
                        <p className="text-wealth-gold font-mono text-sm mt-1.5">
                          {row.stock?.ticker || row.stock_id}
                        </p>
                        {row.stock?.market && (
                          <p className="text-wealth-muted text-sm mt-1">{row.stock.market}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteStock(row.id)}
                        className="mt-3 w-full px-2 py-1.5 bg-red-600/90 hover:bg-red-700 text-white text-xs rounded transition-colors"
                      >
                        제거
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isIndustryModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-wealth-card rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingIndustry ? '업종 수정' : '업종 추가'}
            </h3>
            <form onSubmit={handleSubmitIndustry}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-wealth-muted mb-2">업종명 *</label>
                  <input
                    ref={industryNameInputRef}
                    type="text"
                    value={industryForm.name}
                    onChange={(e) => setIndustryForm({ ...industryForm, name: e.target.value })}
                    className="w-full bg-wealth-card border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-wealth-muted mb-2">설명</label>
                  <textarea
                    value={industryForm.description}
                    onChange={(e) =>
                      setIndustryForm({ ...industryForm, description: e.target.value })
                    }
                    className="w-full bg-wealth-card border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm text-wealth-muted mb-2">정렬 순서</label>
                  <input
                    type="number"
                    value={industryForm.order_no}
                    onChange={(e) =>
                      setIndustryForm({ ...industryForm, order_no: Number(e.target.value) || 0 })
                    }
                    className="w-full bg-wealth-card border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsIndustryModalOpen(false);
                    setEditingIndustry(null);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium rounded-lg disabled:opacity-50"
                >
                  {loading ? '저장 중…' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isNodeModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-wealth-card rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">{nodeModalTitle()}</h3>
            <form onSubmit={handleSubmitNode}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-wealth-muted mb-2">이름 *</label>
                  <input
                    ref={nodeNameInputRef}
                    type="text"
                    value={nodeForm.name}
                    onChange={(e) => setNodeForm({ ...nodeForm, name: e.target.value })}
                    className="w-full bg-wealth-card border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-wealth-muted mb-2">정렬 순서</label>
                  <input
                    type="number"
                    value={nodeForm.order_no}
                    onChange={(e) =>
                      setNodeForm({ ...nodeForm, order_no: Number(e.target.value) || 0 })
                    }
                    className="w-full bg-wealth-card border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-wealth-gold"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsNodeModalOpen(false);
                    setEditingNode(null);
                    setNodeParent(null);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium rounded-lg disabled:opacity-50"
                >
                  {loading ? '저장 중…' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isStockSelectorOpen && (
        <KRStockSelector
          isOpen={isStockSelectorOpen}
          onClose={() => setIsStockSelectorOpen(false)}
          onSelect={handleStockSelect}
        />
      )}
    </div>
  );
}

export default IndustryMapManagement;
