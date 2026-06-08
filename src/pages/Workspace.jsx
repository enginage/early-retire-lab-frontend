import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import TabbedContent from '../components/TabbedContent';
import { useTabs, isTabMenuKey } from '../contexts/TabContext';

export default function Workspace() {
  const location = useLocation();
  const { openTab } = useTabs();

  useEffect(() => {
    const tabKey = location.state?.openTab;
    if (tabKey && isTabMenuKey(tabKey)) {
      openTab(tabKey);
    }
  }, [location.state?.openTab, openTab]);

  return (
    <AppLayout>
      <TabbedContent />
    </AppLayout>
  );
}
