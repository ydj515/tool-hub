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

export function timestampFileName(type: FileType, targetBytes: number): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `dummy_${type}_${targetBytes}_${stamp}.${type}`;
}
