import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it, beforeAll, afterAll } from "vitest";

const require = createRequire(import.meta.url);
const { ImageFileHistory } = require("./ipc-utils");

let tmpDir;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ipc-utils-test-"));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeFile(name, content = "v0") {
  const p = path.join(tmpDir, name);
  fs.writeFileSync(p, content, "utf8");
  return p;
}

function readFile(p) {
  return fs.readFileSync(p, "utf8");
}

describe("ImageFileHistory.snapshot", () => {
  it("존재하지 않는 파일 → error 반환", () => {
    const h = new ImageFileHistory();
    const result = h.snapshot(path.join(tmpDir, "ghost.png"));
    expect(result).toHaveProperty("error");
  });

  it("snapshot 후 undoDepth가 1이 된다", () => {
    const h = new ImageFileHistory();
    const fp = writeFile("snap1.txt");
    h.snapshot(fp);
    expect(h.undoDepth(fp)).toBe(1);
  });

  it("snapshot 호출 시 redo 스택이 초기화된다", () => {
    const h = new ImageFileHistory();
    const fp = writeFile("snap2.txt", "v0");
    // 인위적으로 redo 스택에 항목 추가
    h._redo.set(fp, [Buffer.from("stale")]);
    h.snapshot(fp);
    expect(h.redoDepth(fp)).toBe(0);
  });

  it("snapshot을 두 번 호출하면 undoDepth가 2", () => {
    const h = new ImageFileHistory();
    const fp = writeFile("snap3.txt", "v0");
    h.snapshot(fp);
    fs.writeFileSync(fp, "v1");
    h.snapshot(fp);
    expect(h.undoDepth(fp)).toBe(2);
  });
});

describe("ImageFileHistory.undo", () => {
  it("undo 스택이 비어 있으면 ok: false", () => {
    const h = new ImageFileHistory();
    const fp = writeFile("undo1.txt");
    const result = h.undo(fp);
    expect(result.ok).toBe(false);
  });

  it("undo 후 파일 내용이 이전 버전으로 복원된다", () => {
    const h = new ImageFileHistory();
    const fp = writeFile("undo2.txt", "v0");
    h.snapshot(fp);           // v0 스냅샷
    fs.writeFileSync(fp, "v1");
    h.undo(fp);
    expect(readFile(fp)).toBe("v0");
  });

  it("undo 후 redoDepth가 1 증가한다", () => {
    const h = new ImageFileHistory();
    const fp = writeFile("undo3.txt", "v0");
    h.snapshot(fp);
    fs.writeFileSync(fp, "v1");
    h.undo(fp);
    expect(h.redoDepth(fp)).toBe(1);
  });

  it("undo 후 undoDepth가 1 감소한다", () => {
    const h = new ImageFileHistory();
    const fp = writeFile("undo4.txt", "v0");
    h.snapshot(fp);
    fs.writeFileSync(fp, "v1");
    expect(h.undoDepth(fp)).toBe(1);
    h.undo(fp);
    expect(h.undoDepth(fp)).toBe(0);
  });
});

describe("ImageFileHistory.redo", () => {
  it("redo 스택이 비어 있으면 ok: false", () => {
    const h = new ImageFileHistory();
    const fp = writeFile("redo1.txt");
    expect(h.redo(fp).ok).toBe(false);
  });

  it("undo 후 redo하면 파일이 v1로 복구된다", () => {
    const h = new ImageFileHistory();
    const fp = writeFile("redo2.txt", "v0");
    h.snapshot(fp);
    fs.writeFileSync(fp, "v1");
    h.undo(fp);               // → v0
    h.redo(fp);               // → v1
    expect(readFile(fp)).toBe("v1");
  });

  it("redo 후 undoDepth가 1 증가한다", () => {
    const h = new ImageFileHistory();
    const fp = writeFile("redo3.txt", "v0");
    h.snapshot(fp);
    fs.writeFileSync(fp, "v1");
    h.undo(fp);
    expect(h.undoDepth(fp)).toBe(0);
    h.redo(fp);
    expect(h.undoDepth(fp)).toBe(1);
  });
});

describe("ImageFileHistory.clear", () => {
  it("clear 후 undo/redo 스택이 모두 비워진다", () => {
    const h = new ImageFileHistory();
    const fp = writeFile("clear1.txt", "v0");
    h.snapshot(fp);
    fs.writeFileSync(fp, "v1");
    h.undo(fp); // redo에 항목 추가
    expect(h.undoDepth(fp) + h.redoDepth(fp)).toBeGreaterThan(0);
    h.clear(fp);
    expect(h.undoDepth(fp)).toBe(0);
    expect(h.redoDepth(fp)).toBe(0);
  });

  it("clear는 ok: true를 반환한다", () => {
    const h = new ImageFileHistory();
    const fp = writeFile("clear2.txt");
    expect(h.clear(fp)).toEqual({ ok: true });
  });
});

describe("ImageFileHistory — 다중 파일 독립성", () => {
  it("fileA 조작이 fileB의 스택에 영향을 주지 않는다", () => {
    const h = new ImageFileHistory();
    const fpA = writeFile("multi-a.txt", "a0");
    const fpB = writeFile("multi-b.txt", "b0");
    h.snapshot(fpA);
    h.snapshot(fpA);
    h.snapshot(fpB);
    expect(h.undoDepth(fpA)).toBe(2);
    expect(h.undoDepth(fpB)).toBe(1);
    h.clear(fpA);
    expect(h.undoDepth(fpA)).toBe(0);
    expect(h.undoDepth(fpB)).toBe(1);
  });
});
