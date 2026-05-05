/**
 * 이슈 심각도를 색상 배지로 표현하는 보조 컴포넌트다.
 */
"use client";

import type { Severity } from "@/lib/types";

const LABELS: Record<Severity, string> = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
};

export default function IssueBadge({ severity }: { severity: Severity }) {
  return <span className={`badge ${severity}`}>{LABELS[severity]}</span>;
}
