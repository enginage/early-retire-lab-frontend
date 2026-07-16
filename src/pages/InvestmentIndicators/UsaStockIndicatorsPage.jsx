import React from 'react';
import AppLayout from '../../layouts/AppLayout';
import PageSeo from '../../components/PageSeo';
import SeoContentSection from '../../components/SeoContentSection';
import { getPageSeo } from '../../config/publicTools';
import { getPageSeoContent } from '../../config/seoPageContent';
import UsaStockIndicatorsView from './UsaStockIndicatorsView';

export default function UsaStockIndicatorsPage() {
  const seo = getPageSeo('usa-stock-indicators');
  const seoContent = getPageSeoContent('usa-stock-indicators');

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
      <UsaStockIndicatorsView />
    </AppLayout>
  );
}
