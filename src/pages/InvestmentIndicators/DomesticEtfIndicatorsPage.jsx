import React from 'react';
import AppLayout from '../../layouts/AppLayout';
import PageSeo from '../../components/PageSeo';
import SeoContentSection from '../../components/SeoContentSection';
import { getPageSeo } from '../../config/publicTools';
import { getPageSeoContent } from '../../config/seoPageContent';
import DomesticEtfIndicatorsView from './DomesticEtfIndicatorsView';

export default function DomesticEtfIndicatorsPage() {
  const seo = getPageSeo('domestic-etf-indicators');
  const seoContent = getPageSeoContent('domestic-etf-indicators');

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
      <DomesticEtfIndicatorsView />
    </AppLayout>
  );
}
