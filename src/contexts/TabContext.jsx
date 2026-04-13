import React, { createContext, useContext, useState, useCallback } from 'react';

const MAX_TABS = 10;

const TabContext = createContext(null);

export const useTabs = () => {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error('useTabs must be used within TabProvider');
  return ctx;
};

export const TAB_LABELS = {
  // 시드모으기
  'opportunity-cost': '기회비용',
  'kr-stock-summary': '국내 주식 종합',
  'stock-trading-log': '국장매매일지',
  // 투자정보
  'theme-management': '테마별 종목 관리',
  'market-condition-theme': '시황별 테마관리',
  'follow-up-stocks': '후속주',
  'related-stocks': '관련주',
  'limitup-surge-analysis': '국장 상한가 및 급등 분석',
  'enterprise-analysis': '기업 분석',
  'stock-news-history': '주식 뉴스 이력',
  'stock-disclosure-history': '공시 이력',
  'batch-jobs': '배치 작업',
  // 실험실
  'early-retirement': '조기 은퇴 시뮬레이션',
  'domestic-high-dividend': '국내 고배당 ETF 시뮬레이션',
  'usa-high-dividend': '미국 고배당 ETF 시뮬레이션',
  // 투자지표
  'domestic-etf-indicators': '국내 ETF 지표',
  'usa-market-indicators': '미국시장지표',
  // 재무상태
  'expense': '월평균지출',
  // 환경설정
  'basic': '기본설정',
  'investment-indicators-settings': '투자지표 설정',
  'commoncode': '공통코드',
  'financial': '금융기관',
  'kr-stocks': '국내 주식',
  'usa-stocks': '미국 주식',
  'domestic-etf': '국내 ETF',
  'usa-etf': '미국 ETF',
};

export const isTabMenuKey = (key) => Object.keys(TAB_LABELS).includes(key);

export function TabProvider({ children }) {
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [maxTabsMessage, setMaxTabsMessage] = useState(false);

  const openTab = useCallback((key, label) => {
    const tabLabel = label || TAB_LABELS[key];
    if (!tabLabel) return;

    setTabs((prev) => {
      const existing = prev.find((t) => t.key === key);
      if (existing) {
        setActiveTabId(existing.id);
        return prev;
      }
      if (prev.length >= MAX_TABS) {
        setMaxTabsMessage(true);
        setTimeout(() => setMaxTabsMessage(false), 3000);
        return prev;
      }
      const newTab = { id: `tab-${Date.now()}`, key, label: tabLabel };
      setActiveTabId(newTab.id);
      return [...prev, newTab];
    });
  }, []);

  const closeTab = useCallback((tabId) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId);
      if (idx < 0) return prev;
      const next = prev.filter((t) => t.id !== tabId);
      if (prev[idx].id === activeTabId && next.length > 0) {
        const newActiveIdx = Math.min(idx, next.length - 1);
        setActiveTabId(next[newActiveIdx].id);
      } else if (next.length === 0) {
        setActiveTabId(null);
      }
      return next;
    });
  }, [activeTabId]);

  const switchTab = useCallback((tabId) => {
    setActiveTabId(tabId);
  }, []);

  const value = {
    tabs,
    activeTabId,
    openTab,
    closeTab,
    switchTab,
    maxTabsMessage,
    clearMaxTabsMessage: () => setMaxTabsMessage(false),
  };

  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}
