import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { generateZip } from "../basic";

const SEED = "test-seed";
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

function startsWithZipMagic(buf: Buffer): boolean {
  return buf.subarray(0, 4).equals(ZIP_MAGIC);
}

async function listZipEntries(buf: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(buf);
  return Object.keys(zip.files);
}

// ─── ZIP flat ───────────────────────────────────────────────────────────────

describe("generateZip (flat)", () => {
  it("ZIP 매직 바이트(PK\\x03\\x04)로 시작한다", async () => {
    const result = await generateZip(8192, "at_least", SEED, "flat");
    expect(startsWithZipMagic(result.buffer)).toBe(true);
  });

  it("at_least 모드에서 목표 크기 이상을 반환한다", async () => {
    const target = 8192;
    const result = await generateZip(target, "at_least", SEED, "flat");
    expect(result.buffer.length).toBeGreaterThanOrEqual(target);
  });

  it("flat 구조에서 README.txt, data.bin, padding.bin을 포함한다", async () => {
    const result = await generateZip(8192, "at_least", SEED, "flat");
    const entries = await listZipEntries(result.buffer);
    expect(entries).toContain("README.txt");
    expect(entries).toContain("data.bin");
    expect(entries).toContain("padding.bin");
  });

  it("flat 구조에서 서브 디렉토리를 포함하지 않는다", async () => {
    const result = await generateZip(8192, "at_least", SEED, "flat");
    const entries = await listZipEntries(result.buffer);
    const hasSubdir = entries.some((e) => e.includes("/"));
    expect(hasSubdir).toBe(false);
  });

  it("큰 크기(64 KiB)에서도 유효한 ZIP 구조를 유지한다", async () => {
    const target = 64 * 1024;
    const result = await generateZip(target, "at_least", SEED, "flat");
    expect(startsWithZipMagic(result.buffer)).toBe(true);
    expect(result.buffer.length).toBeGreaterThanOrEqual(target);
  });
});

// ─── ZIP hierarchy ──────────────────────────────────────────────────────────

describe("generateZip (hierarchy / mixed)", () => {
  it("ZIP 매직 바이트(PK\\x03\\x04)로 시작한다", async () => {
    const result = await generateZip(8192, "at_least", SEED, "hierarchy", "mixed");
    expect(startsWithZipMagic(result.buffer)).toBe(true);
  });

  it("at_least 모드에서 목표 크기 이상을 반환한다", async () => {
    const target = 8192;
    const result = await generateZip(target, "at_least", SEED, "hierarchy", "mixed");
    expect(result.buffer.length).toBeGreaterThanOrEqual(target);
  });

  it("hierarchy/mixed 구조에서 2depth 중첩 경로를 포함한다", async () => {
    const result = await generateZip(8192, "at_least", SEED, "hierarchy", "mixed");
    const entries = await listZipEntries(result.buffer);
    const hasLevel2 = entries.some((e) => e.startsWith("level1/level2/"));
    expect(hasLevel2).toBe(true);
  });

  it("hierarchy/text 구조에서 텍스트 파일만 포함한다", async () => {
    const result = await generateZip(8192, "at_least", SEED, "hierarchy", "text");
    const entries = await listZipEntries(result.buffer).then((e) => e.filter((f) => !f.endsWith("/")));
    const hasNonText = entries.some((e) => !e.endsWith(".txt") && !e.endsWith(".md"));
    expect(hasNonText).toBe(false);
  });

  it("hierarchy/binary 구조에서 바이너리 파일만 포함한다", async () => {
    const result = await generateZip(8192, "at_least", SEED, "hierarchy", "binary");
    const entries = await listZipEntries(result.buffer).then((e) => e.filter((f) => !f.endsWith("/")));
    const hasNonBin = entries.some((e) => !e.endsWith(".bin") && !e.endsWith(".dat"));
    expect(hasNonBin).toBe(false);
  });

  it("같은 시드는 같은 결과를 생성한다 (결정론적)", async () => {
    const r1 = await generateZip(8192, "at_least", SEED, "hierarchy", "mixed");
    const r2 = await generateZip(8192, "at_least", SEED, "hierarchy", "mixed");
    expect(r1.buffer.equals(r2.buffer)).toBe(true);
  });
});
