import { ArrowLeftRight, FileSearch, Loader2, Moon, RotateCcw, Sun } from "lucide-react";

/**
 * 상단 바: 브랜드 + 초기화 + 비교 + 테마 토글.
 * 페이지 액션을 품으므로 root layout이 아니라 페이지가 렌더한다.
 */
interface TopbarProps {
  isComparing: boolean;
  hasParseError: boolean;
  onReset: () => void;
  onCompare: () => void;
  theme: "light" | "dark";
  mounted: boolean;
  onToggleTheme: () => void;
}

export default function Topbar({
  isComparing,
  hasParseError,
  onReset,
  onCompare,
  theme,
  mounted,
  onToggleTheme,
}: TopbarProps) {
  return (
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
        <button className="secondaryBtn" onClick={onReset}>
          <RotateCcw size={14} />
          초기화
        </button>
        <button
          className="primaryBtn"
          onClick={onCompare}
          disabled={isComparing || hasParseError}
          title={hasParseError ? "파싱 오류를 먼저 수정하세요." : undefined}
        >
          {isComparing ? <Loader2 size={15} className="spinning" /> : <ArrowLeftRight size={15} />}
          비교
        </button>
        <button className="themeBtn" type="button" onClick={onToggleTheme} aria-label="테마 전환">
          {mounted ? (theme === "dark" ? <Sun size={16} /> : <Moon size={16} />) : <span className="themeIconPlaceholder" />}
        </button>
      </div>
    </header>
  );
}
