import React from 'react';
import AppLayout from '../../layouts/AppLayout';
import PageSeo from '../../components/PageSeo';
import PublicToolsHub from '../../components/PublicToolsHub';
import { getPageSeo } from '../../config/publicTools';
import { getHubBySeoKey } from '../../config/hubPages';

const hub = getHubBySeoKey('investment-indicators');

export default function InvestmentIndicatorsHub() {
  const seo = getPageSeo('investment-indicators');

  return (
    <AppLayout>
      <PageSeo
        title={seo.title}
        description={seo.description}
        canonicalPath={seo.path}
      />
      <PublicToolsHub hub={hub} />
    </AppLayout>
  );
}
