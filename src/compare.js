import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { slugify } from './slug.js';
import { isExpected } from './config.js';
import { diffImages } from './diff.js';

const exists = (p) => access(p).then(() => true, () => false);
const readPng = async (p) => PNG.sync.read(await readFile(p));

/**
 * Classify one route result.
 * ok: under threshold; expected: over threshold but allowed; regression: over threshold and not allowed;
 * missing: a before/after screenshot is absent (treated as a failure).
 */
export function classify({ diffPct, missing }, thresholdPct, expected) {
  if (missing) return expected ? 'expected' : 'missing';
  if (diffPct <= thresholdPct) return 'ok';
  return expected ? 'expected' : 'regression';
}

export const FAILING = new Set(['regression', 'missing']);

export async function compare(cfg, { outDir = 'shots' } = {}) {
  const diffDir = join(outDir, 'diff');
  await mkdir(diffDir, { recursive: true });
  const results = [];

  for (const route of cfg.routes) {
    const slug = slugify(route);
    const before = join(outDir, 'before', `${slug}.png`);
    const after = join(outDir, 'after', `${slug}.png`);
    const expected = isExpected(cfg, route);
    const r = { route, slug, before, after, diff: null, diffPct: null, mismatched: null, sizeChanged: false, expected };

    const [hasBefore, hasAfter] = await Promise.all([exists(before), exists(after)]);
    if (!hasBefore || !hasAfter) {
      r.missing = [!hasBefore && 'before', !hasAfter && 'after'].filter(Boolean);
      r.diffPct = 100;
    } else {
      const res = diffImages(await readPng(before), await readPng(after));
      r.diff = join(diffDir, `${slug}.png`);
      await writeFile(r.diff, PNG.sync.write(res.diff));
      Object.assign(r, { diffPct: res.diffPct, mismatched: res.mismatched, sizeChanged: res.sizeChanged, width: res.width, height: res.height });
    }
    r.status = classify(r, cfg.thresholdPct, expected);
    results.push(r);
  }

  results.sort((a, b) => b.diffPct - a.diffPct || a.route.localeCompare(b.route));
  const failed = results.filter((r) => FAILING.has(r.status));
  return { results, failed, thresholdPct: cfg.thresholdPct };
}

export function summaryTable({ results, thresholdPct }) {
  const rows = results.map((r) => [
    r.status.toUpperCase(),
    `${r.diffPct.toFixed(3)}%`,
    r.route + (r.sizeChanged ? '  (size changed)' : '') + (r.missing ? `  (missing: ${r.missing.join(', ')})` : ''),
  ]);
  const head = ['STATUS', 'CHANGED', 'ROUTE'];
  const w = head.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  const fmt = (row) => row.map((c, i) => (i === 2 ? c : c.padEnd(w[i]))).join('  ');
  return [`threshold: ${thresholdPct}%`, fmt(head), fmt(w.map((n) => '-'.repeat(n))), ...rows.map(fmt)].join('\n');
}
