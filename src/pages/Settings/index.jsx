import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout';
import BasicSettings from './BasicSettings';
import CommonCode from './CommonCode';
import FinancialInstitution from './FinancialInstitution';
import DomesticETF from './DomesticETF';
import USAETF from './USAETF';
import InvestmentIndicatorsSettings from './InvestmentIndicatorsSettings';

const MENUS = [
  { key: 'basic', label: '기본설정' },
  { key: 'investment-indicators-settings', label: '투자지표 설정' },
  { key: 'commoncode', label: '공통코드' },
  { key: 'financial', label: '금융기관' },
  { key: 'domestic-etf', label: '국내 ETF' },
  { key: 'usa-etf', label: '미국 ETF' },
];

function Settings() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const menuFromUrl = searchParams.get('menu') || 'basic';
  const [activeMenu, setActiveMenu] = useState(menuFromUrl);

  useEffect(() => {
    const menu = searchParams.get('menu');
    if (!menu) {
      navigate('/settings?menu=basic', { replace: true });
    } else {
      setActiveMenu(menu);
    }
  }, [searchParams, navigate]);

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
    navigate(`/settings?menu=${menu}`);
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'basic':
        return <BasicSettings />;
      case 'investment-indicators-settings':
        return <InvestmentIndicatorsSettings />;
      case 'commoncode':
        return <CommonCode />;
      case 'financial':
        return <FinancialInstitution />;
      case 'domestic-etf':
        return <DomesticETF />;
      case 'usa-etf':
        return <USAETF />;
      default:
        return <BasicSettings />;
    }
  };

  return (
    <AppLayout>
      {renderContent()}
    </AppLayout>
  );
}

export default Settings;

