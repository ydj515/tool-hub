"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  FileSearch,
  Loader2,
  Moon,
  RotateCcw,
  Sun,
  Upload,
} from "lucide-react";

import MonacoDiffEditor from "./monaco-diff-editor";
import ResultPanel from "./result-panel";
import AnalysisOptionsBar from "./analysis-options";
import RulesDrawer from "./rules-drawer";
import { useDebouncedParser } from "./use-debounced-parser";
import { parseConfigFile, detectFormat } from "@/lib/parser";
import { computeDiff } from "@/lib/differ";
import { detectSecrets } from "@/lib/detector";
import { validateConfig } from "@/lib/validator";
import { detectDuplicateKeys } from "@/lib/duplicate-detector";
import type { AnalysisOptions, ConfigFormat, ValidationReport } from "@/lib/types";

const SAMPLE_A = `spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/myapp_dev
    username: dev_user
    password: dev_password
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
  devtools:
    restart:
      enabled: true

debug: true
server:
  port: 8080

logging:
  level:
    root: DEBUG
    com.example: DEBUG

management:
  endpoints:
    web:
      exposure:
        include: health,info

jwt:
  secret: my-dev-jwt-secret

external-api:
  url: http://localhost:9090
  timeout: 5000
  retry:
    max-attempts: 3
`;

const SAMPLE_B = `spring:
  datasource:
    url: jdbc:postgresql://prod-db.internal:5432/myapp
    username: \${DB_USERNAME}
    password: my-real-prod-password
  jpa:
    hibernate:
      ddl-auto: create
    show-sql: false

debug: true
server:
  port: 8080
  error:
    include-stacktrace: always

logging:
  level:
    root: INFO
    com.example: WARN

management:
  endpoints:
    web:
      exposure:
        include: "*"

jwt:
  secret: short

external-api:
  url: https://api.prod.internal
  timeout: 500
`;

const ENV_OPTIONS = ["dev", "stage", "prod", "local", "test"];
const FORMAT_OPTIONS: ConfigFormat[] = ["yaml", "json", "properties", "env"];
const FORMAT_LABELS: Record<ConfigFormat, string> = {
  yaml: "YAML",
  json: "JSON",
  properties: ".properties",
  env: ".env",
};

const DEFAULT_OPTIONS: AnalysisOptions = {
  enableSecretDetection: true,
  enableDangerousConfigDetection: true,
  enableDuplicateKeyDetection: true,
};

function buildReport(
  contentA: string, filenameA: string, formatA: ConfigFormat, envA: string,
  contentB: string, filenameB: string, formatB: ConfigFormat, envB: string,
  options: AnalysisOptions,
): ValidationReport {
  const fileA = parseConfigFile(contentA, filenameA, formatA);
  fileA.environment = envA;
  const fileB = parseConfigFile(contentB, filenameB, formatB);
  fileB.environment = envB;

  const diffResults = computeDiff(fileA, fileB);
  const allIssues = [
    ...(options.enableSecretDetection ? detectSecrets(fileA, envA) : []),
    ...(options.enableSecretDetection ? detectSecrets(fileB, envB) : []),
    ...(options.enableDangerousConfigDetection ? validateConfig(fileA, envA) : []),
    ...(options.enableDangerousConfigDetection ? validateConfig(fileB, envB) : []),
    ...(options.enableDuplicateKeyDetection ? detectDuplicateKeys(fileA, envA) : []),
    ...(options.enableDuplicateKeyDetection ? detectDuplicateKeys(fileB, envB) : []),
  ];

  const matched    = diffResults.filter((d) => d.status === "UNCHANGED").length;
  const changed    = diffResults.filter((d) => d.status === "CHANGED" || d.status === "TYPE_CHANGED").length;
  const missingInB = diffResults.filter((d) => d.status === "REMOVED").length;
  const missingInA = diffResults.filter((d) => d.status === "ADDED").length;
  const countBy    = (sev: string) => allIssues.filter((i) => i.severity === sev).length;

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    fileA, fileB,
    summary: {
      totalKeys: diffResults.length, matchedKeys: matched, changedKeys: changed,
      missingInA, missingInB, totalIssues: allIssues.length,
      critical: countBy("CRITICAL"), high: countBy("HIGH"),
      medium: countBy("MEDIUM"), low: countBy("LOW"),
      status: countBy("CRITICAL") + countBy("HIGH") > 0 ? "FAILED" : "PASSED",
    },
    diffResults,
    issues: allIssues,
  };
}

interface CompareSnapshot {
  contentA: string;
  contentB: string;
  formatA: ConfigFormat;
  formatB: ConfigFormat;
}

