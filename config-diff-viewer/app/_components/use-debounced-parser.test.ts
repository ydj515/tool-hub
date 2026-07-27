import { describe, expect, it } from "vitest";

import { parseConfigFile } from "@/lib/parser";
import type { ConfigFormat } from "@/lib/types";
import { formatFirstParseError } from "./use-debounced-parser";

interface DiagnosticCase {
  name: string;
  content: string;
  filename: string;
  format: ConfigFormat;
  expected: string;
}

const CASES: DiagnosticCase[] = [
  {
    name: "크기 제한을 넘은 YAML",
    content: "a".repeat(500_001),
    filename: "oversized.yml",
    format: "yaml",
    expected: "1행: YAML 콘텐츠가 너무 큽니다 (최대 500 KB).",
  },
  {
    name: "alias 제한을 넘은 YAML",
    content: "*alias\n".repeat(101),
    filename: "aliases.yml",
    format: "yaml",
    expected: "1행: YAML alias 수가 너무 많습니다 (최대 100개).",
  },
  {
    name: "객체가 아닌 YAML 루트",
    content: "- first\n- second",
    filename: "array-root.yml",
    format: "yaml",
    expected: "1행: YAML 루트가 객체가 아닙니다.",
  },
  {
    name: "구분자가 없는 properties 항목",
    content: "missing-delimiter",
    filename: "application.properties",
    format: "properties",
    expected: "1행: 구분자가 없습니다: missing-delimiter",
  },
];

describe("디바운스 파서 진단 포맷", () => {
  it.each(CASES)("$name의 parser-specific 이유를 보존한다", ({ content, filename, format, expected }) => {
    const parsed = parseConfigFile(content, filename, format);

    expect(formatFirstParseError(parsed.parseErrors)).toBe(expected);
  });
});
