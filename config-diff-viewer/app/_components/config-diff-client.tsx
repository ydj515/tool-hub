/**
 * 파일 입력, 비교 실행, 결과 상태를 관리하는 메인 클라이언트 오케스트레이터다.
 * 상태와 핸들러를 소유하고, 셸(Topbar)·입력(InputSide)·결과 컴포넌트를 조립한다.
 */
"use client";

import { useState } from "react";
import { AlertTriangle, ArrowLeftRight } from "lucide-react";

import MonacoDiffEditor from "./monaco-diff-editor";
import ResultPanel from "./result-panel";
import AnalysisOptionsBar from "./analysis-options";
import RulesDrawer from "./rules-drawer";
import Topbar from "./Topbar";
import InputSide from "./InputSide";
import { useDebouncedParser } from "./use-debounced-parser";
import { useTheme } from "@/app/_hooks/use-theme";
import { parseConfigFile, detectFormat } from "@/lib/parser";
import { buildReport } from "@/app/_lib/report";
import { SAMPLE_A, SAMPLE_B, DEFAULT_OPTIONS } from "@/app/_lib/constants";
import type { AnalysisOptions, ConfigFormat, ValidationReport } from "@/lib/types";

interface CompareSnapshot {
  contentA: string;
  contentB: string;
  formatA: ConfigFormat;
  formatB: ConfigFormat;
}

export default function ConfigDiffClient() {
  const { theme, toggle: toggleTheme, mounted } = useTheme();

  // Controlled textarea content
  const [contentA, setContentA] = useState(SAMPLE_A);
  const [contentB, setContentB] = useState(SAMPLE_B);

  // File metadata
  const [filenameA, setFilenameA] = useState("application-dev.yml");
  const [filenameB, setFilenameB] = useState("application-prod.yml");
  const [formatA, setFormatA]     = useState<ConfigFormat>("yaml");
  const [formatB, setFormatB]     = useState<ConfigFormat>("yaml");
  const [envA, setEnvA]           = useState("dev");
  const [envB, setEnvB]           = useState("prod");

  // 실시간 파스 오류 감지 (debounce 400ms)
  const parseErrorA = useDebouncedParser(contentA, filenameA, formatA);
  const parseErrorB = useDebouncedParser(contentB, filenameB, formatB);

  // Analysis
  const [options, setOptions]                 = useState<AnalysisOptions>(DEFAULT_OPTIONS);
  const [report, setReport]                   = useState<ValidationReport | null>(null);
  const [compareSnapshot, setCompareSnapshot] = useState<CompareSnapshot | null>(null);
  const [isComparing, setIsComparing]         = useState(false);
  const [rulesOpen, setRulesOpen]             = useState(false);

  // 마지막 비교 이후 내용·포맷이 변경되었는지 감지
  const isDirty = compareSnapshot !== null && (
    contentA !== compareSnapshot.contentA ||
    contentB !== compareSnapshot.contentB ||
    formatA  !== compareSnapshot.formatA  ||
    formatB  !== compareSnapshot.formatB
  );

  function handleCompare() {
    // 디바운스 상태를 믿지 않고 동기적으로 재검증
    const tmpA = parseConfigFile(contentA, filenameA, formatA);
    const tmpB = parseConfigFile(contentB, filenameB, formatB);
    const errA = tmpA.parseErrors.length > 0
      ? `Line ${tmpA.parseErrors[0].line}: ${tmpA.parseErrors[0].message}` : "";
    const errB = tmpB.parseErrors.length > 0
      ? `Line ${tmpB.parseErrors[0].line}: ${tmpB.parseErrors[0].message}` : "";
    if (errA || errB) return;

    // React 18 배치로 인해 setIsComparing(true) 직후 페인트가 안 됨 →
    // setTimeout으로 한 프레임 양보해 스피너가 실제로 보이도록 함
    setIsComparing(true);
    setTimeout(() => {
      try {
        const newReport = buildReport(
          contentA, filenameA, formatA, envA,
          contentB, filenameB, formatB, envB,
          options,
        );
        setReport(newReport);
        setCompareSnapshot({ contentA, contentB, formatA, formatB });
      } finally {
        setIsComparing(false);
      }
    }, 0);
  }

  function handleReset() {
    setContentA(SAMPLE_A);
    setContentB(SAMPLE_B);
    setFilenameA("application-dev.yml");
    setFilenameB("application-prod.yml");
    setFormatA("yaml");
    setFormatB("yaml");
    setEnvA("dev");
    setEnvB("prod");
    setReport(null);
    setCompareSnapshot(null);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, side: "a" | "b") {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const detected = detectFormat(file.name, content);
      if (side === "a") {
        setContentA(content);
        setFilenameA(file.name);
        setFormatA(detected);
      } else {
        setContentB(content);
        setFilenameB(file.name);
        setFormatB(detected);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="appShell">
      <Topbar
        isComparing={isComparing}
        hasParseError={!!(parseErrorA || parseErrorB)}
        onReset={handleReset}
        onCompare={handleCompare}
        theme={theme}
        mounted={mounted}
        onToggleTheme={toggleTheme}
      />

      <main className="workspace">
        {/* Analysis options */}
        <AnalysisOptionsBar options={options} onChange={setOptions} onOpenRules={() => setRulesOpen(true)} />

        {/* Input card */}
        <div className="editorCard">
          <div className="inputGrid">
            <InputSide
              label="A"
              filename={filenameA}
              onFilenameChange={setFilenameA}
              env={envA}
              onEnvChange={setEnvA}
              format={formatA}
              onFormatChange={setFormatA}
              parseError={parseErrorA}
              content={contentA}
              onContentChange={setContentA}
              onFileChange={(e) => handleFileUpload(e, "a")}
            />
            <InputSide
              label="B"
              right
              filename={filenameB}
              onFilenameChange={setFilenameB}
              env={envB}
              onEnvChange={setEnvB}
              format={formatB}
              onFormatChange={setFormatB}
              parseError={parseErrorB}
              content={contentB}
              onContentChange={setContentB}
              onFileChange={(e) => handleFileUpload(e, "b")}
            />
          </div>
        </div>

        {/* Monaco diff view — 비교 후에만 표시 */}
        {compareSnapshot && (
          <div className="diffViewCard">
            <div className="diffViewHeader">
              <span className="diffViewLabel">Diff 뷰</span>
              <span className="diffViewFiles">
                {filenameA} <span className="diffArrow">→</span> {filenameB}
              </span>
              {isDirty && (
                <span className="diffDirtyBanner">
                  <AlertTriangle size={12} />
                  내용이 변경되었습니다. 다시 비교를 실행하세요.
                </span>
              )}
            </div>
            <MonacoDiffEditor
              original={compareSnapshot.contentA}
              modified={compareSnapshot.contentB}
              formatA={compareSnapshot.formatA}
              formatB={compareSnapshot.formatB}
              theme={theme}
            />
          </div>
        )}

        {/* Result panel */}
        {report ? (
          <ResultPanel report={report} options={options} key={report.id} />
        ) : (
          <div className="resultCard">
            <div className="emptyState">
              <ArrowLeftRight size={36} />
              <p>비교 버튼을 눌러 분석을 시작하세요.</p>
              <small>A와 B에 설정 파일 내용을 붙여넣거나 업로드한 뒤 비교를 클릭하세요.</small>
            </div>
          </div>
        )}
      </main>

      <RulesDrawer open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}
