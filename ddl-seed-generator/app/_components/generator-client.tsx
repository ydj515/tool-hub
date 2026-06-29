/**
 * DDL 입력, 검증, SQL 생성 UX를 조립하는 메인 클라이언트 오케스트레이터다.
 * 상태와 핸들러를 소유하고, 셸(Topbar)과 3개 패널에 props로 주입한다.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { editor } from "monaco-editor";
import JSZip from "jszip";

import { generateSeedSql } from "@/lib/generator";
import { validateDdl } from "@/lib/ddl-validation";
import { parseDdl } from "@/lib/ddl-parser";
import type { DataLocale, Dialect, GeneratedSql } from "@/lib/types";
import { SAMPLE_DDL_BASIC, SAMPLE_PRESETS, SAMPLE_PRESET_DIALECTS } from "@/app/_lib/samples";
import { useTheme } from "@/app/_hooks/use-theme";
import Topbar from "@/app/_components/Topbar";
import ControlPanel from "@/app/_components/ControlPanel";
import EditorPanel from "@/app/_components/EditorPanel";
import ResultPanel from "@/app/_components/ResultPanel";

const SQL_COMPRESS_THRESHOLD_BYTES = 512 * 1024;

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

type OutputTab = "insert" | "rollback";

export default function GeneratorClient() {
  const { theme, toggle: toggleTheme, mounted } = useTheme();

  const [ddl, setDdl] = useState(SAMPLE_DDL_BASIC);
  const [inputDialect, setInputDialect] = useState<Dialect>("postgresql");
  const [dialect, setDialect] = useState<Dialect>("postgresql");
  const [rowCount, setRowCount] = useState("1000");
  const [seed, setSeed] = useState("20260427");
  const [includeBoundaryValues, setIncludeBoundaryValues] = useState(true);
  const [locale, setLocale] = useState<DataLocale>("ko");
  const [result, setResult] = useState<GeneratedSql | null>(null);
  const [activeTab, setActiveTab] = useState<OutputTab>("insert");
  const [copied, setCopied] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const downloadMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setDownloadMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const normalizedRowCount = useMemo(() => Number(rowCount), [rowCount]);
  const normalizedSeed = useMemo(() => Number(seed), [seed]);
  const ddlValidation = useMemo(() => validateDdl(ddl, inputDialect), [ddl, inputDialect]);
  const canAttemptGenerate =
    ddl.trim().length > 0 &&
    Number.isInteger(normalizedRowCount) &&
    normalizedRowCount > 0 &&
    normalizedRowCount <= 10000 &&
    Number.isInteger(normalizedSeed);
  const activeSql = activeTab === "insert" ? result?.insertSql : result?.rollbackSql;
  const validationErrors = ddlValidation.issues.filter((issue) => issue.severity === "error");
  const validationWarnings = ddlValidation.issues.filter((issue) => issue.severity === "warning");

  const parsedForCompletion = useMemo(() => {
    try {
      return parseDdl(ddl);
    } catch {
      return { tables: [], warnings: [] };
    }
  }, [ddl]);

  const tableNames = useMemo(
    () => parsedForCompletion.tables.map((t) => t.name),
    [parsedForCompletion],
  );
  const columnNames = useMemo(
    () => [...new Set(parsedForCompletion.tables.flatMap((t) => t.columns.map((c) => c.name)))],
    [parsedForCompletion],
  );

  function onGenerate() {
    if (ddlValidation.hasErrors) {
      const firstIssue = validationErrors[0];
      setError(
        firstIssue
          ? `DDL 구문 오류: ${firstIssue.line}행 ${firstIssue.column}열 - ${firstIssue.message}`
          : "DDL 구문 오류를 먼저 수정해 주세요.",
      );
      if (firstIssue) {
        focusIssue(firstIssue);
      }
      return;
    }

    if (!canAttemptGenerate) {
      setError("DDL, row 수, seed 값을 확인해 주세요. row 수는 1부터 10000까지 지원합니다.");
      return;
    }

    try {
      const nextResult = generateSeedSql(ddl, {
        dialect,
        rowCount: normalizedRowCount,
        seed: normalizedSeed,
        includeBoundaryValues,
        locale,
      });

      if (nextResult.analysis.tables.length === 0) {
        throw new Error("생성 가능한 CREATE TABLE 문이 없습니다.");
      }

      setResult(nextResult);
      setActiveTab("insert");
      setCopied(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "SQL 생성 중 알 수 없는 에러가 발생했습니다.");
      setResult(null);
    }
  }

  function onChangeDdl(nextDdl: string) {
    setDdl(nextDdl);
    setResult(null);
    setCopied(false);
    setError(null);
  }

  function onLoadPreset(presetKey: string) {
    const preset = SAMPLE_PRESETS[presetKey];
    if (!preset) {
      return;
    }
    const presetDialect = SAMPLE_PRESET_DIALECTS[presetKey];
    if (presetDialect) {
      setInputDialect(presetDialect);
    }
    onChangeDdl(preset);
  }

  function onInputDialectChange(nextDialect: Dialect) {
    setInputDialect(nextDialect);
    setResult(null);
    setCopied(false);
    setError(null);
  }

  function onChangeDialect(nextDialect: Dialect) {
    setDialect(nextDialect);
    setResult(null);
    setCopied(false);
    setError(null);
  }

  function focusAt(line: number, column: number) {
    const editorInstance = editorRef.current;
    if (!editorInstance) {
      return;
    }
    editorInstance.revealPositionInCenter({ lineNumber: line, column });
    editorInstance.setPosition({ lineNumber: line, column });
    editorInstance.focus();
  }

  function focusIssue(issue: { line: number; column: number }) {
    focusAt(issue.line, issue.column);
  }

  function downloadText(fileName: string, content: string) {
    const blob = new Blob([content], { type: "text/sql;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function triggerBlobDownload(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleDownload(target: "insert" | "rollback" | "all") {
    if (!result || isDownloading) return;
    setDownloadMenuOpen(false);

    if (target === "all") {
      setIsDownloading(true);
      try {
        const zip = new JSZip();
        zip.file("insert.sql", result.insertSql);
        zip.file("rollback.sql", result.rollbackSql);
        zip.file(
          "analysis.json",
          JSON.stringify(
            {
              dialect,
              rowCount: result.summary.rowCountPerTable,
              totalRows: result.summary.totalRows,
              insertOrder: result.analysis.insertOrder,
              cycleGroups: result.analysis.cycleGroups,
              warnings: result.analysis.warnings,
              tables: result.analysis.tables.map((table) => ({
                name: table.name,
                columns: table.columns.map((column) => ({
                  name: column.name,
                  type: column.rawType,
                  nullable: column.nullable,
                  primaryKey: column.primaryKey,
                  reference: column.reference,
                })),
                foreignKeys: table.foreignKeys,
              })),
            },
            null,
            2,
          ),
        );
        const blob = await zip.generateAsync({ type: "blob" });
        triggerBlobDownload(blob, `ddl-seed-${dialect}.zip`);
      } finally {
        setIsDownloading(false);
      }
      return;
    }

    const sql = target === "insert" ? result.insertSql : result.rollbackSql;
    const fileName = `${target}.sql`;
    const byteSize = new Blob([sql]).size;

    if (byteSize > SQL_COMPRESS_THRESHOLD_BYTES) {
      setDownloadInfo(`파일 크기(${formatBytes(byteSize)})가 커서 zip으로 압축해 다운로드합니다.`);
      window.setTimeout(() => setDownloadInfo(null), 4000);
      setIsDownloading(true);
      try {
        const zip = new JSZip();
        zip.file(fileName, sql);
        const blob = await zip.generateAsync({ type: "blob" });
        triggerBlobDownload(blob, `${target}.zip`);
      } finally {
        setIsDownloading(false);
      }
    } else {
      downloadText(fileName, sql);
    }
  }

  async function copySql() {
    if (!activeSql) return;
    try {
      await navigator.clipboard.writeText(activeSql);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setError("클립보드 복사에 실패했습니다. 직접 선택 후 복사해 주세요.");
    }
  }

  return (
    <main className="appShell">
      <Topbar
        canGenerate={canAttemptGenerate}
        onGenerate={onGenerate}
        onLoadPreset={onLoadPreset}
        theme={theme}
        mounted={mounted}
        onToggleTheme={toggleTheme}
      />

      <section className="workspace">
        <ControlPanel
          inputDialect={inputDialect}
          onInputDialectChange={onInputDialectChange}
          outputDialect={dialect}
          onOutputDialectChange={onChangeDialect}
          rowCount={rowCount}
          onRowCountChange={setRowCount}
          seed={seed}
          onSeedChange={setSeed}
          includeBoundaryValues={includeBoundaryValues}
          onIncludeBoundaryChange={setIncludeBoundaryValues}
          locale={locale}
          onLocaleChange={setLocale}
          result={result}
        />

        <EditorPanel
          ddl={ddl}
          onChangeDdl={onChangeDdl}
          issues={ddlValidation.issues}
          hasErrors={ddlValidation.hasErrors}
          errors={validationErrors}
          warnings={validationWarnings}
          inputDialect={inputDialect}
          tableNames={tableNames}
          columnNames={columnNames}
          onEditorMount={(editorInstance) => { editorRef.current = editorInstance; }}
          theme={theme}
          onFocusIssue={focusIssue}
        />

        <ResultPanel
          result={result}
          error={error}
          dialect={dialect}
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
          activeSql={activeSql}
          copied={copied}
          onCopy={copySql}
          isDownloading={isDownloading}
          downloadMenuOpen={downloadMenuOpen}
          onToggleDownloadMenu={() => setDownloadMenuOpen((v) => !v)}
          onDownload={handleDownload}
          downloadInfo={downloadInfo}
          downloadMenuRef={downloadMenuRef}
        />
      </section>
    </main>
  );
}
