/**
 * 입력 중인 설정 파일을 지연 파싱해 첫 번째 오류 메시지를 계산하는 훅이다.
 */
"use client";

import { useEffect, useState } from "react";
import { parseConfigFile } from "@/lib/parser";
import type { ConfigFormat } from "@/lib/types";

/**
 * 입력 변경 후 일정 시간 대기한 뒤 파서를 실행해 첫 번째 오류 메시지를 반환한다.
 */
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
