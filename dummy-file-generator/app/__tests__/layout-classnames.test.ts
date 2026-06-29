import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const generatorClientPath = path.join(projectRoot, "app/_components/generator-client.tsx");
// 레이아웃 클래스는 globals.css에서 styles/components.css로 분리됨
const layoutCssPath = path.join(projectRoot, "app/styles/components.css");

describe("layout class names", () => {
  it("Tailwind container 유틸리티와 충돌하지 않는 전용 레이아웃 클래스를 사용한다", () => {
    const componentSource = fs.readFileSync(generatorClientPath, "utf8");
    const cssSource = fs.readFileSync(layoutCssPath, "utf8");

    expect(componentSource).toContain('className="pageShell"');
    expect(cssSource).toContain(".pageShell {");
    expect(cssSource).not.toContain(".container {");
  });
});
