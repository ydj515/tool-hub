import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AnalysisOptions, Severity, ValidationReport } from "@/lib/types";
import AnalysisOptionsBar from "./analysis-options";
import IssueBadge from "./issue-badge";
import ResultPanel from "./result-panel";
import ResultTable from "./result-table";
import StatsBar from "./stats-bar";

function createReport(
  overrides: Partial<ValidationReport["summary"]> = {},
): ValidationReport {
  const configFile = {
    id: "file-a",
    filename: "application-a.yml",
    format: "yaml" as const,
    environment: "dev",
    rawContent: "server:\n  port: 8080",
    parsed: { server: { port: 8080 } },
    flattened: {},
    parseErrors: [],
  };

  return {
    id: "report-1",
    createdAt: "2026-07-27T00:00:00.000Z",
    fileA: configFile,
    fileB: { ...configFile, id: "file-b", filename: "application-b.yml" },
    summary: {
      totalKeys: 0,
      matchedKeys: 0,
      changedKeys: 0,
      missingInA: 0,
      missingInB: 0,
      totalIssues: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      status: "PASSED",
      ...overrides,
    },
    diffResults: [],
    issues: [],
  };
}

describe("Config Diff Viewer 공통 Badge adapter", () => {
  it.each<[Severity, string, string]>([
    ["CRITICAL", "치명", "danger"],
    ["HIGH", "높음", "danger"],
    ["MEDIUM", "중간", "warning"],
    ["LOW", "낮음", "neutral"],
  ])("%s 심각도를 %s 배지로 렌더한다", (severity, label, variant) => {
    const html = renderToStaticMarkup(<IssueBadge severity={severity} />);

    expect(html).toContain('data-ds-badge="true"');
    expect(html).toContain(`data-variant="${variant}"`);
    expect(html).toContain(`>${label}</span>`);
    expect(html).not.toContain(`>${severity}</span>`);
  });

  it.each([
    ["PASSED", "통과", "success"],
    ["FAILED", "실패", "danger"],
  ] as const)("%s 통계를 %s 배지로 렌더한다", (status, label, variant) => {
    const html = renderToStaticMarkup(<StatsBar report={createReport({ status })} />);

    expect(html).toContain('data-ds-badge="true"');
    expect(html).toContain(`data-variant="${variant}"`);
    expect(html).toContain(`>${label}</span>`);
    expect(html).not.toContain(`>${status}</span>`);
  });

  it("분석 boolean을 유지하면서 켬과 끔 배지를 렌더한다", () => {
    const options: AnalysisOptions = {
      enableSecretDetection: true,
      enableDangerousConfigDetection: false,
      enableDuplicateKeyDetection: true,
    };
    const html = renderToStaticMarkup(
      <AnalysisOptionsBar options={options} onChange={() => {}} onOpenRules={() => {}} />,
    );

    expect((html.match(/data-ds-badge="true"/g) ?? [])).toHaveLength(4);
    expect((html.match(/aria-pressed="true"/g) ?? [])).toHaveLength(2);
    expect((html.match(/aria-pressed="false"/g) ?? [])).toHaveLength(1);
    expect((html.match(/data-variant="primary"/g) ?? [])).toHaveLength(3);
    expect((html.match(/data-variant="neutral"/g) ?? [])).toHaveLength(1);
    expect((html.match(/>켬<\/span>/g) ?? [])).toHaveLength(2);
    expect((html.match(/>끔<\/span>/g) ?? [])).toHaveLength(1);
    expect(html).not.toContain(">ON</span>");
    expect(html).not.toContain(">OFF</span>");
  });
});

describe("Config Diff Viewer 결과 표시", () => {
  it.each([
    ["diff", "차이가 없습니다."],
    ["missing", "누락된 키가 없습니다."],
    ["secrets", "탐지된 이슈가 없습니다."],
    ["warnings", "탐지된 이슈가 없습니다."],
    ["duplicates", "중복 키가 없습니다."],
  ] as const)("%s 탭의 실제 빈 상태를 생성 EmptyState로 렌더한다", (tab, title) => {
    const html = renderToStaticMarkup(<ResultTable report={createReport()} tab={tab} />);

    expect(html).toContain('data-ds-empty-state="true"');
    expect(html).toContain(`<strong>${title}</strong>`);
    expect(html).not.toContain('class="emptyState"');
  });

  it("차이 상태와 사용자 노출 표 머리글을 공통 배지와 한국어로 렌더한다", () => {
    const report = createReport({ changedKeys: 1 });
    report.diffResults = [
      {
        key: "server.port",
        status: "CHANGED",
        valueA: {
          key: "server.port",
          value: 8080,
          valueType: "number",
          rawValue: "8080",
          isPlaceholder: false,
          isSensitiveCandidate: false,
        },
        valueB: {
          key: "server.port",
          value: 9090,
          valueType: "number",
          rawValue: "9090",
          isPlaceholder: false,
          isSensitiveCandidate: false,
        },
      },
    ];
    const html = renderToStaticMarkup(<ResultTable report={report} tab="diff" />);

    expect(html).toContain('data-ds-badge="true"');
    expect(html).toContain('data-variant="warning"');
    expect(html).toContain(">값 변경</span>");
    expect(html).toContain("<th>키</th>");
    expect(html).not.toContain("<th>Key</th>");
  });

  it("비활성 분석 탭과 고위험 요약을 한국어로 렌더한다", () => {
    const report = createReport({ critical: 1, high: 1, totalIssues: 2, status: "FAILED" });
    const options: AnalysisOptions = {
      enableSecretDetection: false,
      enableDangerousConfigDetection: false,
      enableDuplicateKeyDetection: false,
    };
    const html = renderToStaticMarkup(<ResultPanel report={report} options={options} />);

    expect((html.match(/>끔<\/span>/g) ?? [])).toHaveLength(3);
    expect(html).toContain("치명/높음 2건");
    expect(html).not.toContain(">OFF</span>");
    expect(html).not.toContain("CRITICAL/HIGH");
  });
});
