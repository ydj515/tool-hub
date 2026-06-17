import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { normalizeDomPreviewCandidates } = require("./dom-preview-runner");

describe("normalizeDomPreviewCandidates", () => {
  it("selector가 있는 후보만 사용자에게 보여줄 형태로 정리한다", () => {
    const candidates = normalizeDomPreviewCandidates(
      [
        {
          selector: "#main-title",
          tagName: "H1",
          text: "  공공데이터 포털 메인 타이틀  ",
          id: "main-title",
          className: "hero title",
          role: "",
          ariaLabel: "",
        },
        {
          selector: "",
          tagName: "DIV",
          text: "selector 없음",
        },
        {
          selector: "button.primary",
          tagName: "BUTTON",
          text: "검색",
          id: "",
          className: "primary",
          role: "button",
          ariaLabel: "통합 검색",
        },
      ],
      10
    );

    expect(candidates).toEqual([
      {
        index: 1,
        selector: "#main-title",
        tagName: "h1",
        label: "h1#main-title.hero.title",
        text: "공공데이터 포털 메인 타이틀",
        role: "",
        ariaLabel: "",
      },
      {
        index: 2,
        selector: "button.primary",
        tagName: "button",
        label: "button.primary",
        text: "검색",
        role: "button",
        ariaLabel: "통합 검색",
      },
    ]);
  });

  it("후보 수를 limit으로 제한하고 긴 텍스트를 줄인다", () => {
    const candidates = normalizeDomPreviewCandidates(
      [
        { selector: "p:nth-of-type(1)", tagName: "p", text: "a".repeat(140) },
        { selector: "p:nth-of-type(2)", tagName: "p", text: "두 번째" },
      ],
      1
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0].text).toHaveLength(121);
    expect(candidates[0].text.endsWith("...")).toBe(true);
  });
});
