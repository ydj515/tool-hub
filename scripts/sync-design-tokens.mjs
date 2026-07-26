#!/usr/bin/env node
import { fileURLToPath } from 'node:url';

import { runCli } from './sync-design-system.mjs';

export * from './sync-design-system.mjs';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
