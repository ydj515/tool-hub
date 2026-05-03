"use client";

import { useEffect, useState } from "react";
import { parseConfigFile } from "@/lib/parser";
import type { ConfigFormat } from "@/lib/types";

export function useDebouncedParser(
  content: string,
  filename: string,
  format: ConfigFormat,
  delay = 400,
): string {
  const [parseError, setParseError] = useState("");

  useEffect(() => {
    if (!content.trim()) {
      setParseError("");
      return;
    }
    const id = setTimeout(() => {
      try {
        const parsed = parseConfigFile(content, filename, format);
        setParseError(
          parsed.parseErrors.length > 0
            ? `Line ${parsed.parseErrors[0].line}: ${parsed.parseErrors[0].message}`
            : "",
        );
      } catch {
        setParseError("파싱 오류: 포맷을 확인하세요.");
      }
    }, delay);
    return () => clearTimeout(id);
  }, [content, filename, format, delay]);

  return parseError;
}
