import React from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout';
import PageSeo from '../../components/PageSeo';
import SeoContentSection from '../../components/SeoContentSection';
import PublicToolsHub from '../../components/PublicToolsHub';
import { getPageSeo, isPublicToolKey } from '../../config/publicTools';
import { getPageSeoContent } from '../../config/seoPageContent';
import { getHubBySeoKey } from '../../config/hubPages';
import EarlyRetirementSimulation from './EarlyRetirementSimulation';
import DomesticHighDividendSimulation from './DomesticHighDividendSimulation';
import USAHighDividendSimulation from './USAHighDividendSimulation';

const experienceLabHub = getHubBySeoKey('experience-lab');

function ExperienceLab() {
  const [searchParams] = useSearchParams();
  const menu = searchParams.get('menu');
  const isHubView = !menu;

  const activeMenu = menu || 'early-retirement';
  const seo = isHubView
    ? getPageSeo('experience-lab')
    : getPageSeo(activeMenu) ?? getPageSeo('early-retirement');
  const seoContent = !isHubView && isPublicToolKey(activeMenu)
    ? getPageSeoContent(activeMenu)
    : null;

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
      <PageSeo
        title={seo.title}
        description={seo.description}
        canonicalPath={seo.path}
      />
      {isHubView ? (
        <PublicToolsHub hub={experienceLabHub} />
      ) : (
        <>
          {seoContent && (
            <SeoContentSection
              title={seoContent.title}
              paragraphs={seoContent.paragraphs}
              steps={seoContent.steps}
              faqs={seoContent.faqs}
            />
          )}
          {renderContent()}
        </>
      )}
    </AppLayout>
  );
}

export default ExperienceLab;
