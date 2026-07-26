import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Header from "./Header";

describe("Sign Maker Header", () => {
  it("공통 카드 셸과 한국어 모드명을 쓴다", () => {
    const html = renderToStaticMarkup(
      <Header
        theme="light"
        onToggleTheme={() => {}}
        activeTab="draw"
        onTabChange={() => {}}
      />,
    );

    expect(html).toContain('data-ds-tool-header="true"');
    expect(html).toContain("Sign Maker");
    expect(html).toContain("그리기");
    expect(html).toContain("업로드");
    expect(html).not.toContain("Signature &amp; Trace Studio");
    expect(html.indexOf("data-ds-segmented")).toBeLessThan(
      html.indexOf("data-ds-theme-toggle"),
    );
  });
});
