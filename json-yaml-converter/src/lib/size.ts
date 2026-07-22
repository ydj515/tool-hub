export const SIZE_WARNING_BYTES = 500 * 1024;
export const SIZE_LIMIT_BYTES = 1024 * 1024;

export type SizeLevel = 'normal' | 'warning' | 'oversized';

const encoder = new TextEncoder();

export function utf8ByteLength(source: string): number {
  return encoder.encode(source).byteLength;
}

export function classifySize(bytes: number): SizeLevel {
  if (bytes > SIZE_LIMIT_BYTES) return 'oversized';
  if (bytes >= SIZE_WARNING_BYTES) return 'warning';
  return 'normal';
}
