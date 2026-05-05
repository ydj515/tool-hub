/**
 * 비교 결과 요약 수치를 상단 바 형태로 보여준다.
 */
"use client";

import type { ValidationReport } from "@/lib/types";

interface Props {
  report: ValidationReport;
}

export default function StatsBar({ report }: Props) {
  const { summary } = report;
  const isPassed = summary.status === "PASSED";

  return (
    <div className="statsBar">
      <div className="statItem">
        <span className="statLabel">전체 키</span>
        <strong className="statValue">{summary.totalKeys}</strong>
      </div>
      <div className="statsDivider" />
      <div className="statItem">
        <span className="statLabel">일치</span>
        <strong className={`statValue ok`}>{summary.matchedKeys}</strong>
      </div>
      <div className="statsDivider" />
      <div className="statItem">
        <span className="statLabel">값 불일치</span>
        <strong className={`statValue ${summary.changedKeys > 0 ? "warn" : "ok"}`}>
          {summary.changedKeys}
        </strong>
      </div>
      <div className="statsDivider" />
      <div className="statItem">
        <span className="statLabel">B 누락</span>
        <strong className={`statValue ${summary.missingInB > 0 ? "warn" : "ok"}`}>
          {summary.missingInB}
        </strong>
      </div>
      <div className="statsDivider" />
      <div className="statItem">
        <span className="statLabel">A 누락</span>
        <strong className={`statValue ${summary.missingInA > 0 ? "warn" : "ok"}`}>
          {summary.missingInA}
        </strong>
      </div>
      <div className="statsDivider" />
      <div className="statItem">
        <span className="statLabel">이슈</span>
        <strong className={`statValue ${summary.totalIssues > 0 ? "warn" : "ok"}`}>
          {summary.totalIssues}
        </strong>
      </div>

      <span className={`statusBadge ${isPassed ? "passed" : "failed"}`}>
        {isPassed ? "PASSED" : "FAILED"}
      </span>
    </div>
  );
}
