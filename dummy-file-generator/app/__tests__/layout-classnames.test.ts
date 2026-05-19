import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const generatorClientPath = path.join(projectRoot, "app/_components/generator-client.tsx");
const globalCssPath = path.join(projectRoot, "app/globals.css");

describe("layout class names", () => {
  it("Tailwind container 유틸리티와 충돌하지 않는 전용 레이아웃 클래스를 사용한다", () => {
    const componentSource = fs.readFileSync(generatorClientPath, "utf8");
    const cssSource = fs.readFileSync(globalCssPath, "utf8");

    expect(componentSource).toContain('className="pageShell"');
    expect(cssSource).toContain(".pageShell {");
    expect(cssSource).not.toContain(".container {");
  });
});
