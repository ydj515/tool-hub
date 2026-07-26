/**
 * 더미 파일 생성기 진입점: 셸과 테마를 소유하고 폼을 조립한다.
 */
"use client";

import { useTheme } from "@/app/_hooks/use-theme";
import { TOOL_HUB_URL } from "@/app/_lib/constants";
import { BrandIcon, MoonIcon, SunIcon } from "./icons";
import GeneratorForm from "./GeneratorForm";

export default function GeneratorClient() {
  const { theme, toggle: toggleTheme, mounted } = useTheme();

  return (
    <main className="pageShell">
      <section className="card">
        <header className="topbar">
          {/* 브랜드 슬롯 — 전체가 허브로 돌아가는 링크다. */}
          <a href={TOOL_HUB_URL} className="brandBlock" aria-label="Tool Hub 로 이동">
            <div className="brandIcon" aria-hidden="true">
              <BrandIcon />
            </div>
            <div>
              <h1>Dummy File Generator</h1>
              <p>테스트 업로드용 더미 파일을 생성합니다.</p>
            </div>
          </a>

          {/* 유틸리티 슬롯 — 테마 토글이 헤더의 마지막 요소다. */}
          <button
            className="ds-icon-btn"
            type="button"
            onClick={toggleTheme}
            aria-label="테마 전환"
            aria-pressed={mounted && theme === "dark"}
          >
            {mounted ? (theme === "dark" ? <SunIcon /> : <MoonIcon />) : <span className="themeIconPlaceholder" />}
          </button>
        </header>

        <GeneratorForm />
      </section>
    </main>
  );
}
