#!/usr/bin/env node
const { runCli } = require("../src/run-capture");

runCli(process.argv.slice(2)).catch((e) => {
  console.error(e && e.message ? e.message : e);
  process.exit(1);
});
