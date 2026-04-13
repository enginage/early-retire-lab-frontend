import React from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { isTabMenuKey } from '../contexts/TabContext';

const PATH_DEFAULT_TAB = {
  '/experience-lab': 'early-retirement',
  '/financial-status': 'expense',
  '/settings': 'basic',
  '/investment-indicators': 'usa-market-indicators',
};

export default function RedirectToWorkspace({ path }) {
  const [searchParams] = useSearchParams();
  const menu = searchParams.get('menu');
  const tabKey = isTabMenuKey(menu) ? menu : PATH_DEFAULT_TAB[path] || 'opportunity-cost';

  return <Navigate to="/workspace" state={{ openTab: tabKey }} replace />;
}
