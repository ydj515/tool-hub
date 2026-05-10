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

describe("--url 옵션 분기", () => {
  it("--url 단독 사용 시 singleUrl이 설정되고 filePaths는 비어있다", () => {
    const result = parseCliOptions(["--url", "https://example.com"]);
    expect(result.singleUrl).toBe("https://example.com");
    expect(result.filePaths).toEqual([]);
  });

  it("--files + --url 함께 사용 시 singleUrl은 null이고 columns.urlKey는 url 값이 된다", () => {
    const result = parseCliOptions([
      "--file",
      "list.xlsx",
      "--url",
      "detailPage",
    ]);
    expect(result.singleUrl).toBeFalsy();
    expect(result.columns.urlKey).toBe("detailPage");
  });

  it("--colUrl 단독 사용 시 columns.urlKey가 설정된다", () => {
    const result = parseCliOptions(["--file", "list.xlsx", "--colUrl", "pageUrl"]);
    expect(result.columns.urlKey).toBe("pageUrl");
  });
});

describe("뷰포트 프리셋", () => {
  it("--viewportPreset word → 뷰포트 1440×1024", () => {
    const result = parseCliOptions(["--file", "a.xlsx", "--viewportPreset", "word"]);
    expect(result.viewport.width).toBe(1440);
    expect(result.viewport.height).toBe(1024);
  });

  it("--viewportPreset ppt → 뷰포트 1920×1080", () => {
    const result = parseCliOptions(["--file", "a.xlsx", "--viewportPreset", "ppt"]);
    expect(result.viewport.width).toBe(1920);
    expect(result.viewport.height).toBe(1080);
  });

  it("--viewportPreset markdown → 뷰포트 1280×800", () => {
    const result = parseCliOptions(["--file", "a.xlsx", "--viewportPreset", "markdown"]);
    expect(result.viewport.width).toBe(1280);
    expect(result.viewport.height).toBe(800);
  });

  it("--viewportWidth 1600 --viewportHeight 900 (명시적 커스텀) → 뷰포트 1600×900", () => {
    const result = parseCliOptions([
      "--file",
      "a.xlsx",
      "--viewportWidth",
      "1600",
      "--viewportHeight",
      "900",
    ]);
    expect(result.viewport.width).toBe(1600);
    expect(result.viewport.height).toBe(900);
  });
});

describe("캡처 범위", () => {
  it("--captureScope viewport → captureScope가 'viewport'", () => {
    const result = parseCliOptions(["--file", "a.xlsx", "--captureScope", "viewport"]);
    expect(result.captureScope).toBe("viewport");
  });

  it("--captureScope selector --captureSelector .main-content → 두 값이 모두 설정된다", () => {
    const result = parseCliOptions([
      "--file",
      "a.xlsx",
      "--captureScope",
      "selector",
      "--captureSelector",
      ".main-content",
    ]);
    expect(result.captureScope).toBe("selector");
    expect(result.captureSelector).toBe(".main-content");
  });

  it("플래그 없을 시 기본값 captureScope는 'fullPage'", () => {
    const result = parseCliOptions(["--file", "a.xlsx"]);
    expect(result.captureScope).toBe("fullPage");
  });
});
