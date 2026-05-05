#!/usr/bin/env node
/**
 * 웹페이지 캡처 CLI 실행을 시작하는 엔트리포인트다.
 */
const { runCli } = require("../src/run-capture");

runCli(process.argv.slice(2)).catch((e) => {
  console.error(e && e.message ? e.message : e);
  process.exit(1);
});
