/**
 * 입력 중인 설정 파일을 지연 파싱해 첫 번째 오류 메시지를 계산하는 훅이다.
 */
"use client";

import { useEffect, useState } from "react";
import { parseConfigFile } from "@/lib/parser";
import type { ConfigFormat, ParseError } from "@/lib/types";

/** 첫 번째 파서 오류의 위치와 parser-specific 이유를 사용자 메시지로 보존한다. */
export function formatFirstParseError(parseErrors: readonly ParseError[]): string {
  const firstError = parseErrors[0];
  return firstError ? `${firstError.line}행: ${firstError.message}` : "";
}

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
    const id = setTimeout(() => {
      if (!content.trim()) {
        return;
      }
      try {
        const parsed = parseConfigFile(content, filename, format);
        setParseError(formatFirstParseError(parsed.parseErrors));
      } catch {
        setParseError("파싱 오류: 포맷을 확인하세요.");
      }
    }, delay);
    return () => clearTimeout(id);
  }, [content, filename, format, delay]);

  return content.trim() ? parseError : "";
}
