import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const generatorClientPath = path.join(projectRoot, "app/_components/generator-client.tsx");
// 레이아웃 클래스는 globals.css에서 styles/components.css로 분리됨
const layoutCssPath = path.join(projectRoot, "app/styles/components.css");
const constantsPath = path.join(projectRoot, "app/_lib/constants.ts");

describe("layout class names", () => {
  it("Tailwind container 유틸리티와 충돌하지 않는 전용 레이아웃 클래스를 사용한다", () => {
    const componentSource = fs.readFileSync(generatorClientPath, "utf8");
    const cssSource = fs.readFileSync(layoutCssPath, "utf8");

    expect(componentSource).toContain('className="pageShell"');
    expect(cssSource).toContain(".pageShell {");
    expect(cssSource).not.toContain(".container {");
  });
});

/**
 * 이 앱은 vitest 가 environment: node 이고 jsdom 이 없어 DOM 렌더 테스트를
 * 쓸 수 없다. 위 테스트와 같은 소스 텍스트 단정 방식을 따른다.
 */
describe("shell contract", () => {
  it("브랜드 블록이 Tool Hub 로 돌아가는 링크다", () => {
    const constantsSource = fs.readFileSync(constantsPath, "utf8");
    const componentSource = fs.readFileSync(generatorClientPath, "utf8");

    expect(constantsSource).toContain('"https://tool-hub-rho.vercel.app/"');
    expect(componentSource).toContain("href={TOOL_HUB_URL}");
  });

  it("테마 토글이 헤더 안에 있고 정본 프리미티브를 쓴다", () => {
    const componentSource = fs.readFileSync(generatorClientPath, "utf8");
    const cssSource = fs.readFileSync(layoutCssPath, "utf8");

    expect(componentSource).toContain('className="ds-icon-btn"');
    // 화면에 떠 있던 고정 위치 토글은 헤더 유틸리티 슬롯으로 이동했다
    expect(componentSource).not.toContain("globalThemeBtn");
    expect(cssSource).not.toContain(".globalThemeBtn");
  });
});
