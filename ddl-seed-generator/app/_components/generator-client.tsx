"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { editor } from "monaco-editor";
import JSZip from "jszip";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Database,
  Download,
  FileArchive,
  FileCode2,
  Loader2,
  Network,
  Sparkles,
} from "lucide-react";

import { generateSeedSql } from "@/lib/generator";
import { validateDdl } from "@/lib/ddl-validation";
import { parseDdl } from "@/lib/ddl-parser";
import type { DataLocale, Dialect, GeneratedSql } from "@/lib/types";
import MonacoDdlEditor from "@/app/_components/monaco-ddl-editor";

const SAMPLE_DDL_BASIC = `CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(30),
  status VARCHAR(20) CHECK (status IN ('active', 'pending', 'disabled')),
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  order_code VARCHAR(40) NOT NULL UNIQUE,
  amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE order_items (
  id BIGINT PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  product_name VARCHAR(120) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL
);

CREATE TABLE comments (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  order_id BIGINT REFERENCES orders(id),
  parent_comment_id BIGINT REFERENCES comments(id),
  content VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL
);`;

const SAMPLE_DDL_SCHEMA = `CREATE TABLE public."users" (
  "id" BIGINT PRIMARY KEY,
  "name" VARCHAR(80) NOT NULL,
  "email" VARCHAR(120) NOT NULL UNIQUE,
  "phone" VARCHAR(30),
  "status" VARCHAR(20) CHECK (status IN ('active', 'pending', 'disabled')),
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE public."orders" (
  "id" BIGINT PRIMARY KEY,
  "user_id" BIGINT NOT NULL,
  "order_code" VARCHAR(40) NOT NULL UNIQUE,
  "amount" DECIMAL(12, 2) NOT NULL,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE public."order_items" (
  "id" BIGINT PRIMARY KEY,
  "order_id" BIGINT NOT NULL,
  "product_name" VARCHAR(120) NOT NULL,
  "quantity" INT NOT NULL,
  "unit_price" DECIMAL(10, 2) NOT NULL
);

ALTER TABLE public."orders"
  ADD CONSTRAINT "fk_orders_users"
  FOREIGN KEY ("user_id")
  REFERENCES public."users"("id");

ALTER TABLE public."order_items"
  ADD CONSTRAINT "fk_order_items_orders"
  FOREIGN KEY ("order_id")
  REFERENCES public."orders"("id");`;

const SAMPLE_DDL_ADVANCED = `CREATE TABLE products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  tax_rate DECIMAL(4, 2) NOT NULL DEFAULT 0.10,
  price_with_tax DECIMAL(10, 2) GENERATED ALWAYS AS (price * (1 + tax_rate)) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE product_reviews (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  reviewer_name VARCHAR(80) NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);`;

const SAMPLE_DDL_MYSQL = `CREATE TABLE \`users\` (
  \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(80) NOT NULL,
  \`email\` VARCHAR(120) NOT NULL UNIQUE,
  \`phone\` VARCHAR(30),
  \`status\` ENUM('active', 'pending', 'disabled') NOT NULL DEFAULT 'active',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE \`orders\` (
  \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
  \`user_id\` BIGINT NOT NULL,
  \`order_code\` VARCHAR(40) NOT NULL UNIQUE,
  \`amount\` DECIMAL(12, 2) NOT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`)
);

