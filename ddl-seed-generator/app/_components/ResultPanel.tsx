import type { RefObject } from "react";
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
} from "lucide-react";
import type { Dialect, GeneratedSql } from "@/lib/types";
import { DIALECT_LABELS } from "@/app/_lib/samples";
import PanelHead from "@/app/_components/ui/PanelHead";
import Stat from "@/app/_components/ui/Stat";

/**
 * 우측 결과 패널: 분석 요약 + 경고 + insert order + Insert/Rollback 탭 + 복사/다운로드 + SQL 미리보기.
 */
type OutputTab = "insert" | "rollback";

interface ResultPanelProps {
  result: GeneratedSql | null;
  error: string | null;
  dialect: Dialect;
  activeTab: OutputTab;
  onActiveTabChange: (tab: OutputTab) => void;
  activeSql: string | undefined;
  copied: boolean;
  onCopy: () => void;
  isDownloading: boolean;
  downloadMenuOpen: boolean;
  onToggleDownloadMenu: () => void;
  onDownload: (target: "insert" | "rollback" | "all") => void;
  downloadInfo: string | null;
  downloadMenuRef: RefObject<HTMLDivElement | null>;
}

export default function ResultPanel({
  result,
  error,
  dialect,
  activeTab,
  onActiveTabChange,
  activeSql,
  copied,
  onCopy,
  isDownloading,
  downloadMenuOpen,
  onToggleDownloadMenu,
  onDownload,
  downloadInfo,
  downloadMenuRef,
}: ResultPanelProps) {
  return (
    <section className="resultPanel" aria-label="생성 결과">
      <PanelHead
        title="Output"
        description={result ? `${DIALECT_LABELS[dialect]} SQL ready` : "생성 후 결과가 표시됩니다."}
        icon={<Network size={20} />}
      />

      {error ? (
        <div className="alertBox" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      {result ? (
        <>
          <div className="analysisStrip">
            <Stat label="FK cycle" value={result.analysis.cycleGroups.length} />
            <Stat label="Insert SQL" value={result.summary.insertStatements} />
            <Stat label="Rollback SQL" value={result.summary.rollbackStatements} />
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
              onClick={() => onActiveTabChange("insert")}
            >
              Insert
            </button>
            <button
              type="button"
              className={activeTab === "rollback" ? "selected" : ""}
              onClick={() => onActiveTabChange("rollback")}
            >
              Rollback
            </button>
            <button className="copyBtn" type="button" onClick={onCopy}>
              {copied ? <Check size={15} /> : <FileCode2 size={15} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <div className="downloadSplit" ref={downloadMenuRef}>
              <button
                className="downloadSplitMain"
                type="button"
                disabled={isDownloading}
                onClick={() => onDownload(activeTab)}
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
                onClick={onToggleDownloadMenu}
              >
                <ChevronDown size={14} />
              </button>
              {downloadMenuOpen && (
                <div className="downloadMenu" role="menu">
                  <button type="button" role="menuitem" onClick={() => onDownload("insert")}>
                    <Download size={14} />
                    insert.sql
                  </button>
                  <button type="button" role="menuitem" onClick={() => onDownload("rollback")}>
                    <Download size={14} />
                    rollback.sql
                  </button>
                  <button type="button" role="menuitem" onClick={() => onDownload("all")}>
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
  );
}
