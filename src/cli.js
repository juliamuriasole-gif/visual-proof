import { parseArgs } from 'node:util';
import { loadConfig } from './config.js';
import { capture, PHASES } from './capture.js';
import { compare, summaryTable } from './compare.js';
import { writeReport } from './report.js';
import { serve } from './serve.js';

export const USAGE = `visual-proof: screenshot routes before/after a change, pixel-diff them, write an HTML report.

Usage:
  visual-proof capture <before|after> [--config routes.json] [--base-url URL] [--out shots]
  visual-proof compare [--config routes.json] [--out shots] [--report report]
  visual-proof serve <dir> [--port 4173]

Exit codes:
  0  success / no unexpected changes
  1  compare found unexpected regressions (or missing screenshots)
  2  usage or runtime error`;

const OPTIONS = {
  config: { type: 'string', short: 'c', default: 'routes.json' },
  'base-url': { type: 'string' },
  out: { type: 'string', default: 'shots' },
  report: { type: 'string', default: 'report' },
  port: { type: 'string', short: 'p', default: '4173' },
  help: { type: 'boolean', short: 'h' },
};

/** Runs the CLI; resolves to an exit code (serve resolves only when stopped). */
export async function run(argv, { log = console.log } = {}) {
  const { values: opts, positionals } = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true });
  const [cmd, arg] = positionals;
  if (opts.help || !cmd) {
    log(USAGE);
    return opts.help ? 0 : 2;
  }

  if (cmd === 'capture') {
    if (!PHASES.includes(arg)) throw new UsageError(`capture needs a phase: ${PHASES.join('|')}`);
    const cfg = await loadConfig(opts.config, { baseUrl: opts['base-url'] });
    log(`Capturing ${cfg.routes.length} route(s) from ${cfg.baseUrl} [${arg}]`);
    await capture(cfg, arg, { outDir: opts.out, log });
    return 0;
  }

  if (cmd === 'compare') {
    const cfg = await loadConfig(opts.config);
    const summary = await compare(cfg, { outDir: opts.out });
    const file = await writeReport(summary, { reportDir: opts.report });
    log(summaryTable(summary));
    log(`\nReport: ${file}`);
    if (summary.failed.length) {
      log(`FAIL: ${summary.failed.length} unexpected change(s): ${summary.failed.map((r) => r.route).join(', ')}`);
      return 1;
    }
    log('PASS: no unexpected changes');
    return 0;
  }

  if (cmd === 'serve') {
    if (!arg) throw new UsageError('serve needs a directory');
    const port = Number(opts.port);
    if (!Number.isInteger(port) || port < 0) throw new UsageError(`invalid --port ${opts.port}`);
    const { url } = await serve(arg, { port });
    log(`Serving ${arg} at ${url} (Ctrl+C to stop)`);
    return new Promise(() => {});
  }

  throw new UsageError(`unknown command "${cmd}"`);
}

export class UsageError extends Error {}
