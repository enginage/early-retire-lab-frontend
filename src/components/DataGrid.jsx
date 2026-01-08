import React, { useState, useEffect } from 'react';

/**
 * 공통 그리드 컴포넌트
 * @param {Object} props
 * @param {Array} props.columns - 컬럼 정의 배열 [{ key, label, align, width, render }]
 * @param {Array} props.data - 데이터 배열
 * @param {string|number|null} props.editingId - 현재 편집 중인 행의 ID ('new' 또는 실제 ID)
 * @param {string|number|null} props.selectedId - 선택된 행의 ID
 * @param {Function} props.onRowClick - 행 클릭 핸들러 (rowId) => void
 * @param {Function} props.onEdit - 수정 버튼 클릭 핸들러 (rowId) => void
 * @param {Function} props.onDelete - 삭제 버튼 클릭 핸들러 (rowId) => void
 * @param {Function} props.onSave - 저장 버튼 클릭 핸들러 (rowData) => void
 * @param {Function} props.onCancel - 취소 버튼 클릭 핸들러 () => void
 * @param {boolean} props.loading - 로딩 상태
 * @param {boolean} props.showRowNumber - 행번호 표시 여부 (기본값: true)
 * @param {boolean} props.showActions - 작업 컬럼 표시 여부 (기본값: true)
 * @param {Function} props.renderNewRow - 새 행 렌더링 함수 (columns) => ReactNode
 * @param {Function} props.renderEditRow - 편집 행 렌더링 함수 (row, columns) => ReactNode
 * @param {Function} props.renderViewRow - 조회 행 렌더링 함수 (row, columns) => ReactNode
 * @param {string} props.emptyMessage - 데이터가 없을 때 표시할 메시지
 */
