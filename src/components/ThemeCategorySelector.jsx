import React, { useState, useEffect } from 'react';
import { getApiUrl, API_ENDPOINTS } from '../utils/api';

const THEMES_API = getApiUrl(API_ENDPOINTS.THEMES);

function ThemeCategorySelector({ isOpen, onClose, onSelect, selectedThemeId = null, selectedCategoryId = null }) {
  const [themes, setThemes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadThemes();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setCategories([]);
      setSelectedTheme(null);
      setSelectedCategory(null);
      return;
    }
    if (selectedThemeId) {
      const theme = themes.find((t) => t.id === selectedThemeId);
      setSelectedTheme(theme || null);
      loadCategories(selectedThemeId);
    } else {
      setSelectedTheme(null);
      setSelectedCategory(null);
      setCategories([]);
    }
  }, [isOpen, selectedThemeId, themes]);

  useEffect(() => {
    if (isOpen && selectedThemeId && selectedCategoryId) {
      const cat = categories.find((c) => c.id === selectedCategoryId);
      setSelectedCategory(cat || null);
    }
  }, [isOpen, selectedThemeId, selectedCategoryId, categories]);

  const loadThemes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${THEMES_API}?skip=0&limit=500`);
      if (!response.ok) throw new Error('테마 목록을 불러오는데 실패했습니다.');
      const data = await response.json();
      setThemes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async (themeId) => {
    try {
      const response = await fetch(`${THEMES_API}/${themeId}/categories`);
      if (!response.ok) return setCategories([]);
      const data = await response.json();
      setCategories(data);
    } catch {
      setCategories([]);
    }
  };

  const handleThemeClick = (theme) => {
    setSelectedTheme(theme);
    setSelectedCategory(null);
    loadCategories(theme.id);
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
  };

  const handleConfirm = () => {
    if (!selectedTheme) return;
    onSelect({
      theme_id: selectedTheme.id,
      theme: selectedTheme,
      category_id: selectedCategory?.id ?? null,
      category: selectedCategory ?? null,
    });
    onClose();
  };

  const handleSelectTopLevel = () => {
    if (!selectedTheme) return;
    onSelect({
      theme_id: selectedTheme.id,
      theme: selectedTheme,
      category_id: null,
      category: null,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-wealth-card rounded-xl border border-gray-800 shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white">테마 · 카테고리 선택</h2>
          <button onClick={onClose} className="text-wealth-muted hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400 mb-4">{error}</div>
          )}

          {loading ? (
            <div className="text-center py-16 text-wealth-muted">로딩 중...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 좌측: 테마 선택 */}
              <div className="flex flex-col">
                <h3 className="text-sm font-medium text-wealth-muted mb-3">테마 선택</h3>
                <div className="space-y-2">
                  {[...themes]
                    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'))
                    .map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeClick(theme)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        selectedTheme?.id === theme.id
                          ? 'bg-wealth-gold/20 border border-wealth-gold'
                          : 'bg-wealth-card/50 border border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="font-semibold text-white">{theme.name}</div>
                      {theme.description && (
                        <div className="text-sm text-wealth-muted line-clamp-1">{theme.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 우측: 카테고리 선택 */}
              <div className="flex flex-col">
                <h3 className="text-sm font-medium text-wealth-muted mb-3">
                  카테고리 선택 {selectedTheme ? '(선택사항)' : ''}
                </h3>
                <div className="space-y-2">
                  {selectedTheme ? (
                    <>
                      <button
                        onClick={handleSelectTopLevel}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          !selectedCategory ? 'bg-wealth-gold/20 border border-wealth-gold' : 'bg-wealth-card/50 border border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="font-medium text-white">상위 테마 (카테고리 없음)</div>
                      </button>
                      {[...categories]
                        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'))
                        .map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => handleCategoryClick(cat)}
                          className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                            selectedCategory?.id === cat.id
                              ? 'bg-wealth-gold/20 border border-wealth-gold'
                              : 'bg-wealth-card/50 border border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <div className="font-medium text-white">{cat.name}</div>
                          {cat.description && (
                            <div className="text-sm text-wealth-muted line-clamp-1">{cat.description}</div>
                          )}
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="text-wealth-muted text-sm py-8 text-center">
                      좌측에서 테마를 선택해주세요
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-800 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={selectedCategory ? handleConfirm : handleSelectTopLevel}
            disabled={!selectedTheme}
            className="px-4 py-2 bg-wealth-gold hover:bg-yellow-600 text-wealth-dark font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

export default ThemeCategorySelector;
