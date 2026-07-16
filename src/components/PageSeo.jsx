import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SITE_NAME, getCanonicalUrl } from '../config/publicTools';

/**
 * 페이지별 title, description, canonical, OG 태그
 * @param {{ title: string, description: string, canonicalPath: string }} props
 */
export default function PageSeo({ title, description, canonicalPath }) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const canonical = getCanonicalUrl(canonicalPath);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="ko_KR" />
    </Helmet>
  );
}
