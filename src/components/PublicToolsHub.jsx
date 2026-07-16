import React from 'react';
import { Link } from 'react-router-dom';
import { getPageSeo } from '../config/publicTools';

/**
 * 공개 도구 허브 — 카테고리 소개 + 하위 도구 링크 카드
 * @param {{ hub: import('../config/hubPages').PUBLIC_HUBS[number] }} props
 */
export default function PublicToolsHub({ hub }) {
  const hubSeo = getPageSeo(hub.seoKey);
  const tools = hub.toolKeys.map((key) => ({ key, ...getPageSeo(key) }));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 pb-16">
      <nav className="text-sm text-wealth-muted mb-6" aria-label="breadcrumb">
        <Link to="/" className="hover:text-wealth-gold transition-colors">
          홈
        </Link>
        <span className="mx-2 text-gray-600">/</span>
        <span className="text-white">{hub.navLabel}</span>
      </nav>

      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
        {hubSeo?.title ?? hub.navLabel}
      </h1>
      <p className="text-base text-wealth-muted leading-relaxed mb-8 max-w-2xl">
        {hub.intro}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link
            key={tool.key}
            to={tool.path}
            className="group block rounded-xl border border-gray-800 bg-wealth-card/40 p-5 hover:border-wealth-gold/40 hover:bg-wealth-card/60 transition-all"
          >
            <h2 className="text-lg font-semibold text-white group-hover:text-wealth-gold transition-colors mb-2">
              {tool.title}
            </h2>
            <p className="text-sm text-wealth-muted leading-relaxed line-clamp-3">
              {tool.description}
            </p>
            <span className="inline-block mt-4 text-sm font-medium text-wealth-gold">
              도구 열기 →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
