/**
 * 웹페이지 캡처 코어 패키지의 주요 유틸리티를 재노출한다.
 */
const { parseCliOptions, DEFAULTS } = require("./src/options");
const { loadRowsFromFiles, dedupeByUrl } = require("./src/data-loader");
const { takeScreenshots } = require("./src/screenshot-runner");

module.exports = {
  parseCliOptions,
  DEFAULTS,
  loadRowsFromFiles,
  dedupeByUrl,
  takeScreenshots
};
