import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { loadRowsFromFiles, resolveReadablePath } = require("./data-loader");

let tmpDir;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "data-loader-test-"));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("resolveReadablePath", () => {
  it("현재 작업 디렉터리에 없더라도 INIT_CWD 기준 상대 경로를 해석한다", () => {
    const fixtureDir = path.join(tmpDir, "fixtures");
    const fixturePath = path.join(fixtureDir, "sample.txt");
    fs.mkdirSync(fixtureDir, { recursive: true });
    fs.writeFileSync(fixturePath, "https://example.com\n", "utf8");

    const previousInitCwd = process.env.INIT_CWD;
    process.env.INIT_CWD = tmpDir;

    try {
      expect(resolveReadablePath("fixtures/sample.txt")).toBe(fixturePath);

      const rows = loadRowsFromFiles(["fixtures/sample.txt"], {
        columns: {
          id: "id",
          subjectKey: "subject",
          urlKey: "detailPage"
        },
        sheetName: "page-list"
      });

      expect(rows).toHaveLength(1);
      expect(rows[0].detailPage).toBe("https://example.com");
    } finally {
      if (previousInitCwd === undefined) {
        delete process.env.INIT_CWD;
      } else {
        process.env.INIT_CWD = previousInitCwd;
      }
    }
  });
});

describe("spreadsheet input compatibility", () => {
  it.each(["xlsx", "csv"])("%s 입력의 한글 제목과 URL을 유지한다", (extension) => {
    const xlsx = require("xlsx");
    const fixturePath = path.join(tmpDir, `capture-input.${extension}`);
    const expected = [{ id: "capture-1", subject: "한글 제목", detailPage: "https://example.com/page?q=1" }];
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(expected), "page-list");
    xlsx.writeFile(workbook, fixturePath);

    const rows = loadRowsFromFiles([fixturePath], {
      columns: { id: "id", subjectKey: "subject", urlKey: "detailPage" },
      sheetName: "page-list",
      csvEncoding: "utf8"
    });

    expect(rows).toEqual(expected);
  });
});
