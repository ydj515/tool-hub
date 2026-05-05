/**
 * 용량 입력을 내부 계산용 바이트 값과 UI 표시 문자열로 변환하는 유틸리티다.
 */
import { SizeUnit } from "@/lib/types";

/**
 * 사용자가 입력한 크기와 단위를 바이트 값으로 변환한다.
 */
export function toBytes(size: number, unit: SizeUnit): number {
  const factor = unit === "MiB" ? 1024 * 1024 : 1000 * 1000;
  return Math.floor(size * factor);
}

/**
 * 바이트 값을 사람이 읽기 쉬운 IEC 단위 문자열로 포맷한다.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
}
