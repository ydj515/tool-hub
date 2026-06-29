import { Database, Moon, Sparkles, Sun } from "lucide-react";

/**
 * 상단 바: 브랜드 + 샘플 불러오기 + Generate + 테마 토글.
 * 페이지 액션을 품으므로 root layout이 아니라 페이지가 렌더한다.
 */
interface TopbarProps {
  canGenerate: boolean;
  onGenerate: () => void;
  onLoadPreset: (presetKey: string) => void;
  theme: "light" | "dark";
  mounted: boolean;
  onToggleTheme: () => void;
}

export default function Topbar({
  canGenerate,
  onGenerate,
  onLoadPreset,
  theme,
  mounted,
  onToggleTheme,
}: TopbarProps) {
  return (
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
        <button className="primaryBtn" type="button" disabled={!canGenerate} onClick={onGenerate}>
          <Sparkles size={17} />
          Generate
        </button>
        <button className="themeBtn" type="button" onClick={onToggleTheme} aria-label="테마 전환">
          {mounted ? (theme === "dark" ? <Sun size={16} /> : <Moon size={16} />) : <span className="themeIconPlaceholder" />}
        </button>
      </div>
    </section>
  );
}