export default function ConfigDiffClient() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const initial = saved === "light" || saved === "dark" ? saved : "light";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
    setMounted(true);
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

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
  const [options, setOptions]                     = useState<AnalysisOptions>(DEFAULT_OPTIONS);
  const [report, setReport]                       = useState<ValidationReport | null>(null);
  const [compareSnapshot, setCompareSnapshot]     = useState<CompareSnapshot | null>(null);
  const [isComparing, setIsComparing]             = useState(false);
  const [rulesOpen, setRulesOpen]                 = useState(false);

  // File upload refs
  const inputARef = useRef<HTMLInputElement>(null);
  const inputBRef = useRef<HTMLInputElement>(null);

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
      {/* Top bar */}
      <header className="topbar">
        <div className="brandBlock">
          <div className="brandIcon">
            <FileSearch size={22} />
          </div>
          <div>
            <h1>Config Diff Viewer</h1>
            <p>설정 파일 비교 · 누락 키 · 민감정보 · 위험 설정 탐지</p>
          </div>
        </div>
        <div className="topActions">
          <button className="secondaryBtn" onClick={handleReset}>
            <RotateCcw size={14} />
            초기화
          </button>
          <button
            className="primaryBtn"
            onClick={handleCompare}
            disabled={isComparing || !!(parseErrorA || parseErrorB)}
            title={parseErrorA || parseErrorB ? "파싱 오류를 먼저 수정하세요." : undefined}
          >
            {isComparing ? <Loader2 size={15} className="spinning" /> : <ArrowLeftRight size={15} />}
            비교
          </button>
          <button className="themeBtn" type="button" onClick={toggleTheme} aria-label="테마 전환">
            {mounted ? (theme === "dark" ? <Sun size={16} /> : <Moon size={16} />) : <span style={{ display: "block", width: 16, height: 16 }} />}
          </button>
        </div>
      </header>

      <main className="workspace">
        {/* Analysis options */}
        <AnalysisOptionsBar options={options} onChange={setOptions} onOpenRules={() => setRulesOpen(true)} />

        {/* Input card */}
        <div className="editorCard">
          <div className="inputGrid">
            {/* Side A */}
            <div className="inputSide">
              <div className="inputSideHeader">
                <span className="sideLabel">A</span>
                <input
                  className="filenameInput"
                  value={filenameA}
                  onChange={(e) => setFilenameA(e.target.value)}
                  placeholder="파일명"
                  spellCheck={false}
                />
                <select className="controlSelect" value={envA} onChange={(e) => setEnvA(e.target.value)}>
                  {ENV_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <select className="controlSelect" value={formatA} onChange={(e) => setFormatA(e.target.value as ConfigFormat)}>
                  {FORMAT_OPTIONS.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
                </select>
                <button className="uploadBtn" onClick={() => inputARef.current?.click()}>
                  <Upload size={12} />
                  파일 업로드
                </button>
                <input ref={inputARef} type="file" accept=".yml,.yaml,.json,.properties,.env,text/*"
                  style={{ display: "none" }} onChange={(e) => handleFileUpload(e, "a")} />
              </div>

              {parseErrorA && (
                <div className="parseErrorBanner">
                  <AlertTriangle size={13} />
                  {parseErrorA}
                </div>
              )}

              <textarea
                className="codeTextarea"
                value={contentA}
                onChange={(e) => setContentA(e.target.value)}
                placeholder={"YAML / JSON / .properties / .env 내용을 여기에 붙여 넣으세요.\n파일 업로드 버튼을 사용할 수도 있습니다."}
                spellCheck={false}
              />
            </div>

            {/* Side B */}
            <div className="inputSide inputSideRight">
              <div className="inputSideHeader">
                <span className="sideLabel">B</span>
                <input
                  className="filenameInput"
                  value={filenameB}
                  onChange={(e) => setFilenameB(e.target.value)}
                  placeholder="파일명"
                  spellCheck={false}
                />
                <select className="controlSelect" value={envB} onChange={(e) => setEnvB(e.target.value)}>
                  {ENV_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <select className="controlSelect" value={formatB} onChange={(e) => setFormatB(e.target.value as ConfigFormat)}>
                  {FORMAT_OPTIONS.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
                </select>
                <button className="uploadBtn" onClick={() => inputBRef.current?.click()}>
                  <Upload size={12} />
                  파일 업로드
                </button>
                <input ref={inputBRef} type="file" accept=".yml,.yaml,.json,.properties,.env,text/*"
                  style={{ display: "none" }} onChange={(e) => handleFileUpload(e, "b")} />
              </div>

              {parseErrorB && (
                <div className="parseErrorBanner">
                  <AlertTriangle size={13} />
                  {parseErrorB}
                </div>
              )}

              <textarea
                className="codeTextarea"
                value={contentB}
                onChange={(e) => setContentB(e.target.value)}
                placeholder={"YAML / JSON / .properties / .env 내용을 여기에 붙여 넣으세요.\n파일 업로드 버튼을 사용할 수도 있습니다."}
                spellCheck={false}
              />
            </div>
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
