import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { generateDocx, generateXlsx } from "../ooxml";

const SEED = "test-seed";
// ZIP local file header magic: PK\x03\x04
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

function startsWithZipMagic(buf: Buffer): boolean {
  return buf.subarray(0, 4).equals(ZIP_MAGIC);
}

async function listZipEntries(buf: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(buf);
  return Object.keys(zip.files);
}

// ─── DOCX ───────────────────────────────────────────────────────────────────

describe("generateDocx", () => {
  it("ZIP 매직 바이트(PK\\x03\\x04)로 시작한다", async () => {
    const result = await generateDocx(8192, "at_least", SEED);
    expect(startsWithZipMagic(result.buffer)).toBe(true);
  });

  it("at_least 모드에서 목표 크기 이상을 반환한다", async () => {
    const target = 8192;
    const result = await generateDocx(target, "at_least", SEED);
    expect(result.buffer.length).toBeGreaterThanOrEqual(target);
  });

  it("필수 OOXML 엔트리([Content_Types].xml, _rels/.rels, word/document.xml)를 포함한다", async () => {
    const result = await generateDocx(8192, "at_least", SEED);
    const entries = await listZipEntries(result.buffer);
    expect(entries).toContain("[Content_Types].xml");
    expect(entries).toContain("_rels/.rels");
    expect(entries).toContain("word/document.xml");
  });

  it("word/document.xml이 유효한 XML 구조를 갖는다", async () => {
    const result = await generateDocx(8192, "at_least", SEED);
    const zip = await JSZip.loadAsync(result.buffer);
    const docEntry = zip.file("word/document.xml");
    expect(docEntry, "ZIP 내에 word/document.xml 이 존재하지 않음").not.toBeNull();
    const docXml = await docEntry!.async("string");
    expect(docXml).toContain('xmlns:w=');
    expect(docXml).toContain("<w:body>");
    expect(docXml).toContain(SEED);
  });

  it("큰 크기(64 KiB)에서도 유효한 ZIP 구조를 유지한다", async () => {
    const target = 64 * 1024;
    const result = await generateDocx(target, "at_least", SEED);
    expect(startsWithZipMagic(result.buffer)).toBe(true);
    expect(result.buffer.length).toBeGreaterThanOrEqual(target);
  });

  it("같은 시드는 같은 결과를 생성한다 (결정론적)", async () => {
    const r1 = await generateDocx(8192, "at_least", SEED);
    const r2 = await generateDocx(8192, "at_least", SEED);
    expect(r1.buffer.equals(r2.buffer)).toBe(true);
  });
});

// ─── XLSX ───────────────────────────────────────────────────────────────────

describe("generateXlsx", () => {
  it("ZIP 매직 바이트(PK\\x03\\x04)로 시작한다", async () => {
    const result = await generateXlsx(8192, "at_least", SEED);
    expect(startsWithZipMagic(result.buffer)).toBe(true);
  });

  it("at_least 모드에서 목표 크기 이상을 반환한다", async () => {
    const target = 8192;
    const result = await generateXlsx(target, "at_least", SEED);
    expect(result.buffer.length).toBeGreaterThanOrEqual(target);
  });

  it("필수 OOXML 엔트리([Content_Types].xml, xl/workbook.xml, xl/worksheets/sheet1.xml)를 포함한다", async () => {
    const result = await generateXlsx(8192, "at_least", SEED);
    const entries = await listZipEntries(result.buffer);
    expect(entries).toContain("[Content_Types].xml");
    expect(entries).toContain("xl/workbook.xml");
    expect(entries).toContain("xl/worksheets/sheet1.xml");
  });

  it("sheet1.xml이 유효한 OOXML 스프레드시트 구조를 갖는다", async () => {
    const result = await generateXlsx(8192, "at_least", SEED);
    const zip = await JSZip.loadAsync(result.buffer);
    const sheetEntry = zip.file("xl/worksheets/sheet1.xml");
    expect(sheetEntry, "ZIP 내에 xl/worksheets/sheet1.xml 이 존재하지 않음").not.toBeNull();
    const sheetXml = await sheetEntry!.async("string");
    expect(sheetXml).toContain("<worksheet");
    expect(sheetXml).toContain("<sheetData>");
    expect(sheetXml).toContain(SEED);
  });

  it("큰 크기(64 KiB)에서도 유효한 ZIP 구조를 유지한다", async () => {
    const target = 64 * 1024;
    const result = await generateXlsx(target, "at_least", SEED);
    expect(startsWithZipMagic(result.buffer)).toBe(true);
    expect(result.buffer.length).toBeGreaterThanOrEqual(target);
  });

  it("같은 시드는 같은 결과를 생성한다 (결정론적)", async () => {
    const r1 = await generateXlsx(8192, "at_least", SEED);
    const r2 = await generateXlsx(8192, "at_least", SEED);
    expect(r1.buffer.equals(r2.buffer)).toBe(true);
  });
});
