/**
 * 상단 바: 앱 마크 + 타이틀 + 모드 전환(SegmentedTabs) + 테마 토글.
 * 테마·모드 상태는 페이지가 소유하고 props로 주입한다.
 */
import { PenTool, Image as ImageIcon, Moon, Sun, Pencil } from "lucide-react";
import SegmentedTabs from "../ui/SegmentedTabs";

interface HeaderProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  activeTab: "draw" | "upload";
  onTabChange: (tab: "draw" | "upload") => void;
}

export default function Header({ theme, onToggleTheme, activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="ds-card flex items-center gap-3 max-w-[1400px] mx-auto mb-5 px-5 py-4">
      <div className="app-mark w-10 h-10 rounded-xl grid place-items-center shrink-0">
        <Pencil size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="app-title text-xl font-bold leading-tight">
          Signature &amp; Trace Studio
        </h1>
        <p className="app-subtitle text-sm mt-0.5">
          서명을 직접 그리거나 이미지에서 추출해요.
        </p>
      </div>

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
        className="btn-icon w-9 h-9 grid place-items-center shrink-0"
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </header>
  );
}
