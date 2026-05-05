import { describe, it, expect } from "vitest";
import { generatePdf } from "../pdf";

const SEED = "test-seed";
const PDF_MAGIC = Buffer.from("%PDF-", "ascii");

function startsWithPdfMagic(buf: Buffer): boolean {
  return buf.subarray(0, 5).equals(PDF_MAGIC);
}

function containsEof(buf: Buffer): boolean {
  return buf.toString("ascii").includes("%%EOF");
}

describe("generatePdf", () => {
  it("PDF 매직 바이트(%PDF-)로 시작한다", () => {
    const result = generatePdf(4096, "exact", SEED);
    expect(startsWithPdfMagic(result.buffer)).toBe(true);
  });

  it("%%EOF 마커를 포함한다", () => {
    const result = generatePdf(4096, "exact", SEED);
    expect(containsEof(result.buffer)).toBe(true);
  });

  it("xref 및 trailer 섹션을 포함한다", () => {
    const result = generatePdf(4096, "exact", SEED);
    const text = result.buffer.toString("ascii");
    expect(text).toContain("xref");
    expect(text).toContain("trailer");
    expect(text).toContain("startxref");
  });

  it("exact 모드에서 목표 크기에 도달하거나 근접한 크기를 반환한다", () => {
    const target = 16 * 1024;
    const result = generatePdf(target, "exact", SEED);
    // 반복 이터레이션으로 조절하지만 fallback 가능 → ±1% 허용
    expect(result.buffer.length).toBeGreaterThanOrEqual(target * 0.99);
    expect(result.buffer.length).toBeLessThanOrEqual(target * 1.01);
  });

  it("at_least 모드에서 목표 크기 이상을 반환한다", () => {
    const target = 16 * 1024;
    const result = generatePdf(target, "at_least", SEED);
    expect(result.buffer.length).toBeGreaterThanOrEqual(target);
  });

  it("큰 크기(64 KiB)에서도 유효한 PDF 구조를 유지한다", () => {
    const target = 64 * 1024;
    const result = generatePdf(target, "exact", SEED);
    expect(startsWithPdfMagic(result.buffer)).toBe(true);
    expect(containsEof(result.buffer)).toBe(true);
  });

  it("같은 시드는 같은 결과를 생성한다 (결정론적)", () => {
    const r1 = generatePdf(4096, "exact", SEED);
    const r2 = generatePdf(4096, "exact", SEED);
    expect(r1.buffer.equals(r2.buffer)).toBe(true);
  });
});
