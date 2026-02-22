import { SizeUnit } from "@/lib/types";

export function toBytes(size: number, unit: SizeUnit): number {
  const factor = unit === "MiB" ? 1024 * 1024 : 1000 * 1000;
  return Math.floor(size * factor);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
}
