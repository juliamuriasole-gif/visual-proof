import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

// Opaque magenta: area that exists in only one image always counts as changed.
const PAD = [255, 0, 255, 255];

/** Return a copy of `png` padded (bottom/right) to width x height. */
export function padTo(png, width, height) {
  if (png.width === width && png.height === height) return png;
  const out = new PNG({ width, height });
  for (let i = 0; i < out.data.length; i += 4) out.data.set(PAD, i);
  for (let y = 0; y < png.height; y++) {
    const src = y * png.width * 4;
    png.data.copy(out.data, y * width * 4, src, src + png.width * 4);
  }
  return out;
}

export function diffPercent(mismatched, total) {
  if (!total) return 0;
  return Math.round((mismatched / total) * 100 * 1000) / 1000; // 3 decimals
}

/**
 * Compare two PNG objects. Pads size mismatches.
 * Returns { width, height, mismatched, diffPct, sizeChanged, diff: PNG }.
 */
export function diffImages(a, b, { pixelThreshold = 0.1 } = {}) {
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  const pa = padTo(a, width, height);
  const pb = padTo(b, width, height);
  const diff = new PNG({ width, height });
  const mismatched = pixelmatch(pa.data, pb.data, diff.data, width, height, {
    threshold: pixelThreshold,
  });
  return {
    width,
    height,
    mismatched,
    diffPct: diffPercent(mismatched, width * height),
    sizeChanged: a.width !== b.width || a.height !== b.height,
    diff,
  };
}
