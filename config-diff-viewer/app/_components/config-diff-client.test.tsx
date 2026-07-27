import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ConfigDiffClient from "./config-diff-client";

// Monaco는 import 시 window를 요구한다. 초기 셸에는 렌더되지 않으므로
// 브라우저 전용 경계만 대체하고 ConfigDiffClient 자체는 실제로 렌더한다.
vi.mock("./monaco-diff-editor", () => ({
  default: () => <div aria-label="설정 비교 편집기" />,
}));

describe("Config Diff Viewer 초기 화면", () => {
  it("공통 page shell과 생성 EmptyState를 렌더한다", () => {
    const html = renderToStaticMarkup(<ConfigDiffClient />);

    expect(html).toContain('data-ds-page-shell="true"');
    expect(html).toContain('data-ds-empty-state="true"');
    expect(html).toContain("<strong>비교 버튼을 눌러 분석을 시작하세요.</strong>");
    expect(html).toContain("A와 B에 설정 파일 내용을 붙여넣거나 업로드한 뒤 비교를 클릭하세요.");
    expect(html).not.toContain('class="emptyState"');
  });
});
