import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout';
import ExpenseManagement from './ExpenseManagement';
import ISAAccountManagement from './ISAAccountManagement';
import PensionFundAccountManagement from './PensionFundAccountManagement';
import IRPAccountManagement from './IRPAccountManagement';
import AssetIndicatorManagement from './AssetIndicatorManagement';

const MENUS = [
  { key: 'expense', label: '월평균지출' },
  { key: 'isa', label: 'ISA' },
  { key: 'pension-fund', label: '연금저축펀드' },
  { key: 'irp', label: 'IRP' },
  { key: 'irp-asset-indicators', label: '보유자산 기술지표' },
];

function FinancialStatus() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const menuFromUrl = searchParams.get('menu') || 'expense';
  const [activeMenu, setActiveMenu] = useState(menuFromUrl);

  useEffect(() => {
    const menu = searchParams.get('menu');
    if (!menu) {
      navigate('/financial-status?menu=expense', { replace: true });
    } else {
      setActiveMenu(menu);
    }
  }, [searchParams, navigate]);

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
    navigate(`/financial-status?menu=${menu}`);
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'expense':
        return <ExpenseManagement />;
      case 'isa':
        return <ISAAccountManagement />;
      case 'pension-fund':
        return <PensionFundAccountManagement />;
      case 'irp':
        return <IRPAccountManagement />;
      case 'irp-asset-indicators':
        return <AssetIndicatorManagement />;
      default:
        return <ExpenseManagement />;
    }
  };

  return (
    <AppLayout>
      {renderContent()}
    </AppLayout>
  );
}

export default FinancialStatus;

