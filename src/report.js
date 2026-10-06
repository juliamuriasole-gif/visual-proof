import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, relative, join } from 'node:path';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function renderReport({ results, failed, thresholdPct }, { reportDir = 'report', generatedAt = new Date() } = {}) {
  const rel = (p) => (p ? relative(reportDir, p).split('\\').join('/') : null);
  const img = (p, label) =>
    p ? `<a href="${esc(rel(p))}"><img loading="lazy" src="${esc(rel(p))}" alt="${esc(label)}"></a>` : `<div class="none">no image</div>`;
  const counts = results.reduce((acc, r) => ((acc[r.status] = (acc[r.status] || 0) + 1), acc), {});
  const verdict = failed.length ? `FAIL: ${failed.length} unexpected change(s)` : 'PASS: no unexpected changes';

  const rows = results
    .map(
      (r) => `
    <section class="route ${r.status}">
      <h2><span class="badge ${r.status}">${r.status}</span> <code>${esc(r.route)}</code>
        <span class="pct">${r.diffPct.toFixed(3)}% changed</span>${r.sizeChanged ? ' <span class="note">size changed</span>' : ''}${
          r.missing ? ` <span class="note">missing: ${esc(r.missing.join(', '))}</span>` : ''
        }</h2>
      <div class="cols">
        <figure><figcaption>Before</figcaption>${img(r.missing?.includes('before') ? null : r.before, 'before')}</figure>
        <figure><figcaption>After</figcaption>${img(r.missing?.includes('after') ? null : r.after, 'after')}</figure>
        <figure><figcaption>Diff</figcaption>${img(r.diff, 'diff')}</figure>
      </div>
    </section>`
    )
    .join('\n');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>visual-proof report</title>
<style>
  body{font:14px/1.4 system-ui,sans-serif;margin:0;padding:24px;background:#f6f7f9;color:#1d2330}
  header{margin-bottom:24px} h1{margin:0 0 4px;font-size:22px}
  .verdict{font-weight:600;font-size:16px;padding:8px 12px;border-radius:6px;display:inline-block}
  .verdict.fail{background:#fde2e1;color:#a01818}.verdict.pass{background:#dff5e3;color:#16612a}
  .meta{color:#5b6475;margin-top:8px}
  .route{background:#fff;border:1px solid #dde1e7;border-left:6px solid #9aa3b2;border-radius:8px;padding:12px 16px;margin-bottom:20px}
  .route.regression,.route.missing{border-left-color:#d93025}.route.expected{border-left-color:#e3a008}.route.ok{border-left-color:#1e8e3e}
  h2{font-size:15px;margin:0 0 12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .badge{text-transform:uppercase;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;color:#fff;background:#9aa3b2}
  .badge.ok{background:#1e8e3e}.badge.expected{background:#e3a008}.badge.regression,.badge.missing{background:#d93025}
  .pct{color:#5b6475;font-weight:400}.note{font-size:12px;color:#a05a00}
  .cols{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  figure{margin:0}figcaption{font-weight:600;margin-bottom:4px;color:#5b6475}
  img{width:100%;border:1px solid #dde1e7;background:repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 50%/16px 16px}
  .none{padding:40px;text-align:center;border:1px dashed #c4c9d2;color:#9aa3b2}
</style></head><body>
<header>
  <h1>visual-proof report</h1>
  <div class="verdict ${failed.length ? 'fail' : 'pass'}">${esc(verdict)}</div>
  <div class="meta">${results.length} route(s) &middot; threshold ${thresholdPct}% &middot; ${Object.entries(counts)
    .map(([k, v]) => `${v} ${esc(k)}`)
    .join(' &middot; ')} &middot; generated ${esc(generatedAt.toISOString())}</div>
</header>
${rows}
</body></html>
`;
}

export async function writeReport(summary, { reportDir = 'report' } = {}) {
  const file = join(reportDir, 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, renderReport(summary, { reportDir }));
  return file;
}
