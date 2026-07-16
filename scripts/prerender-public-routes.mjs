/**
 * 빌드 후 공개 URL HTML 스냅샷 생성 (Puppeteer)
 * 사용: vite build 완료 후 `node scripts/prerender-public-routes.mjs`
 */
import http from 'http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import puppeteer from 'puppeteer';
import { PRERENDER_PATHS } from '../src/config/seoStatic.js';
import { PAGE_SEO } from '../src/config/publicTools.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const distDir = join(root, 'dist');
const port = Number(process.env.PRERENDER_PORT) || 4173;
const host = '127.0.0.1';

const PRERENDER_ROUTE_SEO_KEY = {
  '/': 'home',
  '/experience-lab': 'experience-lab',
  '/investment-indicators': 'investment-indicators',
  '/domestic-etf-indicators': 'domestic-etf-indicators',
  '/kr-market-indicators': 'kr-market-indicators',
  '/usa-stock-indicators': 'usa-stock-indicators',
};

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.ico': 'image/x-icon',
};

function routeToOutputPath(route) {
  if (route === '/') return join(distDir, 'index.html');
  const segment = route.replace(/^\//, '');
  return join(distDir, segment, 'index.html');
}

/** prerender 캡처용 — 정적 파일 외 경로는 항상 루트 index.html(SPA) 제공 */
function startSpaPreviewServer() {
  const spaHtml = readFileSync(join(distDir, 'index.html'), 'utf8');

  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://${host}`);
      const pathname = decodeURIComponent(url.pathname);

      const staticCandidates = [
        join(distDir, pathname),
        join(distDir, pathname.replace(/^\//, '')),
      ];

      for (const filePath of staticCandidates) {
        if (!filePath.startsWith(distDir)) continue;
        if (!existsSync(filePath) || extname(filePath) === '') continue;
        const ext = extname(filePath);
        const mime = MIME[ext] ?? 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        res.end(readFileSync(filePath));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(spaHtml);
    });

    server.listen(port, host, () => resolve(server));
  });
}

function resolveSiteUrl() {
  for (const filename of ['.env', '.env.local', '.env.production']) {
    try {
      const content = readFileSync(join(root, filename), 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        if (key !== 'VITE_SITE_URL') continue;
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (value) return value.replace(/\/$/, '');
      }
    } catch {
      // optional
    }
  }
  if (process.env.VITE_SITE_URL) return process.env.VITE_SITE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  return (pkg.homepage || '').replace(/\/$/, '');
}

function normalizePrerenderedHtml(html, siteUrl) {
  if (!siteUrl) return html;
  const previewOrigin = `http://${host}:${port}`;
  return html.split(previewOrigin).join(siteUrl);
}

async function prerenderRoute(browser, route, siteUrl) {
  const page = await browser.newPage();
  const url = `http://${host}:${port}${route}`;
  const seoKey = PRERENDER_ROUTE_SEO_KEY[route];
  const titleSnippet = PAGE_SEO[seoKey]?.title?.slice(0, 12) ?? '';

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
    await page.waitForSelector('#root > *', { timeout: 30000 });
    if (titleSnippet) {
      await page.waitForFunction(
        (snippet) => document.title.includes(snippet),
        { timeout: 30000 },
        titleSnippet
      );
    }

    let html = await page.content();
    html = normalizePrerenderedHtml(html, siteUrl);
    const outputPath = routeToOutputPath(route);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, html, 'utf8');
    console.log(`[prerender] ${route} -> ${outputPath.replace(distDir, 'dist')}`);
  } finally {
    await page.close();
  }
}

async function main() {
  try {
    readFileSync(join(distDir, 'index.html'), 'utf8');
  } catch {
    console.error('[prerender] dist/index.html not found. Run vite build first.');
    process.exit(1);
  }

  const server = await startSpaPreviewServer();
  console.log(`[prerender] SPA preview http://${host}:${port}`);

  const siteUrl = resolveSiteUrl();
  if (siteUrl) {
    console.log(`[prerender] canonical origin: ${siteUrl}`);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (const route of PRERENDER_PATHS) {
      await prerenderRoute(browser, route, siteUrl);
    }
    console.log(`[prerender] done (${PRERENDER_PATHS.length} routes)`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error('[prerender] failed:', err);
  process.exit(1);
});
