import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { toggleTheme } = vi.hoisted(() => ({ toggleTheme: vi.fn() }));

vi.mock("@/app/_hooks/use-theme", () => ({
  useTheme: () => ({ theme: "light" as const, mounted: true, toggle: toggleTheme }),
}));

import GeneratorClient from "./generator-client";

describe("GeneratorClient", () => {
  it("공통 셸과 한국어 생성 폼을 실제 마크업으로 렌더한다", () => {
    const html = renderToStaticMarkup(<GeneratorClient />);

    expect(html).toContain('data-ds-page-shell="true"');
    expect(html).toContain('data-ds-tool-header="true"');
    expect(html).toContain("<h1>Dummy File Generator</h1>");
    expect(html.match(/<h1>/g)).toHaveLength(1);
    expect(html).toContain("파일 형식");
    expect(html).toContain("목표 크기 (MiB)");
    expect(html).toContain("1 MiB = 1,048,576 B");
    expect(html).toContain("파일 생성");

    for (const englishCopy of [
      "File Format",
      "ZIP Structure",
      "Extension Profile",
      "Target Size (MiB)",
      "Generate File",
    ]) {
      expect(html).not.toContain(englishCopy);
    }
  });

  it("파일 형식 카드는 aria-pressed 선택 상태와 Lucide 16px 아이콘을 렌더한다", () => {
    const html = renderToStaticMarkup(<GeneratorClient />);
    const svgTags = html.match(/<svg\b[^>]*>/g) ?? [];

    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(7);
    expect(svgTags.length).toBeGreaterThan(0);
    for (const svg of svgTags) {
      expect(svg).toContain('class="lucide');
      expect(svg).toContain('width="16"');
      expect(svg).toContain('height="16"');
      expect(svg).toContain('stroke-width="2"');
    }
  });
});
