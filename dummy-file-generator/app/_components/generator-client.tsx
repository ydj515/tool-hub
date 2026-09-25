/**
 * 더미 파일 생성기 진입점: 셸과 테마를 소유하고 폼을 조립한다.
 */
"use client";

import { useTheme } from "@/app/_hooks/use-theme";
import { TOOL_HUB_URL } from "@/app/_lib/constants";
import GeneratorForm from "./GeneratorForm";
import { ToolHeader } from "./design-system/ToolHeader";
import { PRODUCT, ProductIcon } from "./design-system/product.generated";

export default function GeneratorClient() {
  const { theme, toggle: toggleTheme, mounted } = useTheme();

  return (
    <main className="pageShell" data-ds-page-shell>
      <ToolHeader
        product={{ ...PRODUCT, icon: ProductIcon }}
        homeHref={TOOL_HUB_URL}
        theme={theme}
        mounted={mounted}
        onThemeToggle={toggleTheme}
      />
      <section className="card">
        <div className="pageIntro">
          <h2>파일 생성</h2>
          <p>원하는 형식과 크기로 테스트 파일을 만듭니다.</p>
        </div>
        <GeneratorForm />
      </section>
    </main>
  );
}
