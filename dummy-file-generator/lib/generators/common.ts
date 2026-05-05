/**
 * 생성기에서 공유하는 MIME 타입, 결과 타입, 파일명 규칙을 정의한다.
 */
import { FileType, GenerateMode } from "@/lib/types";

export const MIME_BY_TYPE: Record<FileType, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
  txt: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  json: "application/json",
  bin: "application/octet-stream"
};

export type GeneratorResult = {
  buffer: Buffer;
  modeApplied: GenerateMode;
  fallbackReason?: string;
};

/**
 * 파일 타입과 목표 크기를 포함한 다운로드 파일명을 생성한다.
 */
export function timestampFileName(type: FileType, targetBytes: number): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `dummy_${type}_${targetBytes}_${stamp}.${type}`;
}
