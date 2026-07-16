import React from 'react';
import AppLayout from '../../layouts/AppLayout';
import PageSeo from '../../components/PageSeo';
import SeoContentSection from '../../components/SeoContentSection';
import { getPageSeo } from '../../config/publicTools';
import { getPageSeoContent } from '../../config/seoPageContent';
import KrMarketIndicatorsView from './KrMarketIndicatorsView';

export default function KrMarketIndicatorsPage() {
  const seo = getPageSeo('kr-market-indicators');
  const seoContent = getPageSeoContent('kr-market-indicators');

  return (
    <AppLayout>
      <PageSeo
        title={seo.title}
        description={seo.description}
        canonicalPath={seo.path}
      />
      <SeoContentSection
        title={seoContent.title}
        paragraphs={seoContent.paragraphs}
        steps={seoContent.steps}
        faqs={seoContent.faqs}
      />
      <KrMarketIndicatorsView />
    </AppLayout>
  );
}
