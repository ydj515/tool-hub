import { describe, it, expect } from "vitest";
import { generateTxt, generateCsv, generateJson, generateBin } from "../basic";

const SEED = "test-seed";

// ─── TXT ────────────────────────────────────────────────────────────────────

describe("generateTxt", () => {
  it("exact 모드에서 지정 크기를 정확히 맞춘다", () => {
    const result = generateTxt(1024, "exact", SEED);
    expect(result.buffer.length).toBe(1024);
    expect(result.modeApplied).toBe("exact");
  });

  it("at_least 모드에서 목표 크기 이상을 반환한다", () => {
    const result = generateTxt(1024, "at_least", SEED);
    expect(result.buffer.length).toBeGreaterThanOrEqual(1024);
  });

  it("헤더에 파일 제목, seed, 생성 시각을 포함한다", () => {
    const result = generateTxt(512, "at_least", SEED);
    const text = result.buffer.toString("utf-8");
    expect(text).toContain("Dummy text file");
    expect(text).toContain(`seed: ${SEED}`);
    expect(text).toContain("created:");
    expect(text).toContain("---");
  });

  it("충분한 크기에서 Lorem ipsum 본문이 여러 줄로 구성된다", () => {
    const result = generateTxt(1024, "at_least", SEED);
    const lines = result.buffer.toString("utf-8").split("\n");
    // 헤더 4줄(제목/seed/created/---) + Lorem ipsum 본문 최소 1줄
    expect(lines.length).toBeGreaterThan(5);
  });

  it("Lorem ipsum 본문을 포함한다", () => {
    const result = generateTxt(512, "at_least", SEED);
    const text = result.buffer.toString("utf-8");
    expect(text).toContain("Lorem ipsum");
  });

  it("큰 크기(64 KiB)에서도 exact 크기를 맞춘다", () => {
    const result = generateTxt(64 * 1024, "exact", SEED);
    expect(result.buffer.length).toBe(64 * 1024);
  });
});

// ─── CSV ────────────────────────────────────────────────────────────────────

describe("generateCsv", () => {
  it("exact 모드에서 지정 크기를 정확히 맞춘다", () => {
    const result = generateCsv(1024, "exact", SEED);
    expect(result.buffer.length).toBe(1024);
    expect(result.modeApplied).toBe("exact");
  });

  it("at_least 모드에서 목표 크기 이상을 반환한다", () => {
    const result = generateCsv(1024, "at_least", SEED);
    expect(result.buffer.length).toBeGreaterThanOrEqual(1024);
  });

  it("첫 줄이 id,name,value 헤더다", () => {
    const result = generateCsv(1024, "at_least", SEED);
    const firstLine = result.buffer.toString("utf-8").split("\n")[0];
    expect(firstLine).toBe("id,name,value");
  });

  it("모든 행이 정확히 3개 컬럼을 가진다", () => {
    const result = generateCsv(4096, "at_least", SEED);
    const lines = result.buffer.toString("utf-8").split("\n").filter((l) => l.length > 0);
    for (const line of lines) {
      expect(line.split(",").length).toBe(3);
    }
  });

  it("충분한 크기에서 여러 데이터 행을 생성한다", () => {
    const result = generateCsv(1024 * 100, "at_least", SEED);
    const lines = result.buffer.toString("utf-8").split("\n").filter((l) => l.length > 0);
    // 헤더 1줄 + 데이터 행 최소 2줄
    expect(lines.length).toBeGreaterThan(2);
  });

  it("행 인덱스가 순차적으로 증가한다", () => {
    const result = generateCsv(1024 * 100, "at_least", SEED);
    const lines = result.buffer.toString("utf-8").split("\n").filter((l) => l.length > 0);
    // 헤더 제외한 데이터 행들
    const dataLines = lines.slice(1);
    dataLines.forEach((line, i) => {
      const id = parseInt(line.split(",")[0], 10);
      expect(id).toBe(i + 1);
    });
  });

  it("큰 크기(64 KiB)에서도 exact 크기를 맞추고 CSV 구조를 유지한다", () => {
    const target = 64 * 1024;
    const result = generateCsv(target, "exact", SEED);
    expect(result.buffer.length).toBe(target);
    const lines = result.buffer.toString("utf-8").split("\n").filter((l) => l.length > 0);
    for (const line of lines) {
      expect(line.split(",").length).toBe(3);
    }
  });
});

// ─── JSON ────────────────────────────────────────────────────────────────────

