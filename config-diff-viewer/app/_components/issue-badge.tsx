/**
 * 이슈 심각도를 색상 배지로 표현하는 보조 컴포넌트다.
 */
"use client";

import type { Severity } from "@/lib/types";
import { Badge, type BadgeVariant } from "./design-system/Badge";

const BADGE: Record<Severity, { label: string; variant: BadgeVariant }> = {
  CRITICAL: { label: "치명", variant: "danger" },
  HIGH: { label: "높음", variant: "danger" },
  MEDIUM: { label: "중간", variant: "warning" },
  LOW: { label: "낮음", variant: "neutral" },
};

export default function IssueBadge({ severity }: { severity: Severity }) {
  const badge = BADGE[severity];
  return <Badge variant={badge.variant}>{badge.label}</Badge>;
}
