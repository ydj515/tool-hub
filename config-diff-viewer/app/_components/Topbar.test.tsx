import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Topbar from "./Topbar";

function renderTopbar({
  isComparing = false,
  hasParseError = false,
  theme = "light",
  mounted = true,
}: {
  isComparing?: boolean;
  hasParseError?: boolean;
  theme?: "light" | "dark";
  mounted?: boolean;
} = {}) {
  return renderToStaticMarkup(
    <Topbar
      isComparing={isComparing}
      hasParseError={hasParseError}
      onReset={() => {}}
      onCompare={() => {}}
      theme={theme}
      mounted={mounted}
      onToggleTheme={() => {}}
    />,
  );
}

describe("Config Diff Viewer Topbar", () => {
  it("생성 셸과 표준 제품 정보 및 한국어 액션을 렌더한다", () => {
    const html = renderTopbar();

    expect(html).toContain('data-ds-tool-header="true"');
    expect(html).toContain('data-ds-brand-mark="true"');
    expect(html).toContain("<h1>Config Diff Viewer</h1>");
    expect(html).toContain("설정 파일의 차이를 비교합니다.");
    expect(html).toContain('class="config-header-actions"');
    expect((html.match(/data-ds-button="true"/g) ?? [])).toHaveLength(3);
    expect(html).toContain('data-variant="secondary"');
    expect(html).toContain('data-variant="primary"');
    expect(html).toContain(">초기화</button>");
    expect(html).toContain(">비교</button>");
    expect(html).toContain("다크 테마로 전환");
    expect(html.indexOf(">초기화</button>")).toBeLessThan(html.indexOf(">비교</button>"));
    expect(html.indexOf(">비교</button>")).toBeLessThan(html.indexOf("data-ds-theme-toggle"));
    expect(html).not.toContain('class="topbar"');
    expect(html).not.toContain('class="primaryBtn"');
  });

  it("액션 아이콘과 마운트 전 테마 자리표시자의 크기 계약을 유지한다", () => {
    const html = renderTopbar({ mounted: false, theme: "dark" });

    expect((html.match(/width="16"/g) ?? [])).toHaveLength(3);
    expect((html.match(/height="16"/g) ?? [])).toHaveLength(3);
    expect((html.match(/stroke-width="2"/g) ?? [])).toHaveLength(3);
    expect(html).toContain('class="ds-theme-placeholder"');
    expect(html).toContain("라이트 테마로 전환");
  });

  it("파싱 오류와 비교 진행 상태에 맞춰 비교 버튼을 비활성화한다", () => {
    const parseErrorHtml = renderTopbar({ hasParseError: true });
    const comparingHtml = renderTopbar({ isComparing: true });

    expect(parseErrorHtml).toMatch(
      /<button[^>]*data-variant="primary"[^>]*disabled=""[^>]*title="파싱 오류를 먼저 수정하세요\."/,
    );
    expect(comparingHtml).toMatch(/<button[^>]*data-variant="primary"[^>]*disabled=""/);
    expect(comparingHtml).not.toContain("파싱 오류를 먼저 수정하세요.");
    expect(comparingHtml).toContain('class="lucide lucide-loader-circle spinning"');
  });
});