describe("generateJson", () => {
  it("exact 모드에서 지정 크기를 정확히 맞춘다", () => {
    const result = generateJson(1024, "exact", SEED);
    expect(result.buffer.length).toBe(1024);
    expect(result.modeApplied).toBe("exact");
  });

  it("at_least 모드에서 목표 크기 이상을 반환한다", () => {
    const result = generateJson(1024, "at_least", SEED);
    expect(result.buffer.length).toBeGreaterThanOrEqual(1024);
  });

  it("유효한 JSON으로 파싱된다", () => {
    const result = generateJson(1024, "exact", SEED);
    expect(() => JSON.parse(result.buffer.toString("utf-8"))).not.toThrow();
  });

  it("필수 필드(seed, createdAt, items)를 포함한다", () => {
    const result = generateJson(1024, "exact", SEED);
    const parsed = JSON.parse(result.buffer.toString("utf-8"));
    expect(parsed).toHaveProperty("seed", SEED);
    expect(parsed).toHaveProperty("createdAt");
    expect(Array.isArray(parsed.items)).toBe(true);
  });

  it("items 배열의 각 요소가 id, name, value 필드를 가진다", () => {
    const result = generateJson(4096, "exact", SEED);
    const parsed = JSON.parse(result.buffer.toString("utf-8"));
    expect(parsed.items.length).toBeGreaterThan(0);
    for (const item of parsed.items) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("value");
    }
  });

  it("충분한 크기에서 items 배열에 여러 요소가 생성된다", () => {
    const result = generateJson(1024 * 100, "at_least", SEED);
    const parsed = JSON.parse(result.buffer.toString("utf-8"));
    expect(parsed.items.length).toBeGreaterThan(1);
  });

  it("items 요소의 id가 순차적으로 증가한다", () => {
    const result = generateJson(1024 * 100, "at_least", SEED);
    const parsed = JSON.parse(result.buffer.toString("utf-8"));
    parsed.items.forEach((item: { id: number }, i: number) => {
      expect(item.id).toBe(i + 1);
    });
  });

  it("큰 크기(64 KiB)에서도 유효한 JSON을 반환한다", () => {
    const target = 64 * 1024;
    const result = generateJson(target, "exact", SEED);
    expect(result.buffer.length).toBe(target);
    expect(() => JSON.parse(result.buffer.toString("utf-8"))).not.toThrow();
  });

  it("목표 크기가 기본 JSON 골격보다 작을 때 at_least로 반환한다", () => {
    // 기본 골격은 수십 바이트이므로 16바이트는 골격보다 작다
    const result = generateJson(16, "exact", SEED);
    expect(result.modeApplied).toBe("at_least");
    expect(() => JSON.parse(result.buffer.toString("utf-8"))).not.toThrow();
  });

  it("seed에 JSON 특수 문자가 포함되어도 유효한 JSON을 반환한다", () => {
    const specialSeed = 'test"seed\\with/special';
    const result = generateJson(1024, "exact", specialSeed);
    expect(() => JSON.parse(result.buffer.toString("utf-8"))).not.toThrow();
    const parsed = JSON.parse(result.buffer.toString("utf-8"));
    expect(parsed.seed).toBe(specialSeed);
  });
});

// ─── BIN ────────────────────────────────────────────────────────────────────

describe("generateBin", () => {
  it("exact 모드에서 지정 크기를 정확히 맞춘다", () => {
    const result = generateBin(1024, "exact", SEED);
    expect(result.buffer.length).toBe(1024);
    expect(result.modeApplied).toBe("exact");
  });

  it("at_least 모드에서 목표 크기와 동일한 크기를 반환한다", () => {
    const result = generateBin(1024, "at_least", SEED);
    expect(result.buffer.length).toBe(1024);
  });

  it("같은 시드는 같은 결과를 생성한다 (결정론적)", () => {
    const r1 = generateBin(64, "exact", SEED);
    const r2 = generateBin(64, "exact", SEED);
    expect(r1.buffer.equals(r2.buffer)).toBe(true);
  });

  it("다른 시드는 다른 결과를 생성한다", () => {
    const r1 = generateBin(64, "exact", "seed-a");
    const r2 = generateBin(64, "exact", "seed-b");
    expect(r1.buffer.equals(r2.buffer)).toBe(false);
  });

  it("큰 크기(64 KiB)에서도 정확한 크기를 맞춘다", () => {
    const result = generateBin(64 * 1024, "exact", SEED);
    expect(result.buffer.length).toBe(64 * 1024);
  });
});
