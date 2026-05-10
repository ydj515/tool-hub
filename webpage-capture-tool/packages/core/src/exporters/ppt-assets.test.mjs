import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const JSZip = require("jszip");
const { exportPptAssets } = require("./ppt-assets");

let tmpDir;

async function createImage(filePath, width, height, background) {
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background
    }
  }).png().toFile(filePath);
}

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ppt-export-test-"));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("exportPptAssets", () => {
  it("실제 pptx 파일과 자산 패키지를 함께 생성한다", async () => {
    const sourceA = path.join(tmpDir, "source-a.png");
    const sourceB = path.join(tmpDir, "source-b.png");
    const outputDir = path.join(tmpDir, "ppt-output");

    await createImage(sourceA, 1920, 1080, "#17324d");
    await createImage(sourceB, 1400, 1200, "#22c55e");

    const result = await exportPptAssets([
      { slug: "dashboard", title: "대시보드", caption: "요약 현황입니다.", speakerNote: "발표 시 주요 수치를 먼저 설명합니다.", imagePath: sourceA },
      { slug: "detail", title: "상세 화면", caption: "세부 내역입니다.", imagePath: sourceB }
    ], outputDir);

    expect(result.count).toBe(2);
    expect(result.presentationFile).toBe("slides.pptx");
    expect(fs.existsSync(result.presentationPath)).toBe(true);
    const pptxBuffer = fs.readFileSync(result.presentationPath);
    expect(pptxBuffer.subarray(0, 2).toString()).toBe("PK");
    expect(fs.existsSync(path.join(outputDir, "slides.csv"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "manifest.json"))).toBe(true);
    expect(fs.readdirSync(path.join(outputDir, "images")).filter((name) => name.endsWith(".png"))).toHaveLength(2);

    const manifest = JSON.parse(fs.readFileSync(path.join(outputDir, "manifest.json"), "utf8"));
    expect(manifest.channel).toBe("ppt");
    expect(manifest.presentationPath).toBe("./slides.pptx");
    expect(manifest.slideCount).toBe(6);
    expect(manifest.template).toBe("tool-hub-corporate-blue-v2");
    expect(manifest.items).toHaveLength(2);

    const slidesCsv = fs.readFileSync(path.join(outputDir, "slides.csv"), "utf8");
    expect(slidesCsv).toContain("대시보드");
    expect(slidesCsv).toContain("발표 시 주요 수치를 먼저 설명합니다.");

    const zip = await JSZip.loadAsync(pptxBuffer);
    const slideXmls = await Promise.all(
      Object.keys(zip.files)
        .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map((name) => zip.file(name).async("string"))
    );
    const notesXmls = await Promise.all(
      Object.keys(zip.files)
        .filter((name) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map((name) => zip.file(name).async("string"))
    );

    expect(slideXmls).toHaveLength(6);
    expect(slideXmls.join("\n")).toContain("Manual Capture Workbench");
    expect(slideXmls.join("\n")).toContain("문서 개요");
    expect(slideXmls.join("\n")).toContain("대시보드");
    expect(slideXmls.join("\n")).toContain("상세 화면");
    expect(notesXmls.join("\n")).toContain("발표 시 주요 수치를 먼저 설명합니다.");
  });
});
