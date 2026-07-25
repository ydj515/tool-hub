/**
 * 상단 바: 앱 마크 + 타이틀 + 모드 전환(SegmentedTabs) + 테마 토글.
 * 테마·모드 상태는 페이지가 소유하고 props로 주입한다.
 */
import { PenTool, Image as ImageIcon, Moon, Sun, Pencil } from "lucide-react";
import SegmentedTabs from "../ui/SegmentedTabs";
import { TOOL_HUB_URL } from "../../constants";

interface HeaderProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  activeTab: "draw" | "upload";
  onTabChange: (tab: "draw" | "upload") => void;
}

export default function Header({ theme, onToggleTheme, activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="ds-card ds-shell flex items-center gap-3 mb-5 px-5 py-4">
      {/* 브랜드 슬롯 — 전체가 허브로 돌아가는 링크다. */}
      <a
        href={TOOL_HUB_URL}
        className="flex items-center gap-3 flex-1 min-w-0 no-underline"
        aria-label="Tool Hub 로 이동"
      >
        <div className="app-mark w-10 h-10 rounded-md grid place-items-center shrink-0">
          <Pencil size={18} />
        </div>
        <div className="min-w-0">
          <h1 className="app-title text-title font-bold">
            Signature &amp; Trace Studio
          </h1>
          <p className="app-subtitle text-body mt-0.5">
            서명을 직접 그리거나 이미지에서 추출해요.
          </p>
        </div>
      </a>

      {/* Tab switcher — segmented control */}
      <SegmentedTabs
        value={activeTab}
        onChange={onTabChange}
        options={[
          { value: "draw", label: "Draw", icon: <PenTool size={14} /> },
          { value: "upload", label: "Upload", icon: <ImageIcon size={14} /> },
        ]}
      />

      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        aria-label="테마 전환"
        className="ds-icon-btn"
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </header>
  );
}
