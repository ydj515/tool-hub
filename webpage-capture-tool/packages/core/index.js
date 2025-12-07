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
