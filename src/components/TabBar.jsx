import React from 'react';
import { useTabs } from '../contexts/TabContext';

export default function TabBar() {
  const { tabs, activeTabId, switchTab, closeTab, maxTabsMessage } = useTabs();

  if (tabs.length === 0) return null;

  return (
    <div className="relative">
      {maxTabsMessage && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 flex justify-center">
          <div className="bg-wealth-gold/90 text-wealth-dark px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
            최대 10개까지 열 수 있습니다.
          </div>
        </div>
      )}
    <div className="flex gap-0 border-b border-gray-700 bg-wealth-card/30 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            role="button"
            tabIndex={0}
            onClick={() => switchTab(tab.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                switchTab(tab.id);
              }
              if (e.key === 'Delete' || (e.key === 'w' && e.ctrlKey)) {
                e.preventDefault();
                closeTab(tab.id);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 min-w-0 max-w-[200px] cursor-pointer transition-colors border-b-2 ${
              isActive
                ? 'bg-wealth-card text-wealth-gold border-wealth-gold'
                : 'bg-wealth-card/50 text-wealth-muted border-transparent hover:bg-wealth-card/70 hover:text-white'
            }`}
          >
            <span className="truncate text-sm font-medium">{tab.label}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                isActive
                  ? 'hover:bg-wealth-gold/20 text-wealth-gold'
                  : 'hover:bg-gray-600 text-gray-400'
              }`}
              aria-label={`${tab.label} 탭 닫기`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
    </div>
  );
}
