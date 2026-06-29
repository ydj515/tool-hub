/**
 * 더미 파일 생성기 진입점: 셸과 테마를 소유하고 폼을 조립한다.
 */
"use client";

import { useTheme } from "@/app/_hooks/use-theme";
import { BrandIcon, MoonIcon, SunIcon } from "./icons";
import GeneratorForm from "./GeneratorForm";

export default function GeneratorClient() {
  const { theme, toggle: toggleTheme, mounted } = useTheme();

  return (
    <main className="pageShell">
      <button
        className="globalThemeBtn"
        type="button"
        onClick={toggleTheme}
        aria-label="테마 전환"
        aria-pressed={mounted && theme === "dark"}
      >
        {mounted ? (theme === "dark" ? <SunIcon /> : <MoonIcon />) : <span className="themeIconPlaceholder" />}
      </button>

      <section className="card">
        <header className="topbar">
          <div className="brandIcon">
            <BrandIcon />
          </div>
          <div>
            <h1>Dummy File Generator</h1>
            <p>테스트 업로드용 더미 파일을 생성합니다.</p>
          </div>
        </header>

        <GeneratorForm />
      </section>
    </main>
  );
}
