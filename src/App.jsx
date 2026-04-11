import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TabProvider } from './contexts/TabContext';
import Introduction from './pages/Introduction';
import AppLayout from './layouts/AppLayout';
import Workspace from './pages/Workspace';
import RedirectToWorkspace from './components/RedirectToWorkspace';
import FreeLiving from './pages/FreeLiving';
import InvestmentIndicators from './pages/InvestmentIndicators';
import Login from './pages/Auth/Login';
import SignUp from './pages/Auth/SignUp';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import { ensureKRStockCache } from './components/KRStockSelector';
import { ensureLatestDailyChartCache } from './utils/latestDailyChartCache';

function App() {
  // 앱 시작 시 국내주식 목록 + 종목별 최신 일봉(등락률 등) 캐시 미리 로드
  useEffect(() => {
    ensureKRStockCache().catch(err => {
      console.error('Failed to preload KR stocks cache:', err);
    });
    ensureLatestDailyChartCache().catch(err => {
      console.error('Failed to preload latest daily chart cache:', err);
    });
  }, []);
  return (
    <AuthProvider>
      <Router>
        <TabProvider>
          <Routes>
            <Route path="/" element={<Introduction />} />
            <Route path="/experience-lab" element={<RedirectToWorkspace path="/experience-lab" />} />
            <Route path="/financial-status" element={<RedirectToWorkspace path="/financial-status" />} />
            <Route path="/target-setting" element={<Navigate to="/workspace" state={{ openTab: 'opportunity-cost' }} replace />} />
            <Route path="/simulation" element={<Navigate to="/workspace" state={{ openTab: 'opportunity-cost' }} replace />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/opportunity-cost" element={<Navigate to="/workspace" state={{ openTab: 'opportunity-cost' }} replace />} />
            <Route path="/kr-stock-summary" element={<Navigate to="/workspace" state={{ openTab: 'kr-stock-summary' }} replace />} />
            <Route path="/stock-trading-log" element={<Navigate to="/workspace" state={{ openTab: 'stock-trading-log' }} replace />} />
            <Route path="/investment-info" element={<Navigate to="/workspace" state={{ openTab: 'theme-management' }} replace />} />
            <Route path="/theme-management" element={<Navigate to="/workspace" state={{ openTab: 'theme-management' }} replace />} />
            <Route path="/market-condition-theme" element={<Navigate to="/workspace" state={{ openTab: 'market-condition-theme' }} replace />} />
            <Route path="/follow-up-stocks" element={<Navigate to="/workspace" state={{ openTab: 'follow-up-stocks' }} replace />} />
            <Route path="/related-stocks" element={<Navigate to="/workspace" state={{ openTab: 'related-stocks' }} replace />} />
            <Route path="/limitup-surge-analysis" element={<Navigate to="/workspace" state={{ openTab: 'limitup-surge-analysis' }} replace />} />
            <Route path="/enterprise-analysis" element={<Navigate to="/workspace" state={{ openTab: 'enterprise-analysis' }} replace />} />
            <Route path="/stock-news-history" element={<Navigate to="/workspace" state={{ openTab: 'stock-news-history' }} replace />} />
            <Route path="/stock-disclosure-history" element={<Navigate to="/workspace" state={{ openTab: 'stock-disclosure-history' }} replace />} />
            <Route path="/batch-jobs" element={<Navigate to="/workspace" state={{ openTab: 'batch-jobs' }} replace />} />
            <Route path="/early-retirement" element={<Navigate to="/workspace" state={{ openTab: 'early-retirement' }} replace />} />
            <Route path="/domestic-high-dividend" element={<Navigate to="/workspace" state={{ openTab: 'domestic-high-dividend' }} replace />} />
            <Route path="/usa-high-dividend" element={<Navigate to="/workspace" state={{ openTab: 'usa-high-dividend' }} replace />} />
            <Route path="/expense" element={<Navigate to="/workspace" state={{ openTab: 'expense' }} replace />} />
            <Route path="/basic" element={<Navigate to="/workspace" state={{ openTab: 'basic' }} replace />} />
            <Route path="/investment-indicators-settings" element={<Navigate to="/workspace" state={{ openTab: 'investment-indicators-settings' }} replace />} />
            <Route path="/commoncode" element={<Navigate to="/workspace" state={{ openTab: 'commoncode' }} replace />} />
            <Route path="/financial" element={<Navigate to="/workspace" state={{ openTab: 'financial' }} replace />} />
            <Route path="/kr-stocks" element={<Navigate to="/workspace" state={{ openTab: 'kr-stocks' }} replace />} />
            <Route path="/usa-stocks" element={<Navigate to="/workspace" state={{ openTab: 'usa-stocks' }} replace />} />
            <Route path="/domestic-etf" element={<Navigate to="/workspace" state={{ openTab: 'domestic-etf' }} replace />} />
            <Route path="/usa-etf" element={<Navigate to="/workspace" state={{ openTab: 'usa-etf' }} replace />} />
            <Route path="/free-living" element={<FreeLiving />} />
            <Route path="/settings" element={<RedirectToWorkspace path="/settings" />} />
            <Route path="/investment-indicators" element={<InvestmentIndicators />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </TabProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
