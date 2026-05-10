import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  BUILTIN_PROFILES,
  VIEWPORT_PRESETS,
  resolveFilename,
  makeSafeTitle,
  resolveUniqueFilename,
} = require("./export-profile");

describe("resolveFilename", () => {
  it("{index} → 3자리 zero-padded (1 → '001')", () => {
    const result = resolveFilename("{index}", { index: 1, title: "" });
    expect(result).toBe("001");
  });

  it("{safeTitle} → 특수문자 치환됨", () => {
    const result = resolveFilename("{safeTitle}", { index: 1, title: "report/2024" });
    expect(result).toContain("_");
    expect(result).not.toContain("/");
  });

  it("{slug} → 소문자, 공백은 하이픈으로 변환됨", () => {
    const result = resolveFilename("{slug}", { index: 1, title: "Hello World" });
    expect(result).toBe("hello-world");
  });

  it("{date} → YYYYMMDD 형식과 일치한다", () => {
    const result = resolveFilename("{date}", { index: 1, title: "" });
    expect(result).toMatch(/^\d{8}$/);
  });

  it("기본 패턴 {index}_{safeTitle} 사용 시 정상 출력", () => {
    const result = resolveFilename("{index}_{safeTitle}", { index: 5, title: "요약 보고서" });
    expect(result).toBe("005_요약 보고서");
  });

  it("커스텀 패턴 {index}-{slug} 사용 시 정상 출력", () => {
    const result = resolveFilename("{index}-{slug}", { index: 3, title: "My Page" });
    expect(result).toBe("003-my-page");
  });
});

describe("makeSafeTitle", () => {
  it("OS 금지문자(/ : * ? \" < > |)를 _로 치환한다", () => {
    const result = makeSafeTitle('report/:*?"<>|end');
    expect(result).not.toMatch(/[/:*?"<>|]/);
    expect(result).toMatch(/_/);
  });

  it("한글은 그대로 유지된다", () => {
    const result = makeSafeTitle("보고서 제목");
    expect(result).toContain("보고서");
  });

  it("빈 문자열 → 'untitled'", () => {
    const result = makeSafeTitle("");
    expect(result).toBe("untitled");
  });

  it("120자 초과 시 잘린다", () => {
    const long = "a".repeat(150);
    const result = makeSafeTitle(long);
    expect(result.length).toBeLessThanOrEqual(120);
  });
});

describe("resolveUniqueFilename", () => {
  it("중복 없으면 원래 이름 그대로 반환되고 Set에 추가된다", () => {
    const used = new Set();
    const result = resolveUniqueFilename("report", used);
    expect(result).toBe("report");
    expect(used.has("report")).toBe(true);
  });

  it("이미 Set에 있으면 _1 suffix가 붙는다", () => {
    const used = new Set(["report"]);
    const result = resolveUniqueFilename("report", used);
    expect(result).toBe("report_1");
    expect(used.has("report_1")).toBe(true);
  });

  it("_1도 이미 있으면 _2 suffix가 붙는다", () => {
    const used = new Set(["report", "report_1"]);
    const result = resolveUniqueFilename("report", used);
    expect(result).toBe("report_2");
    expect(used.has("report_2")).toBe(true);
  });
});

describe("VIEWPORT_PRESETS", () => {
  it("word: width 1440, height 1024", () => {
    expect(VIEWPORT_PRESETS.word.width).toBe(1440);
    expect(VIEWPORT_PRESETS.word.height).toBe(1024);
  });

  it("ppt: width 1920, height 1080", () => {
    expect(VIEWPORT_PRESETS.ppt.width).toBe(1920);
    expect(VIEWPORT_PRESETS.ppt.height).toBe(1080);
  });

  it("markdown: width 1280, height 800", () => {
    expect(VIEWPORT_PRESETS.markdown.width).toBe(1280);
    expect(VIEWPORT_PRESETS.markdown.height).toBe(800);
  });

  it("custom: width와 height가 존재한다", () => {
    expect(VIEWPORT_PRESETS.custom).toHaveProperty("width");
    expect(VIEWPORT_PRESETS.custom).toHaveProperty("height");
  });
});

describe("BUILTIN_PROFILES", () => {
  it("markdown.imageWidth는 1280", () => {
    expect(BUILTIN_PROFILES.markdown.imageWidth).toBe(1280);
  });

  it("word.imageWidth는 1440", () => {
    expect(BUILTIN_PROFILES.word.imageWidth).toBe(1440);
  });

  it("ppt.imageWidth는 1920", () => {
    expect(BUILTIN_PROFILES.ppt.imageWidth).toBe(1920);
  });
});
