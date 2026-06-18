/**
 * diff 결과와 검증 이슈를 표 형식으로 렌더링한다.
 */
"use client";

import IssueBadge from "./issue-badge";
import type { DiffResult, ValidationIssue, ValidationReport } from "@/lib/types";

type TabType = "diff" | "missing" | "secrets" | "warnings" | "duplicates";

function ValueCell({
  cv,
  status,
}: {
  cv: DiffResult["valueA"] | DiffResult["valueB"];
  status: DiffResult["status"];
}) {
  if (!cv) return <span className="valuePill missing">—</span>;
  if (cv.isPlaceholder) return <span className="valuePill placeholder">{cv.rawValue}</span>;
  if (cv.isSensitiveCandidate && cv.maskedValue)
    return <span className="valuePill masked">{cv.maskedValue}</span>;
  const cls = status !== "UNCHANGED" ? "changed" : "";
  return <span className={`valuePill ${cls}`}>{cv.rawValue || <em>{"(empty)"}</em>}</span>;
}

function DiffTable({
  rows,
  filenameA,
  filenameB,
}: {
  rows: DiffResult[];
  filenameA: string;
  filenameB: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="emptyState">
        <p>차이가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="tableWrapper">
      <table className="issueTable">
        <thead>
          <tr>
            <th className="statusColumn">상태</th>
            <th>Key</th>
            <th>{filenameA}</th>
            <th>{filenameB}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.key}>
              <td>
                <span className={`badge ${d.status}`}>
                  {d.status === "ADDED"
                    ? "B만 있음"
                    : d.status === "REMOVED"
                      ? "A만 있음"
                      : d.status === "TYPE_CHANGED"
                        ? "타입 변경"
                        : "값 변경"}
                </span>
              </td>
              <td><span className="keyPath">{d.key}</span></td>
              <td><ValueCell cv={d.valueA} status={d.status} /></td>
              <td><ValueCell cv={d.valueB} status={d.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IssueTable({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="emptyState">
        <p>탐지된 이슈가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="tableWrapper">
      <table className="issueTable">
        <thead>
          <tr>
            <th className="severityColumn">Severity</th>
            <th>Key</th>
            <th>Value</th>
            <th>내용</th>
            <th>제안</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr key={issue.id}>
              <td><IssueBadge severity={issue.severity} /></td>
              <td>
                {issue.key ? (
                  <span className="keyPath">{issue.key}</span>
                ) : (
                  <span className="valuePill missing">—</span>
                )}
              </td>
              <td>
                {issue.actualValue ? (
                  <span className="valuePill masked">{issue.actualValue}</span>
                ) : (
                  <span className="valuePill missing">—</span>
                )}
              </td>
              <td className="messageCell">{issue.message}</td>
              <td className="suggestionCell">
                <span className="suggestionText">{issue.suggestion ?? "—"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MissingTable({
  diffResults,
  filenameA,
  filenameB,
}: {
  diffResults: DiffResult[];
  filenameA: string;
  filenameB: string;
}) {
  const missingInB = diffResults.filter((d) => d.status === "REMOVED");
  const missingInA = diffResults.filter((d) => d.status === "ADDED");

  if (missingInA.length === 0 && missingInB.length === 0) {
    return (
      <div className="emptyState">
        <p>누락된 키가 없습니다.</p>
      </div>
    );
  }

  const allMissing = [
    ...missingInB.map((d) => ({ ...d, missingIn: filenameB, presentIn: filenameA, presentVal: d.valueA })),
    ...missingInA.map((d) => ({ ...d, missingIn: filenameA, presentIn: filenameB, presentVal: d.valueB })),
  ];

  return (
    <div className="tableWrapper">
      <table className="issueTable">
        <thead>
          <tr>
            <th>Key</th>
            <th>누락 파일</th>
            <th>존재하는 값</th>
          </tr>
        </thead>
        <tbody>
          {allMissing.map((d) => (
            <tr key={`${d.key}-${d.missingIn}`}>
              <td><span className="keyPath">{d.key}</span></td>
              <td>
                <span className="valuePill danger">{d.missingIn}</span>
              </td>
              <td>
                {d.presentVal ? (
                  d.presentVal.isPlaceholder ? (
                    <span className="valuePill placeholder">{d.presentVal.rawValue}</span>
                  ) : d.presentVal.isSensitiveCandidate && d.presentVal.maskedValue ? (
                    <span className="valuePill masked">{d.presentVal.maskedValue}</span>
                  ) : (
                    <span className="valuePill">{d.presentVal.rawValue}</span>
                  )
                ) : (
                  <span className="valuePill missing">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DuplicateTable({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="emptyState">
        <p>중복 키가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="tableWrapper">
      <table className="issueTable">
        <thead>
          <tr>
            <th className="severityColumn">Severity</th>
            <th>Key</th>
            <th>파일</th>
            <th>내용</th>
            <th>제안</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr key={issue.id}>
              <td><IssueBadge severity={issue.severity} /></td>
              <td><span className="keyPath">{issue.key ?? "—"}</span></td>
              <td><span className="valuePill">{issue.file}</span></td>
              <td className="messageCell">{issue.message}</td>
              <td className="suggestionCell">
                <span className="suggestionText">{issue.suggestion ?? "—"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface Props {
  report: ValidationReport;
  tab: TabType;
}

export default function ResultTable({ report, tab }: Props) {
  const { diffResults, issues, fileA, fileB } = report;

  const changedDiff  = diffResults.filter((d) => d.status === "CHANGED" || d.status === "TYPE_CHANGED");
  const secrets      = issues.filter((i) => i.category === "SECRET");
  const warnings     = issues.filter((i) => i.category === "DANGEROUS_CONFIG");
  const duplicates   = issues.filter((i) => i.category === "DUPLICATE_KEY");

  switch (tab) {
    case "diff":
      return <DiffTable rows={changedDiff} filenameA={fileA.filename} filenameB={fileB.filename} />;
    case "missing":
      return <MissingTable diffResults={diffResults} filenameA={fileA.filename} filenameB={fileB.filename} />;
    case "secrets":
      return <IssueTable issues={secrets} />;
    case "warnings":
      return <IssueTable issues={warnings} />;
    case "duplicates":
      return <DuplicateTable issues={duplicates} />;
  }
}
