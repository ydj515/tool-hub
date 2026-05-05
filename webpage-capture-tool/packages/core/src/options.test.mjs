import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { DEFAULTS, parseCliOptions } = require("./options");

describe("parseCliOptions", () => {
  it("parses files, booleans, and URL filters", () => {
    const result = parseCliOptions([
      "--file",
      "a.xlsx,b.csv",
      "--headless",
      "false",
      "--onlyUrls",
      "https://a.test, https://b.test",
      "--out",
      "captures",
    ]);

    expect(result.filePaths).toEqual(["a.xlsx", "b.csv"]);
    expect(result.headless).toBe(false);
    expect(result.onlyUrls).toEqual(["https://a.test", "https://b.test"]);
    expect(result.outDir).toBe(path.resolve("captures"));
  });

  it("falls back to the default encoding with a warning for unsupported input", () => {
    const result = parseCliOptions([
      "--file",
      "sample.csv",
      "--csvEncoding",
      "utf16",
    ]);

    expect(result.csvEncoding).toBeUndefined();
    expect(result.csvEncodingWarning).toContain("utf16");
    expect(result.waitMs).toBe(DEFAULTS.waitMs);
  });
});
