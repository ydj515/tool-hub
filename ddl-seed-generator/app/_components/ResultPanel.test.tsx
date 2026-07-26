import { createRef, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { GeneratedSql } from "@/lib/types";
import ResultPanel from "./ResultPanel";

const result: GeneratedSql = {
  insertSql: 'INSERT INTO "users" ("id") VALUES (1);',
  rollbackSql: 'DELETE FROM "users" WHERE "id" IN (1);',
  analysis: {
    tables: [],
    insertOrder: ["users"],
    cycleGroups: [],
    warnings: [],
  },
  generatedTables: [],
  summary: {
    tableCount: 1,
    rowCountPerTable: 1,
    totalRows: 1,
    insertStatements: 1,
    rollbackStatements: 1,
  },
};

function renderResultPanel(
  overrides: Partial<ComponentProps<typeof ResultPanel>> = {},
) {
  return renderToStaticMarkup(
    <ResultPanel
      result={result}
      error={null}
      dialect="postgresql"
      activeTab="insert"
      onActiveTabChange={() => {}}
      activeSql={result.insertSql}
      copied={false}
      onCopy={() => {}}
      isDownloading={false}
      downloadMenuOpen
      onToggleDownloadMenu={() => {}}
      onDownload={() => {}}
      downloadInfo={null}
      downloadMenuRef={createRef<HTMLDivElement>()}
      {...overrides}
    />,
  );
}

describe("DDL Seed Generator ResultPanel", () => {
  it("생성 EmptyState로 결과 전 상태를 안내한다", () => {
    const html = renderResultPanel({ result: null, activeSql: undefined });

    expect(html).toContain('data-ds-empty-state="true"');
    expect(html).toContain("DDL을 분석하면 테이블 순서와 SQL 미리보기가 표시됩니다.");
    expect(html).toContain('width="16"');
    expect(html).toContain('stroke-width="2"');
    expect(html).not.toContain('class="emptyState"');
  });

  it("INSERT와 ROLLBACK을 연결된 tab과 tabpanel로 렌더한다", () => {
    const insertHtml = renderResultPanel();
    const rollbackHtml = renderResultPanel({
      activeTab: "rollback",
      activeSql: result.rollbackSql,
    });

    expect(insertHtml).toContain('role="tablist"');
    expect(insertHtml).toContain('aria-label="SQL 출력 종류"');
    expect(insertHtml).toMatch(
      /<button id="insert-tab"[^>]*role="tab"[^>]*aria-selected="true"[^>]*aria-controls="sql-output-panel"/,
    );
    expect(insertHtml).toMatch(
      /<button id="rollback-tab"[^>]*role="tab"[^>]*aria-selected="false"[^>]*aria-controls="sql-output-panel"/,
    );
    expect(insertHtml).toMatch(
      /<pre id="sql-output-panel"[^>]*role="tabpanel"[^>]*aria-labelledby="insert-tab"/,
    );
    expect(insertHtml).toContain(result.insertSql.replaceAll('"', "&quot;"));

    expect(rollbackHtml).toMatch(
      /<button id="rollback-tab"[^>]*role="tab"[^>]*aria-selected="true"[^>]*aria-controls="sql-output-panel"/,
    );
    expect(rollbackHtml).toContain('aria-labelledby="rollback-tab"');
    expect(rollbackHtml).toContain(result.rollbackSql.replaceAll('"', "&quot;"));
  });

  it("기본 결과 액션은 생성 Button과 한국어 레이블을 사용한다", () => {
    const html = renderResultPanel({ isDownloading: true });

    expect((html.match(/data-ds-button="true"/g) ?? [])).toHaveLength(6);
    expect(html).toContain(">복사</button>");
    expect(html).toContain("다운로드");
    expect(html).toContain("seed.zip (전체)");
    expect(html).not.toContain(">Copy<");
    expect(html).not.toContain(">Download<");
    expect(html).not.toContain('width="14"');
    expect(html).not.toContain('width="15"');
  });
});
