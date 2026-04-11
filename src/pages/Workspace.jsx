import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import TabbedContent from '../components/TabbedContent';
import { useTabs } from '../contexts/TabContext';

const TAB_KEYS = [
  'opportunity-cost', 'kr-stock-summary', 'stock-trading-log',
  'theme-management', 'market-condition-theme', 'follow-up-stocks', 'related-stocks', 'limitup-surge-analysis', 'enterprise-analysis', 'stock-news-history', 'stock-disclosure-history', 'batch-jobs',
  'early-retirement', 'domestic-high-dividend', 'usa-high-dividend',
  'expense',
  'basic', 'investment-indicators-settings', 'commoncode', 'financial',
  'kr-stocks', 'usa-stocks', 'domestic-etf', 'usa-etf',
];

export default function Workspace() {
  const location = useLocation();
  const { openTab } = useTabs();

  useEffect(() => {
    const tabKey = location.state?.openTab;
    if (tabKey && TAB_KEYS.includes(tabKey)) {
      openTab(tabKey);
    }
  }, [location.state?.openTab, openTab]);

  return (
    <AppLayout>
      <TabbedContent />
    </AppLayout>
  );
}
