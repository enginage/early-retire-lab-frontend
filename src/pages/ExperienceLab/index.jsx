import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout';
import EarlyRetirementSimulation from './EarlyRetirementSimulation';
import DomesticHighDividendSimulation from './DomesticHighDividendSimulation';
import USAHighDividendSimulation from './USAHighDividendSimulation';

const MENUS = [
  { key: 'early-retirement', label: '조기은퇴 시뮬레이션' },
  { key: 'domestic-high-dividend', label: '국내 고배당 ETF 시뮬레이션' },
  { key: 'usa-high-dividend', label: '미국 고배당 ETF 시뮬레이션' },
  // { key: 'us-dividend', label: '미장 월 배당' },
  // { key: 'kr-dividend', label: '국장 월 배당' },
  // { key: 'us-trading-signal', label: '미장 매매 시그널' },
  // { key: 'kr-trading-signal', label: '국장 ETF 가이드' },
];

function ExperienceLab() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const menuFromUrl = searchParams.get('menu') || 'early-retirement';
  const [activeMenu, setActiveMenu] = React.useState(menuFromUrl);

  React.useEffect(() => {
    const menu = searchParams.get('menu');
    if (!menu) {
      navigate('/experience-lab?menu=early-retirement', { replace: true });
    } else {
      setActiveMenu(menu);
    }
  }, [searchParams, navigate]);

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
    navigate(`/experience-lab?menu=${menu}`);
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'early-retirement':
        return <EarlyRetirementSimulation />;
      case 'domestic-high-dividend':
        return <DomesticHighDividendSimulation />;
      case 'usa-high-dividend':
        return <USAHighDividendSimulation />;
      case 'us-dividend':
        return <div className="p-6"><h2 className="text-2xl font-bold text-white mb-4">미장 월 배당</h2><p className="text-wealth-muted">미장 월 배당 기능은 준비 중입니다.</p></div>;
      case 'kr-dividend':
        return <div className="p-6"><h2 className="text-2xl font-bold text-white mb-4">국장 월 배당</h2><p className="text-wealth-muted">국장 월 배당 기능은 준비 중입니다.</p></div>;
      case 'us-trading-signal':
        return <div className="p-6"><h2 className="text-2xl font-bold text-white mb-4">미장 매매 시그널</h2><p className="text-wealth-muted">미장 매매 시그널 기능은 준비 중입니다.</p></div>;
      case 'kr-trading-signal':
        return <div className="p-6"><h2 className="text-2xl font-bold text-white mb-4">국장 매매 시그널</h2><p className="text-wealth-muted">국장 매매 시그널 기능은 준비 중입니다.</p></div>;
      default:
        return <EarlyRetirementSimulation />;
    }
  };

  return (
    <AppLayout>
      {renderContent()}
    </AppLayout>
  );
}

export default ExperienceLab;