CREATE TABLE \`order_items\` (
  \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
  \`order_id\` BIGINT NOT NULL,
  \`product_name\` VARCHAR(120) NOT NULL,
  \`quantity\` INT NOT NULL,
  \`unit_price\` DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`)
);`;

const SAMPLE_DDL_H2 = `CREATE TABLE users (
  id IDENTITY PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(30),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE orders (
  id IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL,
  order_code VARCHAR(40) NOT NULL UNIQUE,
  amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
  id IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL,
  product_name VARCHAR(120) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);`;

const SAMPLE_PRESETS: Record<string, string> = {
  basic: SAMPLE_DDL_BASIC,
  schema: SAMPLE_DDL_SCHEMA,
  advanced: SAMPLE_DDL_ADVANCED,
  mysql: SAMPLE_DDL_MYSQL,
  h2: SAMPLE_DDL_H2,
};

const SAMPLE_PRESET_DIALECTS: Record<string, Dialect> = {
  basic: "postgresql",
  schema: "postgresql",
  advanced: "postgresql",
  mysql: "mysql",
  h2: "h2",
};

const SQL_COMPRESS_THRESHOLD_BYTES = 512 * 1024;

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

type OutputTab = "insert" | "rollback";

const DIALECT_LABELS: Record<Dialect, string> = {
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  h2: "H2",
};

export default function GeneratorClient() {
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
      <section className="topbar" aria-label="도구 헤더">
        <div className="brandBlock">
          <div className="brandIcon" aria-hidden="true">
            <Database size={22} />
          </div>
          <div>
            <h1>DDL Seed Generator</h1>
            <p>DDL에서 관계를 읽고 realistic seed SQL을 생성합니다.</p>
          </div>
        </div>
        <div className="topActions">
          <select
            className="sampleSelect"
            defaultValue=""
            onChange={(e) => {
              onLoadPreset(e.target.value);
              e.target.value = "";
            }}
            aria-label="샘플 DDL 불러오기"
          >
            <option value="" disabled>Sample</option>
            <option value="basic">Basic — PostgreSQL</option>
            <option value="schema">Schema + ALTER TABLE — PostgreSQL</option>
            <option value="advanced">GENERATED ALWAYS AS IDENTITY — PostgreSQL</option>
            <option value="mysql">AUTO_INCREMENT + ENUM — MySQL</option>
            <option value="h2">IDENTITY type — H2</option>
          </select>
          <button className="primaryBtn" type="button" disabled={!canAttemptGenerate} onClick={onGenerate}>
            <Sparkles size={17} />
            Generate
          </button>
        </div>
      </section>

      <section className="workspace">
        <aside className="controlPanel" aria-label="생성 옵션">
          <div className="fieldGroup">
            <label htmlFor="inputDialect">Input DDL</label>
            <select
              id="inputDialect"
              className="controlSelect"
              value={inputDialect}
              onChange={(e) => {
                setInputDialect(e.target.value as Dialect);
                setResult(null);
                setCopied(false);
                setError(null);
              }}
            >
              {(Object.keys(DIALECT_LABELS) as Dialect[]).map((item) => (
                <option key={item} value={item}>{DIALECT_LABELS[item]}</option>
              ))}
            </select>
          </div>

          <div className="fieldGroup" style={{ marginTop: 12 }}>
            <label htmlFor="outputDialect">Output DB</label>
            <select
              id="outputDialect"
              className="controlSelect"
              value={dialect}
              onChange={(e) => onChangeDialect(e.target.value as Dialect)}
            >
              {(Object.keys(DIALECT_LABELS) as Dialect[]).map((item) => (
                <option key={item} value={item}>{DIALECT_LABELS[item]}</option>
              ))}
            </select>
          </div>

          <div className="numberGrid">
            <label>
              <span>Rows / table</span>
              <input
                type="number"
                min="1"
                max="10000"
                value={rowCount}
                onChange={(event) => setRowCount(event.target.value)}
              />
            </label>
            <label>
              <span>Seed</span>
              <input type="number" value={seed} onChange={(event) => setSeed(event.target.value)} />
            </label>
          </div>

          <label className="toggleRow">
            <input
              type="checkbox"
              checked={includeBoundaryValues}
              onChange={(event) => setIncludeBoundaryValues(event.target.checked)}
            />
            <span>경계값 포함</span>
          </label>

          <div className="fieldGroup" style={{ marginTop: 12 }}>
            <label htmlFor="dataLocale">Data Locale</label>
            <select
              id="dataLocale"
              className="controlSelect"
              value={locale}
              onChange={(e) => setLocale(e.target.value as DataLocale)}
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="miniStats" aria-label="생성 요약">
            <div>
              <span>Tables</span>
              <strong>{result?.summary.tableCount ?? "-"}</strong>
            </div>
            <div>
              <span>Total rows</span>
              <strong>{result?.summary.totalRows.toLocaleString() ?? "-"}</strong>
            </div>
            <div>
              <span>Insert order</span>
              <strong>{result ? result.analysis.insertOrder.length : "-"}</strong>
            </div>
          </div>

        </aside>

        <section className="editorPanel" aria-label="DDL 입력">
          <div className="panelHead">
            <div>
              <h2>DDL Input</h2>
              <p>CREATE TABLE 또는 ALTER TABLE ... ADD FOREIGN KEY 문을 붙여넣으세요.</p>
            </div>
            <FileCode2 size={20} />
          </div>
          <MonacoDdlEditor
            value={ddl}
            onChange={onChangeDdl}
            issues={ddlValidation.issues}
            dialect={inputDialect}
            tableNames={tableNames}
            columnNames={columnNames}
            onEditorMount={(editorInstance) => { editorRef.current = editorInstance; }}
            hasErrors={ddlValidation.hasErrors}
          />
          <div
            id="ddl-validation"
            className={`validationPanel ${ddlValidation.hasErrors ? "error" : "ok"}`}
            aria-live="polite"
          >
            {ddlValidation.hasErrors ? (
              <>
                <div className="validationTitle">
                  <AlertTriangle size={16} />
                  <strong>DDL 구문 오류 {validationErrors.length}건</strong>
                </div>
                <div className="validationList">
                  {validationErrors.slice(0, 4).map((issue) => (
                    <button
                      key={`${issue.line}-${issue.column}-${issue.message}`}
                      type="button"
                      onClick={() => focusIssue(issue)}
                    >
                      <span>
                        Line {issue.line}, Col {issue.column}
                      </span>
                      <p>{issue.message}</p>
                      {issue.hint ? <small>{issue.hint}</small> : null}
                    </button>
                  ))}
                </div>
              </>
            ) : validationWarnings.length > 0 ? (
              <div className="validationTitle">
                <AlertTriangle size={16} />
                <strong>{validationWarnings[0].message}</strong>
              </div>
            ) : (
              <div className="validationTitle">
                <Check size={16} />
                <strong>DDL syntax looks good</strong>
              </div>
            )}
          </div>
        </section>

        <section className="resultPanel" aria-label="생성 결과">
          <div className="panelHead">
            <div>
              <h2>Output</h2>
              <p>{result ? `${DIALECT_LABELS[dialect]} SQL ready` : "생성 후 결과가 표시됩니다."}</p>
            </div>
            <Network size={20} />
          </div>

          {error ? (
            <div className="alertBox" role="alert">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          ) : null}

          {result ? (
            <>
              <div className="analysisStrip">
                <div>
                  <span>FK cycle</span>
                  <strong>{result.analysis.cycleGroups.length}</strong>
                </div>
                <div>
                  <span>Insert SQL</span>
                  <strong>{result.summary.insertStatements}</strong>
                </div>
                <div>
                  <span>Rollback SQL</span>
                  <strong>{result.summary.rollbackStatements}</strong>
                </div>
              </div>

              {result.analysis.warnings.length > 0 ? (
                <div className="warningList">
                  {result.analysis.warnings.map((warning) => (
                    <div key={warning}>
                      <AlertTriangle size={15} />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="orderBox">
                <span>Insert order</span>
                <p>{result.analysis.insertOrder.join(" -> ")}</p>
              </div>

              <div className="tabs">
                <button
                  type="button"
                  className={activeTab === "insert" ? "selected" : ""}
                  onClick={() => setActiveTab("insert")}
                >
                  Insert
                </button>
                <button
                  type="button"
                  className={activeTab === "rollback" ? "selected" : ""}
                  onClick={() => setActiveTab("rollback")}
                >
                  Rollback
                </button>
                <button className="copyBtn" type="button" onClick={copySql}>
                  {copied ? <Check size={15} /> : <FileCode2 size={15} />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <div className="downloadSplit" ref={downloadMenuRef}>
                  <button
                    className="downloadSplitMain"
                    type="button"
                    disabled={isDownloading}
                    onClick={() => handleDownload(activeTab)}
                  >
                    {isDownloading
                      ? <Loader2 size={15} className="spinIcon" />
                      : <Download size={15} />}
                    Download
                  </button>
                  <button
                    className="downloadSplitChevron"
                    type="button"
                    disabled={isDownloading}
                    aria-label="다운로드 옵션"
                    onClick={() => setDownloadMenuOpen((v) => !v)}
                  >
                    <ChevronDown size={14} />
                  </button>
                  {downloadMenuOpen && (
                    <div className="downloadMenu" role="menu">
                      <button type="button" role="menuitem" onClick={() => handleDownload("insert")}>
                        <Download size={14} />
                        insert.sql
                      </button>
                      <button type="button" role="menuitem" onClick={() => handleDownload("rollback")}>
                        <Download size={14} />
                        rollback.sql
                      </button>
                      <button type="button" role="menuitem" onClick={() => handleDownload("all")}>
                        <FileArchive size={14} />
                        seed.zip (all)
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {downloadInfo && (
                <div className="downloadNotice">
                  <FileArchive size={14} />
                  <span>{downloadInfo}</span>
                </div>
              )}

              <pre className="sqlPreview">{activeSql?.slice(0, 16000)}</pre>
            </>
          ) : (
            <div className="emptyState">
              <Database size={28} />
              <span>DDL을 분석하면 테이블 순서와 SQL 미리보기가 표시됩니다.</span>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
