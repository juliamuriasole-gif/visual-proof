import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { slugify } from './slug.js';

export const DEFAULTS = {
  viewport: { width: 1280, height: 800 },
  thresholdPct: 0.5,
  expectedChanges: [],
};

export function normalizeConfig(raw, overrides = {}) {
  if (!raw || typeof raw !== 'object') throw new Error('Config must be a JSON object');
  const cfg = {
    ...DEFAULTS,
    ...raw,
    viewport: { ...DEFAULTS.viewport, ...(raw.viewport || {}) },
  };
  if (overrides.baseUrl) cfg.baseUrl = overrides.baseUrl;

  if (!cfg.baseUrl || typeof cfg.baseUrl !== 'string') throw new Error('Config: "baseUrl" is required');
  if (!Array.isArray(cfg.routes) || cfg.routes.length === 0) throw new Error('Config: "routes" must be a non-empty array');
  if (typeof cfg.thresholdPct !== 'number' || cfg.thresholdPct < 0) throw new Error('Config: "thresholdPct" must be a number >= 0');
  if (!Array.isArray(cfg.expectedChanges)) throw new Error('Config: "expectedChanges" must be an array');

  const slugs = new Map();
  for (const route of cfg.routes) {
    if (typeof route !== 'string') throw new Error(`Config: route must be a string, got ${JSON.stringify(route)}`);
    const s = slugify(route);
    if (slugs.has(s)) throw new Error(`Config: routes "${slugs.get(s)}" and "${route}" map to the same slug "${s}"`);
    slugs.set(s, route);
  }
  return cfg;
}

export async function loadConfig(path = 'routes.json', overrides = {}) {
  const file = resolve(path);
  let raw;
  try {
    raw = JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    throw new Error(`Could not read config ${file}: ${err.message}`);
  }
  return normalizeConfig(raw, overrides);
}

/** A route is "expected" if it (or its slug) appears in expectedChanges. */
export function isExpected(cfg, route) {
  const slug = slugify(route);
  return cfg.expectedChanges.some((e) => e === route || slugify(e) === slug);
}

export function routeUrl(baseUrl, route) {
  return new URL(route, baseUrl.endsWith('/') ? baseUrl : baseUrl + '/').href;
}
