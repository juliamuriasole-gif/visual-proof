import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { slugify } from './slug.js';
import { routeUrl } from './config.js';

export const PHASES = ['before', 'after'];

export async function capture(cfg, phase, { outDir = 'shots', log = console.log } = {}) {
  if (!PHASES.includes(phase)) throw new Error(`Phase must be one of ${PHASES.join('|')}, got "${phase}"`);
  const dir = join(outDir, phase);
  await mkdir(dir, { recursive: true });

  const browser = await chromium.launch();
  const results = [];
  try {
    const context = await browser.newContext({ viewport: cfg.viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    for (const route of cfg.routes) {
      const url = routeUrl(cfg.baseUrl, route);
      const file = join(dir, `${slugify(route)}.png`);
      const res = await page.goto(url, { waitUntil: 'networkidle' });
      if (res && !res.ok()) log(`  ! ${route} returned HTTP ${res.status()}`);
      await page.screenshot({ path: file, fullPage: true, animations: 'disabled', caret: 'hide' });
      log(`  ${phase}  ${route}  ->  ${file}`);
      results.push({ route, file, status: res?.status() ?? null });
    }
  } finally {
    await browser.close();
  }
  return results;
}
