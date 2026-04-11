import React from 'react';
import { useTabs } from '../contexts/TabContext';
import TabBar from './TabBar';
import OpportunityCost from '../pages/TargetSetting/OpportunityCost';
import KRStockSummary from '../pages/TargetSetting/KRStockSummary';
import StockTradingLog from '../pages/StockTradingLog';
import ThemeManagement from '../pages/InvestmentInfo/ThemeManagement';
import FollowUpStock from '../pages/InvestmentInfo/FollowUpStock';
import RelatedStock from '../pages/InvestmentInfo/RelatedStock';
import LimitUpSurgeAnalysis from '../pages/InvestmentInfo/LimitUpSurgeAnalysis';
import MarketConditionTheme from '../pages/InvestmentInfo/MarketConditionTheme';
import EnterpriseAnalysis from '../pages/InvestmentInfo/EnterpriseAnalysis';
import StockNewsHistory from '../pages/InvestmentInfo/StockNewsHistory';
import StockDisclosureHistory from '../pages/InvestmentInfo/StockDisclosureHistory';
import BatchJobs from '../pages/BatchJobs';
import EarlyRetirementSimulation from '../pages/ExperienceLab/EarlyRetirementSimulation';
import DomesticHighDividendSimulation from '../pages/ExperienceLab/DomesticHighDividendSimulation';
import USAHighDividendSimulation from '../pages/ExperienceLab/USAHighDividendSimulation';
import ExpenseManagement from '../pages/FinancialStatus/ExpenseManagement';
import BasicSettings from '../pages/Settings/BasicSettings';
import InvestmentIndicatorsSettings from '../pages/Settings/InvestmentIndicatorsSettings';
import CommonCode from '../pages/Settings/CommonCode';
import FinancialInstitution from '../pages/Settings/FinancialInstitution';
import KRStocks from '../pages/Settings/KRStocks';
import USAStocks from '../pages/Settings/USAStocks';
import DomesticETF from '../pages/Settings/DomesticETF';
import USAETF from '../pages/Settings/USAETF';

const TAB_COMPONENTS = {
  'opportunity-cost': OpportunityCost,
  'kr-stock-summary': KRStockSummary,
  'stock-trading-log': StockTradingLog,
  'theme-management': ThemeManagement,
  'follow-up-stocks': FollowUpStock,
  'related-stocks': RelatedStock,
  'limitup-surge-analysis': LimitUpSurgeAnalysis,
  'market-condition-theme': MarketConditionTheme,
  'enterprise-analysis': EnterpriseAnalysis,
  'stock-news-history': StockNewsHistory,
  'stock-disclosure-history': StockDisclosureHistory,
  'batch-jobs': BatchJobs,
  'early-retirement': EarlyRetirementSimulation,
  'domestic-high-dividend': DomesticHighDividendSimulation,
  'usa-high-dividend': USAHighDividendSimulation,
  'expense': ExpenseManagement,
  'basic': BasicSettings,
  'investment-indicators-settings': InvestmentIndicatorsSettings,
  'commoncode': CommonCode,
  'financial': FinancialInstitution,
  'kr-stocks': KRStocks,
  'usa-stocks': USAStocks,
  'domestic-etf': DomesticETF,
  'usa-etf': USAETF,
};

export default function TabbedContent() {
  const { tabs, activeTabId } = useTabs();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (tabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-wealth-muted">
        <p className="text-lg mb-2">메뉴를 클릭하여 화면을 열어주세요</p>
        <p className="text-sm">상단 메뉴에서 원하는 항목을 선택하세요</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <TabBar />
      <div className="flex-1 overflow-hidden">
        {tabs.map((tab) => {
          const Component = TAB_COMPONENTS[tab.key];
          if (!Component) return null;
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={`h-full overflow-y-auto ${!isActive ? 'hidden' : ''}`}
              aria-hidden={!isActive}
            >
              {tab.key === 'stock-trading-log' ? (
                <Component embed />
              ) : (
                <Component />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