function DataGrid({
  columns = [],
  data = [],
  editingId = null,
  selectedId = null,
  onRowClick = null,
  onEdit = null,
  onDelete = null,
  onSave = null,
  onCancel = null,
  loading = false,
  showRowNumber = true,
  showActions = true,
  renderNewRow = null,
  renderEditRow = null,
  renderViewRow = null,
  emptyMessage = '등록된 데이터가 없습니다.',
}) {
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // 데이터가 변경되거나 편집 모드가 변경되면 첫 페이지로 리셋
  useEffect(() => {
    if (editingId === null) {
      setCurrentPage(1);
    }
  }, [data.length, editingId]);

  // 페이징 계산
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  const handleRowClick = (rowId) => {
    // 편집 중이 아닐 때만 행 클릭 처리
    if (editingId === null && onRowClick) {
      onRowClick(rowId);
    }
  };

  const handleActionClick = (e, handler) => {
    e.stopPropagation();
    if (handler) {
      handler();
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ tableLayout: 'auto', width: '100%' }}>
        <thead>
          <tr className="border-b border-gray-700">
            {showRowNumber && (
              <th className="text-center py-3 px-4 text-wealth-muted font-medium w-16 border-r border-gray-700/50 whitespace-nowrap">번호</th>
            )}
            {columns.map((col, index) => (
              <th
                key={col.key}
                className={`text-center py-3 px-4 text-wealth-muted font-medium break-words ${
                  index < columns.length - 1 || showActions ? 'border-r border-gray-700/50' : ''
                }`}
                style={col.width ? { width: col.width } : (!showRowNumber && !showActions) ? { width: `${100 / columns.length}%` } : {}}
              >
                {col.label}
              </th>
            ))}
            {showActions && (
              <th className="text-center py-3 px-4 text-wealth-muted font-medium whitespace-nowrap" style={{ width: '150px' }}>작업</th>
            )}
          </tr>
        </thead>
        <tbody>
          {/* 새 행 (편집 모드) */}
          {editingId === 'new' && renderNewRow && (
            <tr className="border-b border-gray-700/50 hover:bg-gray-800/30">
              {showRowNumber && (
                <td className="py-3 px-4 text-center text-white text-sm border-r border-gray-700/50">-</td>
              )}
              {renderNewRow(columns)}
              {showActions && (
                <td className="py-3 px-4" style={{ width: '150px' }}>
                    <div className="flex gap-2 justify-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleActionClick(e, () => onSave && onSave(null))}
                        disabled={loading}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        저장
                      </button>
                      <button
                        onClick={(e) => handleActionClick(e, () => onCancel && onCancel())}
                        disabled={loading}
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                      >
                        취소
                      </button>
                    </div>
                </td>
              )}
            </tr>
          )}

          {/* 데이터 행 */}
          {currentData.map((row, index) => {
            const isEditing = editingId === row.id;
            const isSelected = selectedId === row.id;
            const isClickable = editingId === null && onRowClick !== null;
            const rowNumber = startIndex + index + 1;

            return (
              <tr
                key={row.id}
                className={`border-b border-gray-700/50 hover:bg-gray-800/30 ${
                  isSelected ? 'bg-wealth-gold/10' : ''
                } ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={() => handleRowClick(row.id)}
              >
                {showRowNumber && (
                  <td className="py-3 px-4 text-center text-white text-sm border-r border-gray-700/50">
                    {rowNumber}
                  </td>
                )}
                {isEditing && renderEditRow ? (
                  renderEditRow(row, columns)
                ) : renderViewRow ? (
                  renderViewRow(row, columns)
                ) : (
                  columns.map((col, colIndex) => {
                    const value = row[col.key];
                    const cellContent = col.render ? col.render(value, row) : value || '-';
                    return (
                      <td
                        key={col.key}
                        className={`py-3 px-4 text-white text-sm break-words ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        } ${colIndex < columns.length - 1 || showActions ? 'border-r border-gray-700/50' : ''}`}
                        style={col.width ? { width: col.width } : (!showRowNumber && !showActions) ? { width: `${100 / columns.length}%` } : {}}
                      >
                        {cellContent}
                      </td>
                    );
                  })
                )}
                {showActions && (
                  <td className="py-3 px-4" style={{ width: '150px' }}>
                    <div className="flex gap-2 justify-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {isEditing ? (
                        <>
                          <button
                            onClick={(e) => handleActionClick(e, () => onSave && onSave(row))}
                            disabled={loading}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            저장
                          </button>
                          <button
                            onClick={(e) => handleActionClick(e, () => onCancel && onCancel())}
                            disabled={loading}
                            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <>
                          {onEdit && (
                            <button
                              onClick={(e) => handleActionClick(e, () => onEdit(row.id))}
                              disabled={loading || editingId !== null}
                              className="px-3 py-1 text-sm text-wealth-gold hover:bg-wealth-gold/10 rounded transition-colors disabled:opacity-50"
                            >
                              수정
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={(e) => handleActionClick(e, () => onDelete(row.id))}
                              disabled={loading || editingId !== null}
                              className="px-3 py-1 text-sm text-red-400 hover:bg-red-400/10 rounded transition-colors disabled:opacity-50"
                            >
                              삭제
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 빈 데이터 메시지 */}
      {data.length === 0 && !loading && editingId !== 'new' && (
        <div className="text-center py-8 text-wealth-muted">{emptyMessage}</div>
      )}

      {/* 페이징 컨트롤 */}
      {data.length > itemsPerPage && !loading && editingId !== 'new' && (
        <div className="flex items-center justify-between mt-4 px-4 py-3 border-t border-gray-700/50">
          <div className="text-sm text-wealth-muted">
            전체 {data.length}개 중 {startIndex + 1}-{Math.min(endIndex, data.length)}개 표시
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-wealth-card border border-gray-700 rounded text-white hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // 페이지 번호가 많을 경우 일부만 표시
                if (totalPages <= 7) {
                  // 7페이지 이하면 모두 표시
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        currentPage === page
                          ? 'bg-wealth-gold text-white'
                          : 'bg-wealth-card border border-gray-700 text-white hover:bg-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else {
                  // 7페이지 초과면 현재 페이지 주변만 표시
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          currentPage === page
                            ? 'bg-wealth-gold text-white'
                            : 'bg-wealth-card border border-gray-700 text-white hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <span key={page} className="px-2 text-wealth-muted">
                        ...
                      </span>
                    );
                  }
                  return null;
                }
              })}
            </div>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm bg-wealth-card border border-gray-700 rounded text-white hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataGrid;

