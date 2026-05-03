"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ClipboardCopy, FileJson, FileText } from "lucide-react";
import StatsBar from "./stats-bar";
import ResultTable from "./result-table";
import type { AnalysisOptions, ValidationReport } from "@/lib/types";
import { generateJson, generateMarkdown, generateTextSummary } from "@/lib/exporter";

type TabType = "diff" | "missing" | "secrets" | "warnings" | "duplicates";

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  report: ValidationReport;
  options: AnalysisOptions;
}

export default function ResultPanel({ report, options }: Props) {
  const { summary, diffResults, issues } = report;

  const changedCount = diffResults.filter(
    (d) => d.status === "CHANGED" || d.status === "TYPE_CHANGED",
  ).length;
  const missingCount =
    diffResults.filter((d) => d.status === "REMOVED").length +
    diffResults.filter((d) => d.status === "ADDED").length;
  const secretCount    = issues.filter((i) => i.category === "SECRET").length;
  const warningCount   = issues.filter((i) => i.category === "DANGEROUS_CONFIG").length;
  const duplicateCount = issues.filter((i) => i.category === "DUPLICATE_KEY").length;

  const firstTab: TabType =
    changedCount > 0 ? "diff"
    : missingCount > 0 ? "missing"
    : secretCount > 0 && options.enableSecretDetection ? "secrets"
    : "diff";

  const [tab, setTab]             = useState<TabType>(firstTab);
  const [copied, setCopied]       = useState(false);
  const [dropOpen, setDropOpen]   = useState(false);
  const dropRef                   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropOpen) return;
    function onOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [dropOpen]);

  function handleCopy() {
    navigator.clipboard.writeText(generateTextSummary(report)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // clipboard API 미지원 환경(non-HTTPS 등) 에서는 조용히 무시
    });
    setDropOpen(false);
  }

  function handleMarkdown() {
    downloadBlob(generateMarkdown(report), "config-diff-report.md", "text/markdown");
    setDropOpen(false);
  }

  function handleJson() {
    downloadBlob(generateJson(report), "config-diff-report.json", "application/json");
    setDropOpen(false);
  }

  const tabs: { id: TabType; label: string; count: number; enabled: boolean }[] = [
    { id: "diff",       label: "값 불일치",  count: changedCount,   enabled: true },
    { id: "missing",    label: "누락 키",    count: missingCount,   enabled: true },
    { id: "secrets",    label: "민감정보",   count: secretCount,    enabled: options.enableSecretDetection },
    { id: "warnings",   label: "위험 설정",  count: warningCount,   enabled: options.enableDangerousConfigDetection },
    { id: "duplicates", label: "중복 키",    count: duplicateCount, enabled: options.enableDuplicateKeyDetection },
  ];

  const criticalHigh = summary.critical + summary.high;

  return (
    <div className="resultCard">
      <StatsBar report={report} />

      <div className="tabBar">
        {tabs.map(({ id, label, count, enabled }) => {
          const hasIssue = count > 0 && enabled;
          const isDisabled = !enabled;
          return (
            <button
              key={id}
              className={`tabBtn ${tab === id ? "active" : ""} ${hasIssue ? "hasIssues" : ""} ${isDisabled ? "disabledTab" : ""}`}
              onClick={() => { if (!isDisabled) setTab(id); }}
              title={isDisabled ? "분석 옵션에서 비활성화됨" : undefined}
            >
              {label}
              {isDisabled ? (
                <span className="tabCount tabCountOff">OFF</span>
              ) : (
                <span className="tabCount">{count}</span>
              )}
            </button>
          );
        })}

        {criticalHigh > 0 && (
          <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "#b91c1c", fontWeight: 700, alignSelf: "center" }}>
            CRITICAL/HIGH {criticalHigh}건
          </span>
        )}
      </div>

      <ResultTable report={report} tab={tab} />

      <div className="exportBar">
        {copied && <span className="copyNotice">복사 완료</span>}

        {/* Split button */}
        <div className="exportSplit" ref={dropRef}>
          <button className="exportSplitMain" onClick={handleCopy}>
            <ClipboardCopy size={14} />
            텍스트 복사
          </button>
          <button
            className={`exportSplitChevron ${dropOpen ? "open" : ""}`}
            onClick={() => setDropOpen((v) => !v)}
            aria-label="내보내기 옵션"
          >
            <ChevronDown size={13} />
          </button>

          {dropOpen && (
            <div className="exportDropdown">
              <button className="exportDropdownItem" onClick={handleCopy}>
                <ClipboardCopy size={13} />
                텍스트 복사
              </button>
              <button className="exportDropdownItem" onClick={handleMarkdown}>
                <FileText size={13} />
                Markdown 다운로드
              </button>
              <button className="exportDropdownItem" onClick={handleJson}>
                <FileJson size={13} />
                JSON 다운로드
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
