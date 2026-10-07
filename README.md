# visual-proof

**Visual proof of a change.** Point it at a web app and a list of routes, screenshot every route
*before* and *after* your change, pixel-diff them, and get one HTML report with
before / after / diff columns, sorted by % changed. Routes that change more than a threshold and
are not on your "expected" list fail the run with a non-zero exit code.

Built for humans reviewing PRs and for coding agents that should *show* a change didn't break the
pages they didn't touch.

## Install

Requires Node.js 20+.

```bash
npm install
npx playwright install chromium   # one-time browser download (or: npm run install-browsers)
```

Use it via `npx visual-proof ...` inside this repo, or `npm link` to get a global `visual-proof`.

## Quickstart (demo, no external server)

```bash
npm run demo
```

This serves `sample-app/` with the built-in static server, captures **before**, serves
`sample-app-changed/` (where only `/pricing` was altered), captures **after**, and compares.
It prints a summary and exits **1**, because `/pricing` changed and was not expected:

```
STATUS      CHANGED  ROUTE
----------  -------  --------
REGRESSION  1.456%   /pricing
OK          0.000%   /
OK          0.000%   /about

Report: report/index.html
FAIL: 1 unexpected change(s): /pricing
```

Open `report/index.html` to see the before/after/diff images.

`npm run demo:expected` runs the same flow with `examples/routes.expected-change.json`, which lists
`/pricing` under `expectedChanges`, so it's badged **expected** and the run exits **0**.

## Usage

```bash
# 1. on the baseline (e.g. main), with your app running
visual-proof capture before --config routes.json

# 2. apply your change, restart the app if needed
visual-proof capture after --config routes.json

# 3. diff + report
visual-proof compare --config routes.json
```

| Command | What it does |
| --- | --- |
| `capture <before\|after> [--config routes.json] [--base-url URL] [--out shots]` | Full-page Chromium screenshots of every route to `shots/<phase>/<slug>.png`. `--base-url` overrides the config. |
| `compare [--config routes.json] [--out shots] [--report report]` | Pixel diff (pixelmatch) of before vs after, writes `shots/diff/<slug>.png` and `report/index.html`, prints a summary table, sets the exit code. |
| `serve <dir> [--port 4173]` | Tiny dependency-free static server (`/about` resolves to `about.html`). Handy for static builds. |

Slugs: `/` becomes `index`, `/blog/post-1` becomes `blog-post-1`, `/search?q=x` becomes `search-q-x`.

If before and after screenshots differ in size (e.g. the page got taller), both are padded to the
larger size and the padded area counts as changed.

## Config (`routes.json`)

```json
{
  "baseUrl": "http://127.0.0.1:4173",
  "viewport": { "width": 1280, "height": 800 },
  "routes": ["/", "/about", "/pricing"],
  "thresholdPct": 0.5,
  "expectedChanges": ["/pricing"]
}
```

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `baseUrl` | string | required | Where the app is running. Routes are resolved against it. |
| `viewport` | `{width, height}` | `1280x800` | Browser viewport. Screenshots are full-page. |
| `routes` | string[] | required | Paths to capture. Must map to unique slugs. |
| `thresholdPct` | number | `0.5` | A route is flagged when more than this % of its pixels changed. |
| `expectedChanges` | string[] | `[]` | Routes (or slugs) allowed to change: badged **expected**, never fail the run. |

## Report statuses and exit codes

| Status | Meaning |
| --- | --- |
| `ok` | Changed ≤ `thresholdPct` |
| `expected` | Changed > threshold, but listed in `expectedChanges` |
| `regression` | Changed > threshold and **not** expected (fails) |
| `missing` | A before or after screenshot is missing (fails unless expected) |

| Exit code | Meaning |
| --- | --- |
| `0` | No unexpected changes |
| `1` | At least one `regression` or `missing` route |
| `2` | Usage or runtime error (bad config, unknown command, browser failure, ...) |

## Use as a CI / agent check

The exit code makes it a drop-in gate. Example GitHub Actions job (static site build):

```yaml
- run: npm ci && npx playwright install --with-deps chromium
- run: git checkout origin/main -- site && npx visual-proof serve site --port 4173 &
- run: npx visual-proof capture before
- run: git checkout HEAD -- site
- run: npx visual-proof capture after
- run: npx visual-proof compare        # fails the job on unexpected visual changes
- uses: actions/upload-artifact@v4
  if: always()
  with: { name: visual-proof, path: "report/\nshots/" }
```

For a coding agent: capture `before` before editing, `after` when done, list the routes it meant
to change in `expectedChanges`, run `compare`, and attach `report/index.html` (plus `shots/`) as
evidence. Exit code 1 means it touched something it shouldn't have.

## Development

```bash
npm test        # node:test unit tests (slug, diff %, padding, classification, config)
npm run demo    # end-to-end demo, exits 1 with exactly one regression
```

Layout: `src/slug.js`, `src/config.js`, `src/diff.js`, `src/capture.js`, `src/compare.js`,
`src/report.js`, `src/serve.js`, `src/cli.js`, entry point `bin/visual-proof.js`.

## Why

Inspired by posts on X arguing that coding agents should come back with *visual evidence* that a
change didn't break other pages, not just green unit tests.
