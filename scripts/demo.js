#!/usr/bin/env node
// End-to-end demo: serve sample-app -> capture before -> serve sample-app-changed -> capture after -> compare.
// Exits with the compare exit code (1 with the default routes.json, since /pricing changed unexpectedly).
import { rm } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { run } from '../src/cli.js';
import { serve } from '../src/serve.js';

const { values } = parseArgs({ options: { config: { type: 'string', default: 'routes.json' } } });
const config = values.config;

async function captureFrom(dir, phase) {
  const srv = await serve(dir, { port: 0 }); // random free port
  console.log(`\n== serving ${dir} at ${srv.url}`);
  try {
    await run(['capture', phase, '--config', config, '--base-url', srv.url]);
  } finally {
    await srv.close();
  }
}

await rm('shots', { recursive: true, force: true });
await rm('report', { recursive: true, force: true });
await captureFrom('sample-app', 'before');
await captureFrom('sample-app-changed', 'after');
console.log('\n== compare');
const code = await run(['compare', '--config', config]);
console.log(`\nexit code: ${code}`);
process.exit(code);
