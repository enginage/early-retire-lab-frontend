import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout';
import OpportunityCost from './OpportunityCost';
import KRStockSummary from './KRStockSummary';

const MENUS = [
  { key: 'opportunity-cost', label: '기회비용' },
  { key: 'kr-stock-summary', label: '국내 주식 종합' },
];

function TargetSetting() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const menuFromUrl = searchParams.get('menu') || 'opportunity-cost';
  const [activeMenu, setActiveMenu] = useState(menuFromUrl);

  useEffect(() => {
    const menu = searchParams.get('menu');
    if (!menu) {
      navigate('/target-setting?menu=opportunity-cost', { replace: true });
    } else {
      setActiveMenu(menu);
    }
  }, [searchParams, navigate]);

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
    navigate(`/target-setting?menu=${menu}`);
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'opportunity-cost':
        return <OpportunityCost />;
      case 'kr-stock-summary':
        return <KRStockSummary />;
      default:
        return <OpportunityCost />;
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-wealth-dark pb-20">
        <div className="max-w-[95%] mx-auto px-6 py-8">
          {/* 탭 메뉴 */}
          <div className="flex gap-4 border-b border-gray-700 mb-6">
            {MENUS.map((menu) => (
              <button
                key={menu.key}
                onClick={() => handleMenuClick(menu.key)}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeMenu === menu.key
                    ? 'text-wealth-gold border-b-2 border-wealth-gold'
                    : 'text-wealth-muted hover:text-white'
                }`}
              >
                {menu.label}
              </button>
            ))}
          </div>

          {/* 컨텐츠 */}
          {renderContent()}
        </div>
      </div>
    </AppLayout>
  );
}

export default TargetSetting;

