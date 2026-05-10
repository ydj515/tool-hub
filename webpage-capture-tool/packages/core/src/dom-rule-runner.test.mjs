import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const { applyDomRules, formatDomRuleLog } = require("./dom-rule-runner");

describe("applyDomRules", () => {
  it("disabled 규칙은 건너뛴다", async () => {
    const page = { evaluate: vi.fn() };
    const results = await applyDomRules(page, [
      { id: "r1", type: "hide", selector: ".foo", enabled: false },
    ]);
    expect(results).toHaveLength(0);
    expect(page.evaluate).not.toHaveBeenCalled();
  });

  it("enabled=true + selector 빈 문자열 → warn (selector가 비어 있습니다)", async () => {
    const page = { evaluate: vi.fn() };
    const results = await applyDomRules(page, [
      { id: "r2", type: "hide", selector: "", enabled: true },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("warn");
    expect(results[0].message).toContain("selector가 비어 있습니다");
    expect(page.evaluate).not.toHaveBeenCalled();
  });

  it("replaceText 규칙 — page.evaluate가 2를 반환하면 status 'ok', '2개 요소 처리됨'", async () => {
    const page = { evaluate: vi.fn().mockResolvedValue(2) };
    const results = await applyDomRules(page, [
      { id: "r3", type: "replaceText", selector: "h1", value: "대체텍스트", enabled: true },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("ok");
    expect(results[0].message).toBe("2개 요소 처리됨");
  });

  it("hide 규칙 — page.evaluate가 1을 반환하면 status 'ok'", async () => {
    const page = { evaluate: vi.fn().mockResolvedValue(1) };
    const results = await applyDomRules(page, [
      { id: "r4", type: "hide", selector: ".ad", enabled: true },
    ]);
    expect(results[0].status).toBe("ok");
  });

  it("page.evaluate가 0을 반환하면 status 'warn' (요소를 찾지 못했음)", async () => {
    const page = { evaluate: vi.fn().mockResolvedValue(0) };
    const results = await applyDomRules(page, [
      { id: "r5", type: "hide", selector: ".missing", enabled: true },
    ]);
    expect(results[0].status).toBe("warn");
    expect(results[0].message).toContain(".missing");
  });

  it("page.evaluate가 throw하면 status 'warn' (실패 메시지 포함)", async () => {
    const page = { evaluate: vi.fn().mockRejectedValue(new Error("페이지 오류")) };
    const results = await applyDomRules(page, [
      { id: "r6", type: "replaceText", selector: "p", value: "x", enabled: true },
    ]);
    expect(results[0].status).toBe("warn");
    expect(results[0].message).toContain("규칙 적용 실패");
    expect(results[0].message).toContain("페이지 오류");
  });

  it("여러 규칙 혼합 (ok 1개 + disabled 1개 + warn 1개) → results 길이 2", async () => {
    const page = {
      evaluate: vi.fn()
        .mockResolvedValueOnce(1)   // r7 → ok
        .mockResolvedValueOnce(0),  // r9 → warn
    };
    const rules = [
      { id: "r7", type: "hide", selector: ".nav", enabled: true },
      { id: "r8", type: "hide", selector: ".footer", enabled: false },
      { id: "r9", type: "replaceText", selector: ".ghost", value: "", enabled: true },
    ];
    const results = await applyDomRules(page, rules);
    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("ok");
    expect(results[1].status).toBe("warn");
  });
});

describe("formatDomRuleLog", () => {
  it("ok status → type 'dom-rule-ok'", () => {
    const log = formatDomRuleLog(
      [{ ruleId: "r1", selector: "h1", status: "ok", message: "1개 요소 처리됨" }],
      "https://example.com"
    );
    expect(log[0].type).toBe("dom-rule-ok");
  });

  it("warn status → type 'dom-rule-warn'", () => {
    const log = formatDomRuleLog(
      [{ ruleId: "r2", selector: ".x", status: "warn", message: "찾지 못했습니다" }],
      "https://example.com"
    );
    expect(log[0].type).toBe("dom-rule-warn");
  });

  it("url 필드가 모든 항목에 포함된다", () => {
    const url = "https://test.example.com/page";
    const log = formatDomRuleLog(
      [
        { ruleId: "r1", selector: "h1", status: "ok", message: "" },
        { ruleId: "r2", selector: ".x", status: "warn", message: "" },
      ],
      url
    );
    expect(log[0].url).toBe(url);
    expect(log[1].url).toBe(url);
  });
});
