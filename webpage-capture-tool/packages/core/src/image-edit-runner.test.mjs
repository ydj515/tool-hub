import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it, beforeAll, afterAll } from "vitest";

const require = createRequire(import.meta.url);
const { applyEditRules, processImage } = require("./image-edit-runner");
const sharp = require("sharp");

let tmpDir;
let originalPath;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "img-edit-test-"));
  originalPath = path.join(tmpDir, "original.png");
  // 200×200 회색 PNG 생성
  await sharp({
    create: { width: 200, height: 200, channels: 3, background: { r: 128, g: 128, b: 128 } },
  })
    .png()
    .toFile(originalPath);
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** 테스트마다 originalPath를 fresh 복사본으로 준비한다 */
function freshInput() {
  const p = path.join(tmpDir, `input_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
  fs.copyFileSync(originalPath, p);
  return p;
}

function outputPath() {
  return path.join(tmpDir, `out_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
}

describe("applyEditRules", () => {
  it("빈 rules 배열 + inputPath !== outputPath → 파일이 복사되고 크기 동일", async () => {
    const input = freshInput();
    const out = outputPath();
    const { width, height } = await applyEditRules(input, out, []);
    expect(fs.existsSync(out)).toBe(true);
    expect(width).toBe(200);
    expect(height).toBe(200);
  });

  it("빈 rules 배열 + inputPath === outputPath → 크기 그대로 반환", async () => {
    const input = freshInput();
    const { width, height } = await applyEditRules(input, input, []);
    expect(width).toBe(200);
    expect(height).toBe(200);
  });

  it("blur 규칙 → output 파일 존재, 크기 200×200 유지", async () => {
    const input = freshInput();
    const out = outputPath();
    const { width, height } = await applyEditRules(input, out, [
      { type: "blur", x: 0, y: 0, width: 200, height: 200, sigma: 5 },
    ]);
    expect(fs.existsSync(out)).toBe(true);
    expect(width).toBe(200);
    expect(height).toBe(200);
  });

  it("blur 규칙 → output 바이트가 input과 다르다 (실제로 블러됨)", async () => {
    const input = freshInput();
    const out = outputPath();
    await applyEditRules(input, out, [
      { type: "blur", x: 0, y: 0, width: 200, height: 200, sigma: 5 },
    ]);
    const inBuf = fs.readFileSync(input);
    const outBuf = fs.readFileSync(out);
    expect(inBuf.equals(outBuf)).toBe(false);
  });

  it("box 규칙 → output 파일 존재, 크기 200×200 유지", async () => {
    const input = freshInput();
    const out = outputPath();
    const { width, height } = await applyEditRules(input, out, [
      { type: "box", x: 10, y: 10, width: 50, height: 50, color: "#ff0000" },
    ]);
    expect(fs.existsSync(out)).toBe(true);
    expect(width).toBe(200);
    expect(height).toBe(200);
  });

  it("crop 규칙 { x:0, y:0, width:100, height:80 } → output 크기 100×80", async () => {
    const input = freshInput();
    const out = outputPath();
    const { width, height } = await applyEditRules(input, out, [
      { type: "crop", x: 0, y: 0, width: 100, height: 80 },
    ]);
    expect(width).toBe(100);
    expect(height).toBe(80);
  });

  it("resize 규칙 { width: 100 } → output width는 100, height는 비율 유지 (≤ 100)", async () => {
    const input = freshInput();
    const out = outputPath();
    const { width, height } = await applyEditRules(input, out, [
      { type: "resize", width: 100 },
    ]);
    expect(width).toBe(100);
    expect(height).toBeLessThanOrEqual(100);
  });

  it("in-place blur (inputPath === outputPath) → 정상 동작, output 존재, 크기 200×200", async () => {
    const input = freshInput();
    const { width, height } = await applyEditRules(input, input, [
      { type: "blur", x: 0, y: 0, width: 200, height: 200, sigma: 3 },
    ]);
    expect(fs.existsSync(input)).toBe(true);
    expect(width).toBe(200);
    expect(height).toBe(200);
  });

  it("여러 규칙 (blur + box) → output 존재, 크기 200×200 유지", async () => {
    const input = freshInput();
    const out = outputPath();
    const { width, height } = await applyEditRules(input, out, [
      { type: "blur", x: 0, y: 0, width: 100, height: 100, sigma: 4 },
      { type: "box", x: 110, y: 110, width: 80, height: 80, color: "#000000" },
    ]);
    expect(fs.existsSync(out)).toBe(true);
    expect(width).toBe(200);
    expect(height).toBe(200);
  });
});

describe("processImage", () => {
  it("processImage는 applyEditRules의 alias — blur 규칙 적용 시 정상 반환", async () => {
    const input = freshInput();
    const out = outputPath();
    const result = await processImage(input, out, [
      { type: "blur", x: 0, y: 0, width: 200, height: 200, sigma: 5 },
    ]);
    expect(result).toHaveProperty("width");
    expect(result).toHaveProperty("height");
    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
  });
});
