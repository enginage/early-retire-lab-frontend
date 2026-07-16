/**
 * 빌드 시 public/robots.txt, public/sitemap.xml 생성
 * VITE_SITE_URL > VERCEL_URL > package.json homepage 순으로 도메인 결정
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SITEMAP_PAGE_KEYS, ROBOTS_DISALLOW_PATHS } from '../src/config/seoStatic.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');

/** PAGE_SEO path와 동기화 (seoStatic SITEMAP_PAGE_KEYS 기준) */
const SITEMAP_PATH_BY_KEY = {
  home: '/',
  'experience-lab': '/experience-lab',
  'investment-indicators': '/investment-indicators',
  'early-retirement': '/experience-lab?menu=early-retirement',
  'domestic-high-dividend': '/experience-lab?menu=domestic-high-dividend',
  'domestic-etf-indicators': '/domestic-etf-indicators',
  'kr-market-indicators': '/kr-market-indicators',
  'usa-stock-indicators': '/usa-stock-indicators',
};

function loadDotEnv() {
  const vars = {};
  for (const filename of ['.env', '.env.local', '.env.production']) {
    try {
      const content = readFileSync(join(root, filename), 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        vars[key] = value;
      }
    } catch {
      // optional env files
    }
  }
  return vars;
}

function resolveSiteUrl() {
  const dotenv = loadDotEnv();
  const env = { ...dotenv, ...process.env };

  if (env.VITE_SITE_URL) {
    return env.VITE_SITE_URL.replace(/\/$/, '');
  }
  if (env.VERCEL_URL) {
    return `https://${env.VERCEL_URL.replace(/\/$/, '')}`;
  }

  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  if (pkg.homepage) {
    return pkg.homepage.replace(/\/$/, '');
  }

  return 'http://localhost:5173';
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildRobotsTxt(siteUrl) {
  const lines = [
    'User-agent: *',
    'Allow: /',
    ...ROBOTS_DISALLOW_PATHS.map((path) => `Disallow: ${path}`),
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ];
  return lines.join('\n');
}

function buildSitemapXml(siteUrl) {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = SITEMAP_PAGE_KEYS.map((key) => {
    const path = SITEMAP_PATH_BY_KEY[key];
    const loc = escapeXml(`${siteUrl}${path}`);
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${path === '/' ? '1.0' : '0.8'}</priority>\n  </url>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

const siteUrl = resolveSiteUrl();
writeFileSync(join(publicDir, 'robots.txt'), buildRobotsTxt(siteUrl), 'utf8');
writeFileSync(join(publicDir, 'sitemap.xml'), buildSitemapXml(siteUrl), 'utf8');

console.log(`[generate-seo-files] site: ${siteUrl}`);
console.log(`[generate-seo-files] wrote public/robots.txt, public/sitemap.xml (${SITEMAP_PAGE_KEYS.length} URLs)`);
