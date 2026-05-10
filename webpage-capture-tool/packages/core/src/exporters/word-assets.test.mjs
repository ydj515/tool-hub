import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const JSZip = require("jszip");
const { exportWordAssets } = require("./word-assets");

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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "word-export-test-"));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("exportWordAssets", () => {
  it("실제 docx 파일과 자산 패키지를 함께 생성한다", async () => {
    const sourceA = path.join(tmpDir, "source-a.png");
    const sourceB = path.join(tmpDir, "source-b.png");
    const outputDir = path.join(tmpDir, "word-output");

    await createImage(sourceA, 1600, 900, "#1769aa");
    await createImage(sourceB, 1200, 1400, "#f59e0b");

    const result = await exportWordAssets([
      { slug: "login", title: "로그인 화면", caption: "로그인 버튼을 누릅니다.", imagePath: sourceA },
      { slug: "audit", title: "검수 이력", caption: "검수 결과를 확인합니다.", imagePath: sourceB }
    ], outputDir);

    expect(result.count).toBe(2);
    expect(result.documentFile).toBe("manual.docx");
    expect(fs.existsSync(result.documentPath)).toBe(true);
    const docxBuffer = fs.readFileSync(result.documentPath);
    expect(docxBuffer.subarray(0, 2).toString()).toBe("PK");
    expect(fs.existsSync(path.join(outputDir, "captions.csv"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "manifest.json"))).toBe(true);
    expect(fs.readdirSync(path.join(outputDir, "images")).filter((name) => name.endsWith(".png"))).toHaveLength(2);

    const manifest = JSON.parse(fs.readFileSync(path.join(outputDir, "manifest.json"), "utf8"));
    expect(manifest.channel).toBe("word");
    expect(manifest.documentPath).toBe("./manual.docx");
    expect(manifest.items).toHaveLength(2);

    const captions = fs.readFileSync(path.join(outputDir, "captions.csv"), "utf8");
    expect(captions).toContain("로그인 화면");
    expect(captions).toContain("검수 이력");

    const zip = await JSZip.loadAsync(docxBuffer);
    const documentXml = await zip.file("word/document.xml").async("string");
    const headerXml = await zip.file("word/header1.xml").async("string");
    const footerXml = await zip.file("word/footer1.xml").async("string");

    expect(documentXml).toContain("사용 설명서 캡처 문서");
    expect(documentXml).toContain("TOC");
    expect(documentXml).toContain("로그인 화면");
    expect(headerXml).toContain("MANUAL CAPTURE WORKBENCH");
    expect(footerXml).toContain("TOOL HUB DOCUMENT TEMPLATE");
  });
});
