import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Topbar from "./Topbar";

describe("DDL Seed Generator Topbar", () => {
  it("공통 셸과 한국어 액션을 렌더한다", () => {
    const html = renderToStaticMarkup(
      <Topbar
        canGenerate={false}
        onGenerate={() => {}}
        onLoadPreset={() => {}}
        theme="light"
        mounted
        onToggleTheme={() => {}}
      />,
    );

    expect(html).toContain('data-ds-tool-header="true"');
    expect(html).toContain("DDL을 분석해 시드 데이터를 생성합니다.");
    expect(html).toContain('aria-label="샘플 DDL 불러오기"');
    expect(html).toContain(">샘플<");
    expect(html).toContain("기본 — PostgreSQL");
    expect(html).toContain(">생성</button>");
    expect(html).toContain('data-ds-button="true"');
    expect(html).toContain('data-variant="primary"');
    expect(html).toContain('disabled=""');
    expect(html).not.toContain("realistic");
    expect(html).not.toContain(">Generate<");
  });

  it("마운트 전 테마 placeholder를 유지하고 ThemeToggle을 마지막에 둔다", () => {
    const html = renderToStaticMarkup(
      <Topbar
        canGenerate
        onGenerate={() => {}}
        onLoadPreset={() => {}}
        theme="dark"
        mounted={false}
        onToggleTheme={() => {}}
      />,
    );

    expect(html).toContain('class="ds-theme-placeholder"');
    expect(html).toContain("라이트 테마로 전환");
    expect(html.indexOf("샘플 DDL 불러오기")).toBeLessThan(
      html.indexOf("data-ds-theme-toggle"),
    );
    expect(html.indexOf(">생성</button>")).toBeLessThan(
      html.indexOf("data-ds-theme-toggle"),
    );
  });
});
