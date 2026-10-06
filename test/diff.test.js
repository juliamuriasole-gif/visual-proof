import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { diffImages, diffPercent, padTo } from '../src/diff.js';
import { classify } from '../src/compare.js';
import { normalizeConfig, isExpected } from '../src/config.js';

function solid(width, height, [r, g, b] = [255, 255, 255]) {
  const png = new PNG({ width, height });
  for (let i = 0; i < png.data.length; i += 4) png.data.set([r, g, b, 255], i);
  return png;
}

function paint(png, x0, y0, w, h, [r, g, b]) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) png.data.set([r, g, b, 255], (y * png.width + x) * 4);
  return png;
}

test('diffPercent rounds to 3 decimals and handles zero', () => {
  assert.equal(diffPercent(0, 100), 0);
  assert.equal(diffPercent(25, 100), 25);
  assert.equal(diffPercent(1, 3), 33.333);
  assert.equal(diffPercent(5, 0), 0);
});

test('identical images are 0% changed', () => {
  const r = diffImages(solid(10, 10), solid(10, 10));
  assert.equal(r.mismatched, 0);
  assert.equal(r.diffPct, 0);
  assert.equal(r.sizeChanged, false);
});

test('changed block yields exact percentage', () => {
  const a = solid(10, 10);
  const b = paint(solid(10, 10), 0, 0, 5, 2, [0, 0, 0]); // 10 of 100 px
  const r = diffImages(a, b);
  assert.equal(r.mismatched, 10);
  assert.equal(r.diffPct, 10);
});

test('size mismatch is padded and the extra area counts as changed', () => {
  const r = diffImages(solid(10, 10), solid(10, 20));
  assert.equal(r.width, 10);
  assert.equal(r.height, 20);
  assert.equal(r.sizeChanged, true);
  assert.equal(r.diffPct, 50);
});

test('padTo keeps original pixels in place', () => {
  const p = padTo(paint(solid(2, 2), 1, 1, 1, 1, [1, 2, 3]), 3, 3);
  assert.equal(p.width, 3);
  assert.deepEqual([...p.data.subarray((1 * 3 + 1) * 4, (1 * 3 + 1) * 4 + 4)], [1, 2, 3, 255]);
});

test('classify: ok / expected / regression / missing', () => {
  assert.equal(classify({ diffPct: 0.2 }, 0.5, false), 'ok');
  assert.equal(classify({ diffPct: 0.5 }, 0.5, false), 'ok');
  assert.equal(classify({ diffPct: 3 }, 0.5, false), 'regression');
  assert.equal(classify({ diffPct: 3 }, 0.5, true), 'expected');
  assert.equal(classify({ diffPct: 100, missing: ['after'] }, 0.5, false), 'missing');
});

test('config defaults, validation and expectedChanges matching', () => {
  const cfg = normalizeConfig({ baseUrl: 'http://x', routes: ['/', '/pricing'], expectedChanges: ['pricing'] });
  assert.equal(cfg.thresholdPct, 0.5);
  assert.deepEqual(cfg.viewport, { width: 1280, height: 800 });
  assert.equal(isExpected(cfg, '/pricing'), true);
  assert.equal(isExpected(cfg, '/'), false);
  assert.throws(() => normalizeConfig({ routes: ['/'] }), /baseUrl/);
  assert.throws(() => normalizeConfig({ baseUrl: 'http://x', routes: ['/a b', '/a-b'] }), /same slug/);
});
