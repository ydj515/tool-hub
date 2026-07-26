import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { DdlSyntaxIssue } from "@/lib/types";
import EditorPanel from "./EditorPanel";

vi.mock("@/app/_components/monaco-ddl-editor", () => ({
  default: () => <div aria-label="DDL 편집기" />,
}));

const baseProps: ComponentProps<typeof EditorPanel> = {
  ddl: "CREATE TABLE users (id BIGINT PRIMARY KEY);",
  onChangeDdl: () => {},
  issues: [],
  hasErrors: false,
  errors: [],
  warnings: [],
  inputDialect: "postgresql",
  tableNames: ["users"],
  columnNames: ["id"],
  onEditorMount: () => {},
  theme: "light",
  onFocusIssue: () => {},
};

function renderEditorPanel(overrides: Partial<ComponentProps<typeof EditorPanel>> = {}) {
  return renderToStaticMarkup(<EditorPanel {...baseProps} {...overrides} />);
}

describe("DDL Seed Generator EditorPanel", () => {
  it("초기 정상 상태에서 한국어 제목과 검증 결과를 렌더한다", () => {
    const html = renderEditorPanel();

    expect(html).toContain("<h2>DDL 입력</h2>");
    expect(html).toContain("DDL 구문이 올바릅니다.");
    expect(html).not.toContain("DDL Input");
    expect(html).not.toContain("DDL syntax looks good");
  });

  it("오류 상태에서 문제 위치를 행과 열로 렌더한다", () => {
    const issue: DdlSyntaxIssue = {
      severity: "error",
      line: 3,
      column: 12,
      message: "닫는 괄호가 필요합니다.",
      hint: "열 정의 뒤에 괄호를 추가하세요.",
    };
    const html = renderEditorPanel({
      issues: [issue],
      hasErrors: true,
      errors: [issue],
    });

    expect(html).toContain("3행, 12열");
    expect(html).toContain("닫는 괄호가 필요합니다.");
    expect(html).not.toContain("Line 3");
    expect(html).not.toContain("Col 12");
  });
});
