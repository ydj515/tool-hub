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
import { Button } from "@/app/_components/design-system/Button";
import { EmptyState } from "@/app/_components/design-system/EmptyState";

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
        title="출력"
        description={result ? `${DIALECT_LABELS[dialect]} SQL 준비 완료` : "생성 후 결과가 표시됩니다."}
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
            <Stat label="FK 순환" value={result.analysis.cycleGroups.length} />
            <Stat label="INSERT SQL" value={result.summary.insertStatements} />
            <Stat label="ROLLBACK SQL" value={result.summary.rollbackStatements} />
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
            <span>삽입 순서</span>
            <p>{result.analysis.insertOrder.join(" -> ")}</p>
          </div>

          <div className="tabs" role="tablist" aria-label="SQL 출력 종류">
            <button
              id="insert-tab"
              type="button"
              role="tab"
              aria-selected={activeTab === "insert"}
              aria-controls="sql-output-panel"
              className={activeTab === "insert" ? "selected" : ""}
              onClick={() => onActiveTabChange("insert")}
            >
              INSERT
            </button>
            <button
              id="rollback-tab"
              type="button"
              role="tab"
              aria-selected={activeTab === "rollback"}
              aria-controls="sql-output-panel"
              className={activeTab === "rollback" ? "selected" : ""}
              onClick={() => onActiveTabChange("rollback")}
            >
              ROLLBACK
            </button>
            <Button className="copyBtn" onClick={onCopy}>
              {copied
                ? <Check size={16} strokeWidth={2} />
                : <FileCode2 size={16} strokeWidth={2} />}
              {copied ? "복사됨" : "복사"}
            </Button>
            <div className="downloadSplit" ref={downloadMenuRef}>
              <Button
                className="downloadSplitMain"
                disabled={isDownloading}
                onClick={() => onDownload(activeTab)}
              >
                {isDownloading
                  ? <Loader2 size={16} strokeWidth={2} className="spinIcon" />
                  : <Download size={16} strokeWidth={2} />}
                다운로드
              </Button>
              <Button
                className="downloadSplitChevron"
                disabled={isDownloading}
                aria-label="다운로드 옵션"
                onClick={onToggleDownloadMenu}
              >
                <ChevronDown size={16} strokeWidth={2} />
              </Button>
              {downloadMenuOpen && (
                <div className="downloadMenu" role="menu">
                  <Button role="menuitem" onClick={() => onDownload("insert")}>
                    <Download size={16} strokeWidth={2} />
                    insert.sql
                  </Button>
                  <Button role="menuitem" onClick={() => onDownload("rollback")}>
                    <Download size={16} strokeWidth={2} />
                    rollback.sql
                  </Button>
                  <Button role="menuitem" onClick={() => onDownload("all")}>
                    <FileArchive size={16} strokeWidth={2} />
                    seed.zip (전체)
                  </Button>
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

          <pre
            id="sql-output-panel"
            role="tabpanel"
            aria-labelledby={`${activeTab}-tab`}
            className="sqlPreview"
          >
            {activeSql?.slice(0, 16000)}
          </pre>
        </>
      ) : (
        <EmptyState
          icon={<Database size={16} strokeWidth={2} />}
          title="DDL을 분석하면 테이블 순서와 SQL 미리보기가 표시됩니다."
        />
      )}
    </section>
  );
}
