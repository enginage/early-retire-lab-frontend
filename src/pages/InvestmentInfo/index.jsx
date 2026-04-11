import React from 'react';
import AppLayout from '../../layouts/AppLayout';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ThemeManagement from './ThemeManagement';
import FollowUpStock from './FollowUpStock';
import RelatedStock from './RelatedStock';
import LimitUpSurgeAnalysis from './LimitUpSurgeAnalysis';

function InvestmentInfo() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const menu = searchParams.get('menu') || 'themes';

  const handleTabClick = (menuKey) => {
    navigate(`/investment-info?menu=${menuKey}`, { replace: true });
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-wealth-dark pb-20">
        <div className="max-w-[95%] mx-auto px-6 py-8">
          <div className="space-y-8">
            {/* 메뉴 탭 */}
            <div className="flex gap-4 border-b border-gray-700">
              <button
                onClick={() => handleTabClick('themes')}
                className={`px-4 py-2 font-medium transition-colors ${
                  menu === 'themes'
                    ? 'text-wealth-gold border-b-2 border-wealth-gold'
                    : 'text-wealth-muted hover:text-white'
                }`}
              >
                테마별 종목 관리
              </button>
              <button
                onClick={() => handleTabClick('follow-up-stocks')}
                className={`px-4 py-2 font-medium transition-colors ${
                  menu === 'follow-up-stocks'
                    ? 'text-wealth-gold border-b-2 border-wealth-gold'
                    : 'text-wealth-muted hover:text-white'
                }`}
              >
                후속주
              </button>
              <button
                onClick={() => handleTabClick('related-stocks')}
                className={`px-4 py-2 font-medium transition-colors ${
                  menu === 'related-stocks'
                    ? 'text-wealth-gold border-b-2 border-wealth-gold'
                    : 'text-wealth-muted hover:text-white'
                }`}
              >
                관련주
              </button>
              <button
                onClick={() => handleTabClick('limitup-surge-analysis')}
                className={`px-4 py-2 font-medium transition-colors ${
                  menu === 'limitup-surge-analysis'
                    ? 'text-wealth-gold border-b-2 border-wealth-gold'
                    : 'text-wealth-muted hover:text-white'
                }`}
              >
                국장 상한가 및 급등 분석
              </button>
            </div>

            {/* 컨텐츠 */}
            {menu === 'themes' && <ThemeManagement />}
            {menu === 'follow-up-stocks' && <FollowUpStock />}
            {menu === 'related-stocks' && <RelatedStock />}
            {menu === 'limitup-surge-analysis' && <LimitUpSurgeAnalysis />}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default InvestmentInfo;
