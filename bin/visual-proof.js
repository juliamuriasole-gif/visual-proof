#!/usr/bin/env node
import { run, USAGE, UsageError } from '../src/cli.js';

run(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    console.error(`visual-proof: ${err.message}`);
    if (err instanceof UsageError || err.code?.startsWith?.('ERR_PARSE_ARGS')) console.error(`\n${USAGE}`);
    process.exit(2);
  }
);
