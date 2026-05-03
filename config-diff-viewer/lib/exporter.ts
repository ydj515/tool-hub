import type { DiffResult, ValidationIssue, ValidationReport } from "./types";

function displayValue(dr: DiffResult, side: "a" | "b"): string {
  const cv = side === "a" ? dr.valueA : dr.valueB;
  if (!cv) return "—";
  if (cv.isSensitiveCandidate && cv.maskedValue) return cv.maskedValue;
  return cv.rawValue;
}

export function generateMarkdown(report: ValidationReport): string {
  const { summary, fileA, fileB, diffResults, issues } = report;
  const lines: string[] = [];

  lines.push("# Config Validation Report");
  lines.push("");
  lines.push(`**Generated**: ${new Date(report.createdAt).toLocaleString("ko-KR")}`);
  lines.push(`**Files**: \`${fileA.filename}\` vs \`${fileB.filename}\``);
  lines.push(`**Status**: ${summary.status === "FAILED" ? "FAILED" : "PASSED"}`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push("| 항목 | 수 |");
  lines.push("|---|---:|");
  lines.push(`| 전체 키 | ${summary.totalKeys} |`);
  lines.push(`| 일치 | ${summary.matchedKeys} |`);
  lines.push(`| 값 불일치 | ${summary.changedKeys} |`);
  lines.push(`| A 누락 (B에만 있음) | ${summary.missingInA} |`);
  lines.push(`| B 누락 (A에만 있음) | ${summary.missingInB} |`);
  lines.push("");
  lines.push("| Severity | Count |");
  lines.push("|---|---:|");
  lines.push(`| CRITICAL | ${summary.critical} |`);
  lines.push(`| HIGH | ${summary.high} |`);
  lines.push(`| MEDIUM | ${summary.medium} |`);
  lines.push(`| LOW | ${summary.low} |`);
  lines.push("");

  const missingInB = diffResults.filter((d) => d.status === "REMOVED");
  if (missingInB.length > 0) {
    lines.push("## B 파일 누락 키 (A에는 있으나 B에 없음)");
    lines.push("");
    lines.push("| Key | A 값 |");
    lines.push("|---|---|");
    for (const d of missingInB) {
      lines.push(`| \`${d.key}\` | \`${displayValue(d, "a")}\` |`);
    }
    lines.push("");
  }

  const missingInA = diffResults.filter((d) => d.status === "ADDED");
  if (missingInA.length > 0) {
    lines.push("## A 파일 누락 키 (B에는 있으나 A에 없음)");
    lines.push("");
    lines.push("| Key | B 값 |");
    lines.push("|---|---|");
    for (const d of missingInA) {
      lines.push(`| \`${d.key}\` | \`${displayValue(d, "b")}\` |`);
    }
    lines.push("");
  }

  const changed = diffResults.filter(
    (d) => d.status === "CHANGED" || d.status === "TYPE_CHANGED",
  );
  if (changed.length > 0) {
    lines.push("## 값 불일치");
    lines.push("");
    lines.push(`| Key | ${fileA.filename} | ${fileB.filename} |`);
    lines.push("|---|---|---|");
    for (const d of changed) {
      lines.push(`| \`${d.key}\` | \`${displayValue(d, "a")}\` | \`${displayValue(d, "b")}\` |`);
    }
    lines.push("");
  }

  const byCategory = (cat: ValidationIssue["category"]) =>
    issues.filter((i) => i.category === cat);

  const dangerous = byCategory("DANGEROUS_CONFIG");
  if (dangerous.length > 0) {
    lines.push("## 위험 설정");
    lines.push("");
    for (const issue of dangerous) {
      lines.push(`### [${issue.severity}] ${issue.ruleId}`);
      if (issue.key) lines.push(`- **Key**: \`${issue.key}\``);
      if (issue.actualValue) lines.push(`- **Value**: \`${issue.actualValue}\``);
      lines.push(`- **Message**: ${issue.message}`);
      if (issue.suggestion) lines.push(`- **Suggestion**: ${issue.suggestion}`);
      lines.push("");
    }
  }

  const secrets = byCategory("SECRET");
  if (secrets.length > 0) {
    lines.push("## 민감정보 의심");
    lines.push("");
    lines.push("| Severity | Key | Masked Value | Message |");
    lines.push("|---|---|---|---|");
    for (const issue of secrets) {
      lines.push(
        `| ${issue.severity} | \`${issue.key ?? ""}\` | \`${issue.actualValue ?? ""}\` | ${issue.message} |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function generateJson(report: ValidationReport): string {
  return JSON.stringify(
    {
      ...report,
      fileA: { ...report.fileA, rawContent: undefined, parsed: undefined },
      fileB: { ...report.fileB, rawContent: undefined, parsed: undefined },
    },
    null,
    2,
  );
}

export function generateTextSummary(report: ValidationReport): string {
  const { summary, fileA, fileB, diffResults, issues } = report;
  const lines: string[] = [];

  lines.push(`=== Config Diff: ${fileA.filename} vs ${fileB.filename} ===`);
  lines.push(`상태: ${summary.status}`);
  lines.push(`전체 키: ${summary.totalKeys}  일치: ${summary.matchedKeys}  불일치: ${summary.changedKeys}  누락: ${summary.missingInA + summary.missingInB}`);
  lines.push(`이슈: CRITICAL ${summary.critical} / HIGH ${summary.high} / MEDIUM ${summary.medium} / LOW ${summary.low}`);
  lines.push("");

  const missingInB = diffResults.filter((d) => d.status === "REMOVED");
  if (missingInB.length > 0) {
    lines.push("[B 파일 누락 키]");
    for (const d of missingInB) lines.push(`  - ${d.key}`);
    lines.push("");
  }

  const changed = diffResults.filter((d) => d.status === "CHANGED" || d.status === "TYPE_CHANGED");
  if (changed.length > 0) {
    lines.push("[값 불일치]");
    for (const d of changed) {
      lines.push(`  - ${d.key}`);
      lines.push(`    A: ${displayValue(d, "a")}`);
      lines.push(`    B: ${displayValue(d, "b")}`);
    }
    lines.push("");
  }

  const dangerous = issues.filter((i) => i.category === "DANGEROUS_CONFIG");
  if (dangerous.length > 0) {
    lines.push("[위험 설정]");
    for (const i of dangerous) {
      lines.push(`  - [${i.severity}] ${i.message}`);
      if (i.key) lines.push(`    Key: ${i.key}`);
    }
    lines.push("");
  }

  const secrets = issues.filter((i) => i.category === "SECRET");
  if (secrets.length > 0) {
    lines.push("[민감정보 의심]");
    for (const i of secrets) {
      lines.push(`  - [${i.severity}] ${i.key ?? ""}: ${i.message}`);
    }
  }

  return lines.join("\n");
}
